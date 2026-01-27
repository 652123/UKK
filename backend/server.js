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
    const configPath = path.join(__dirname, '../config.js');
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
app.post('/api/payment', async (req, res) => {
    const { order_id, gross_amount, customer_details } = req.body;

    try {
        const parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: Math.round(gross_amount) // Ensure integer
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
async function finalizeOrder(realOrderId) {
    // 1. Get current status to prevent double processing
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', realOrderId)
        .single();

    if (orderError) {
        console.error(`Error fetching order ${realOrderId}:`, orderError.message);
        return;
    }

    // Idempotency check: If already paid/processing, skip stock decrement
    if (['dikemas', 'dikirim', 'selesai'].includes(order.status)) {
        console.log(`Order ${realOrderId} already processed (Status: ${order.status}). Skipping stock deduction.`);
        return;
    }

    console.log(`Finalizing Order ${realOrderId}... Decrementing Stock.`);

    // 2. Fetch Order Details
    const { data: details, error: detailsError } = await supabase
        .from('order_details')
        .select('product_id, quantity')
        .eq('order_id', realOrderId);

    if (detailsError) {
        console.error("Error fetching details:", detailsError.message);
    } else if (details) {
        // 3. Decrement Stock Loop
        for (const item of details) {
            try {
                // Fetch current stock
                const { data: prod } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', item.product_id)
                    .single();

                if (prod) {
                    const newStock = Math.max(0, prod.stock - item.quantity);
                    await supabase
                        .from('products')
                        .update({ stock: newStock })
                        .eq('id', item.product_id);
                    console.log(`Stock updated for Product ${item.product_id}: ${prod.stock} -> ${newStock}`);
                }
            } catch (err) {
                console.error(`Failed to update stock for product ${item.product_id}:`, err);
            }
        }
    }

    // 4. Update Status to 'dikemas'
    const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'dikemas' })
        .eq('id', realOrderId);

    if (updateError) console.error("Error updating status:", updateError.message);
    else console.log(`Order ${realOrderId} status updated to 'dikemas'.`);
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
    } catch (error) {
        console.error("Status Check Error:", error.message);
        res.status(404).json({ error: "Transaction not found", details: error.message });
    }
});
// Conditional Listen for Local Development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

// Export the app for Vercel (Serverless)
module.exports = app;
