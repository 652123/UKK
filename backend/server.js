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

        // Mapping Status Midtrans ke Database
        let dbStatus = 'menunggu_pembayaran';

        if (transactionStatus == 'capture') {
            // Force 'dikemas' for all capture statuses as requested by user
            dbStatus = 'dikemas';
        } else if (transactionStatus == 'settlement') {
            dbStatus = 'dikemas'; // Sukses (Transfer/Gopay/dll)
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            dbStatus = 'dibatalkan'; // Gagal
        } else if (transactionStatus == 'pending') {
            dbStatus = 'menunggu_pembayaran';
        }

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

        if (data.length === 0) {
            console.warn("No order updated. Check Order ID.");
        } else {
            console.log("Database Updated Successfully.");
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error("Webhook Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});
// Check Transaction Status Endpoint
app.get('/api/payment/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        const statusResponse = await snap.transaction.status(orderId);
        console.log(`Status Check for ${orderId}: ${statusResponse.transaction_status}`);

        // --- EAGER UPDATE LOGIC ---
        // Jika status sudah settlement/capture tapi di DB masih pending, paksa update sekarang.
        // Ini mengatasi delay webhook.
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        let dbStatus = null;
        if (transactionStatus == 'capture') {
            dbStatus = 'dikemas';
        } else if (transactionStatus == 'settlement') {
            dbStatus = 'dikemas';
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            dbStatus = 'dibatalkan';
        } else if (transactionStatus == 'pending') {
            dbStatus = 'menunggu_pembayaran';
        }

        if (dbStatus && dbStatus !== 'menunggu_pembayaran') {
            // Logic Ekstraksi Real Order ID (Sama seperti Webhook)
            let realOrderId = orderId;
            const lastDashIndex = orderId.lastIndexOf('-');
            if (lastDashIndex !== -1) {
                const potentialTimestamp = orderId.substring(lastDashIndex + 1);
                if (/^\d+$/.test(potentialTimestamp)) {
                    realOrderId = orderId.substring(0, lastDashIndex);
                }
            }

            // Update DB
            console.log(`Eager Update: Syncing Order ${realOrderId} to ${dbStatus}`);
            await supabase.from('orders').update({ status: dbStatus }).eq('id', realOrderId);
        }
        // --- END EAGER UPDATE ---

        res.json(statusResponse);
    } catch (error) {
        // Midtrans throws error if 404
        console.error("Status Check Error:", error.message);
        res.status(404).json({ error: "Transaction not found", details: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
