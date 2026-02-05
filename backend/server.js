// server.js - Backend Express Server for Dazeon Store
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fs = require('fs');

// Serve config.js dynamically with Env Vars
app.get('/config.js', (req, res) => {
    const configPath = path.join(__dirname, '../config.template.js');
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading config.js:', err);
            return res.status(500).send('Error loading configuration');
        }

        // Inject Environment Variables
        const processedConfig = data
            .replace(/'__SUPABASE_URL__'/g, `'${process.env.SUPABASE_URL || ''}'`)
            .replace(/'__SUPABASE_KEY__'/g, `'${process.env.SUPABASE_KEY || ''}'`)
            .replace(/'__MIDTRANS_CLIENT_KEY__'/g, `'${process.env.MIDTRANS_CLIENT_KEY || ''}'`)
            .replace(/'__API_BASE_URL__'/g, `'${process.env.API_BASE_URL || 'http://localhost:3000'}'`);

        res.setHeader('Content-Type', 'application/javascript');
        res.send(processedConfig);
    });
});

// Static files - serve the frontend
app.use(express.static(path.join(__dirname, '..')));

const midtransClient = require('midtrans-client');

// Midtrans Core API / Snap
// Keys from .env or fallback
const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;

// Auto-detect environment: Sandbox keys usually start with 'SB-'
// const isProduction = !serverKey.includes('SB-');
const isProduction = false;

console.log(`Midtrans Config: ${isProduction ? 'Production' : 'Sandbox'}`);
console.log(`Server Key loaded: ${serverKey ? 'Yes (Starts with ' + serverKey.substring(0, 5) + '...)' : 'No'}`);

const snap = new midtransClient.Snap({
    isProduction: isProduction,
    serverKey: serverKey,
    clientKey: clientKey
});

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Initialize Supabase Client (Backend)
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
// Prioritize Service Role Key if available to bypass RLS for backend updates
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Create Snap Transaction Endpoint
// Create Snap Transaction Endpoint
app.post('/api/payment', async (req, res) => {
    const { order_id, customer_details } = req.body;
    // SECURITY UPDATE: Ignore gross_amount from client. Calculate it here.

    try {
        // 1. Fetch Order Data (Shipping Cost is here)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, shipping_cost, total_amount')
            .eq('id', order_id.split('-')[0]) // Handle possible timestamp suffix if passed here (though usually passed as just DB ID in body, let's be safe)
            .single();

        if (orderError || !order) {
            // Fallback: If order_id came in as "ID-TIMESTAMP", try parsing it.
            // Ideally client sends just "ID" but let's robustify.
            const cleanId = order_id.split('-')[0];
            const { data: retryOrder, error: retryError } = await supabase
                .from('orders')
                .select('id, shipping_cost')
                .eq('id', cleanId)
                .single();

            if (retryError || !retryOrder) throw new Error("Order not found in database.");
            order = retryOrder;
        }

        // 2. Fetch Order Details (Products & Quantities)
        const { data: items, error: itemsError } = await supabase
            .from('order_details')
            .select('product_id, quantity')
            .eq('order_id', order.id);

        if (itemsError) throw itemsError;

        // 3. Fetch Real Product Prices
        let calculatedSubtotal = 0;
        const productIds = items.map(i => i.product_id);

        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, price')
            .in('id', productIds);

        if (prodError) throw prodError;

        // 4. Calculate Total
        for (const item of items) {
            const product = products.find(p => p.id === item.product_id);
            if (product) {
                calculatedSubtotal += product.price * item.quantity;
            }
        }

        const serviceFee = 1000;
        const finalAmount = calculatedSubtotal + (order.shipping_cost || 0) + serviceFee;

        console.log(`Verifying Price for Order ${order.id}: Calculated ${finalAmount} (Sub: ${calculatedSubtotal}, Ship: ${order.shipping_cost})`);

        // OPTIONAL: Update order total in DB if different (e.g. price changed mid-transaction)
        // await supabase.from('orders').update({ total_amount: finalAmount }).eq('id', order.id);

        const parameter = {
            transaction_details: {
                order_id: order_id, // Keep the ID sent by client (likely has timestamp suffix)
                gross_amount: Math.round(finalAmount) // VERIFIED AMOUNT
            },
            credit_card: {
                secure: true
            },
            customer_details: customer_details
        };

        const transaction = await snap.createTransaction(parameter);
        const transactionToken = transaction.token;

        console.log(`Transaction Created: ${order_id} -> Token: ${transactionToken}`);
        res.json({ token: transactionToken, redirect_url: transaction.redirect_url });

    } catch (error) {
        console.error("Midtrans Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// MIDTRANS NOTIFICATION WEBHOOK
// Endpoint ini dipanggil oleh Server Midtrans secara otomatis setelah pembayaran.
// Pastikan URL ini (misal via Ngrok) diset di Dashboard Midtrans settings.
app.post('/api/notification', async (req, res) => {
    try {
        const notification = await snap.transaction.notification(req.body);

        const orderId = notification.order_id;
        const transactionStatus = notification.transaction_status;
        const fraudStatus = notification.fraud_status;

        console.log(`Notification Received: Order: ${orderId} | Status: ${transactionStatus} | Fraud: ${fraudStatus}`);

        // Extract Real Order ID (jika format order-id-timestamp)
        // const realOrderId = orderId.split('-')[0]; // Hati-hati jika ID asli ternyata UUID

        // Tapi di database kita pakai ID Int/UUID, dan di checkout.js kita kirim: `${order.id}-${Date.now()}`
        // Jadi kita harus parsing.

        // Logic Ekstraksi Real Order ID yang Robust
        // Format dari checkout.js: "ID_ASLI-TIMESTAMP"
        // ID Asli bisa berupa Integer (misal: 15) atau UUID (misal: a0eebc99-...)

        let realOrderId = orderId;

        // Cek apakah mengandung tanda hubung yang menandakan timestamp suffix
        // Kita gunakan lastIndexOf karena UUID juga mengandung tanda hubung.
        // Asumsinya suffix timestamp selalu ada di paling belakang setelah strip terakhir.
        const lastDashIndex = orderId.lastIndexOf('-');

        if (lastDashIndex !== -1) {
            // Kita cek apakah bagian setelah dash terakhir adalah angka (timestamp)
            const potentialTimestamp = orderId.substring(lastDashIndex + 1);

            // Validasi sederhana timestamp (angka semua)
            if (/^\d+$/.test(potentialTimestamp)) {
                // Jika ya, maka ID asli adalah dari awal sampai sebelum dash terakhir
                realOrderId = orderId.substring(0, lastDashIndex);
            }
        }

        console.log(`Original Order ID: ${orderId} -> Extracted DB ID: ${realOrderId}`);

        if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
            // Sukses: Jalankan Finalize (Update Status + Kurangi Stok)
            console.log(`Transaction Success (${transactionStatus}). Finalizing order...`);
            await finalizeOrder(realOrderId);
        } else {
            // Non-Sukses: Update Status Saja
            let dbStatus = 'menunggu_pembayaran';

            if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
                dbStatus = 'dibatalkan';
            } else if (transactionStatus == 'pending') {
                dbStatus = 'menunggu_pembayaran';
            }

            console.log(`Updating Database Order ID: ${realOrderId} to Status: ${dbStatus}`);

            const { data, error } = await supabase
                .from('orders')
                .update({ status: dbStatus })
                .eq('id', realOrderId)
                .select();

            if (error) {
                console.error("Supabase Update Error:", error.message);
                throw error;
            }
            console.log("Database Updated Successfully.");
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error("Webhook Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});
// --- HELPER: Finalize Order (Update Status & Decrement Stock) ---
// --- HELPER: Finalize Order (Update Status & Decrement Stock) ---
async function finalizeOrder(realOrderId) {
    console.log(`Finalizing Order ${realOrderId}...`);

    // 1. ATOMIC LOCK
    const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ status: 'dikemas' })
        .eq('id', realOrderId)
        .eq('status', 'menunggu_pembayaran')
        .select();

    if (updateError) {
        console.error(`Error locking order ${realOrderId}:`, updateError.message);
        return;
    }

    if (!updatedOrder || updatedOrder.length === 0) {
        console.log(`Order ${realOrderId} was confirmed or processed by another request. Skipping.`);
        return;
    }

    console.log(`Order ${realOrderId} status set to 'dikemas'. Proceeding to stock reduction.`);

    // 2. Fetch Order Details (Include SIZE)
    const { data: details, error: detailsError } = await supabase
        .from('order_details')
        .select('product_id, quantity, size') // Added 'size'
        .eq('order_id', realOrderId);

    if (detailsError) {
        console.error("Error fetching details:", detailsError.message);
    } else if (details) {
        // 3. Decrement Stock Loop
        for (const item of details) {
            try {
                // Fetch current stock info
                const { data: prod } = await supabase
                    .from('products')
                    .select('stock, size_stock') // Fetch size_stock too
                    .eq('id', item.product_id)
                    .single();

                if (prod) {
                    // A. Update Total Stock
                    const newTotalStock = Math.max(0, prod.stock - item.quantity);

                    // B. Update Size Stock (if exists)
                    let newSizeStock = prod.size_stock;
                    if (newSizeStock && item.size && newSizeStock[item.size] !== undefined) {
                        const currentSizeStock = parseInt(newSizeStock[item.size]) || 0;
                        newSizeStock[item.size] = Math.max(0, currentSizeStock - item.quantity);
                        console.log(`Size Stock updated for ${item.product_id} [${item.size}]: ${currentSizeStock} -> ${newSizeStock[item.size]}`);
                    }

                    // C. Commit Updates
                    await supabase
                        .from('products')
                        .update({
                            stock: newTotalStock,
                            size_stock: newSizeStock
                        })
                        .eq('id', item.product_id);

                    console.log(`Stock updated for Product ${item.product_id}: ${prod.stock} -> ${newTotalStock}`);
                }
            } catch (err) {
                console.error(`Failed to update stock for product ${item.product_id}:`, err);
            }
        }
    }
}

// Check Transaction Status Endpoint
app.get('/api/payment/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        const statusResponse = await snap.transaction.status(orderId);
        console.log(`Status Check for ${orderId}: ${statusResponse.transaction_status}`);

        // Extract Real Order ID
        let realOrderId = orderId;
        const lastDashIndex = orderId.lastIndexOf('-');
        if (lastDashIndex !== -1) {
            const potentialTimestamp = orderId.substring(lastDashIndex + 1);
            if (/^\d+$/.test(potentialTimestamp)) {
                realOrderId = orderId.substring(0, lastDashIndex);
            }
        }

        const transactionStatus = statusResponse.transaction_status;

        if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
            // SUCCESS: Execute Finalize Logic
            await finalizeOrder(realOrderId);
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            // FAIL
            await supabase.from('orders').update({ status: 'dibatalkan' }).eq('id', realOrderId);
        }

        res.json(statusResponse);
        res.json(statusResponse);
    } catch (error) {
        // Detailed Error Logging
        console.error(`Status Check Failed for ${orderId}:`, error.message);
        if (error.ApiResponse) {
            console.error("Midtrans API Response:", JSON.stringify(error.ApiResponse));
        }
        res.status(404).json({
            error: "Transaction not found or API Error",
            details: error.message,
            tip: "Check Server Key & Environment (Sandbox/Prod)"
        });
    }
});
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🏍️💨 Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
