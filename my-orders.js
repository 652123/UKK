// orders.js
let checkedOrders = new Set(); // Prevent infinite loops by tracking checked orders

async function initOrders() {
    // 1. Cek Sesi
    const client = window.db;
    if (!client) {
        console.error("Supabase client not loaded");
        return;
    }

    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        window.location.href = 'index.html?login=true';
        return;
    }
    const currentUserId = session.user.id;

    const container = document.getElementById('orders-container');
    const loading = document.getElementById('orders-loading');
    const emptyState = document.getElementById('empty-state');

    try {
        // 2. Fetch Data
        // Select orders beserta detil item dan info produknya
        // Note: Asumsi relasi foreign key sudah benar di Supabase
        const { data: orders, error } = await client
            .from('orders')
            .select(`
                *,
                order_details (
                    *,
                    products (name, image_url)
                )
            `)
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        loading.style.display = 'none';

        if (!orders || orders.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');

        // 3. Render Orders
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            // Status Badge Color (Dark Theme)
            let statusColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            let statusText = 'Menunggu Pembayaran';

            // Override Status Logic for User UX
            // If status is 'menunggu_pembayaran' BUT we have a local record of payment attempt, force show 'Dikemas'
            const midtransId = localStorage.getItem('last_midtrans_id');
            const isRecentPayment = midtransId && midtransId.startsWith(order.id + '-');

            if (order.status === 'menunggu_pembayaran') {
                // Force UI to show Dikemas (AGGRESSIVE MODE requested by User)
                statusColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                statusText = 'Sedang Dikemas';
                order.status = 'dikemas_visual_override';
            }
            else if (order.status === 'diproses' || order.status === 'dikemas') { statusColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20'; statusText = 'Sedang Dikemas'; }
            else if (order.status === 'dikirim') { statusColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20'; statusText = 'Dalam Pengiriman'; }
            else if (order.status === 'selesai') { statusColor = 'bg-green-500/10 text-green-400 border-green-500/20'; statusText = 'Selesai'; }
            else if (order.status === 'dibatalkan') { statusColor = 'bg-red-500/10 text-red-400 border-red-500/20'; statusText = 'Dibatalkan'; }

            // Render Items HTML
            let itemsHtml = '';
            order.order_details.forEach(detail => {
                const product = detail.products;
                // Fallback image
                let imgUrl = 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 80 80\"%3E%3Crect fill=\"%23f3f4f6\" width=\"80\" height=\"80\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" fill=\"%239ca3af\" font-size=\"10\" text-anchor=\"middle\" dy=\".3em\"%3ENo Image%3C/text%3E%3C/svg%3E';
                if (product && product.image_url) {
                    if (product.image_url.startsWith('http')) imgUrl = product.image_url;
                    else {
                        const { data } = client.storage.from('product-images').getPublicUrl(product.image_url);
                        imgUrl = data.publicUrl;
                    }
                }
                const pName = product ? product.name : 'Produk dihapus';

                itemsHtml += `
                    <div class="flex items-center gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 p-2 rounded-lg transition">
                        <img src="${imgUrl}" class="w-16 h-16 object-cover rounded-lg border border-white/10 shadow-sm">
                        <div class="flex-1">
                            <p class="font-bold text-sm text-gray-200 line-clamp-1">${pName}</p>
                            <p class="text-xs text-gray-500 mt-1">${detail.quantity} x <span class="text-gray-400">Rp${detail.price_at_purchase.toLocaleString('id-ID')}</span></p>
                        </div>
                        <div class="text-sm font-bold text-white">
                            Rp${(detail.price_at_purchase * detail.quantity).toLocaleString('id-ID')}
                        </div>
                    </div>
                `;
            });

            const html = `
                <div class="bg-[#121212] rounded-2xl shadow-xl border border-white/5 overflow-hidden transition hover:border-brand-500/30">
                    <!-- Header -->
                    <div class="bg-[#0a0a0a] px-6 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/5">
                        <div class="flex items-center gap-4">
                            <div class="p-2 bg-white/5 rounded-xl border border-white/10 text-brand-400">
                                <i class="fas fa-shopping-bag"></i>
                            </div>
                            <div>
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">No. Pesanan</p>
                                <p class="text-sm font-mono font-bold text-white tracking-widest">#${String(order.id).slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>
                        <div class="flex flex-col md:items-end text-right">
                            <p class="text-xs text-gray-500 mb-1 font-medium">${date}</p>
                            <span class="px-3 py-1 rounded-lg text-xs font-bold ${statusColor} mb-2 inline-block border border-white/5 shadow-sm">
                                ${statusText}
                            </span>
                            ${(order.status === 'dikirim' || order.status === 'selesai') && order.tracking_number ? `
                                <div class="mt-1 bg-white/5 px-3 py-2 rounded-lg text-left md:text-right border border-white/10">
                                    <p class="text-[10px] uppercase text-gray-500 font-bold">Resi Pengiriman</p>
                                    <p class="text-sm font-mono font-bold text-gray-200 tracking-wider">${order.tracking_number}</p>
                                    ${order.courier ? `<p class="text-[10px] text-brand-400 uppercase font-bold mt-1">${order.courier}</p>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Items -->
                    <div class="px-6 py-4 space-y-4">
                        ${itemsHtml}
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 bg-[#0a0a0a] flex justify-between items-center border-t border-white/5">
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Total Tagihan</p>
                            <p class="text-lg font-black text-white">Rp${order.total_amount.toLocaleString('id-ID')}</p>
                        </div>
                        ${(order.status === 'menunggu_pembayaran')
                    ? `
                    <div class="flex gap-2">
                        <button onclick="checkStatusManual('${order.id}')" class="bg-white/5 text-gray-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition border border-white/10"><i class="fas fa-sync-alt"></i> Cek</button>
                        <button onclick="payOrder('${order.id}', ${order.total_amount})" class="bg-gradient-to-r from-brand-600 to-brand-accent text-white px-6 py-2 rounded-xl text-sm font-bold hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] transition border border-white/10">Bayar Sekarang</button>
                    </div>
                    `
                    : (order.status === 'dikemas_visual_override')
                        ? `<p class="text-sm font-bold text-blue-400 animate-pulse">Pesanan Sedang Diproses...</p>`
                        : `<a href="order-detail.html?id=${order.id}" class="text-brand-400 text-sm font-bold hover:text-brand-300 hover:underline transition">Lihat Detail <i class="fas fa-arrow-right ml-1"></i></a>`
                }
                    </div>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', html);

            // --- Eager Status Check (Fix for "Masih Menunggu Pembayaran") ---
            if (order.status === 'menunggu_pembayaran' && !checkedOrders.has(order.id)) {
                checkedOrders.add(order.id); // Mark as checked
                const midtransId = localStorage.getItem('last_midtrans_id');
                // Cek apakah midtransId ini milik order ini
                if (midtransId && midtransId.startsWith(order.id + '-')) {
                    console.log("Checking pending status for:", midtransId);

                    // Kita fetch sekali saja saat load, jangan reload page.
                    fetch(`http://localhost:3000/api/payment/${midtransId}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.transaction_status === 'settlement' || data.transaction_status === 'capture') {
                                console.log("Payment confirmed! Updating UI...");

                                // Cari elemen badge status dan button "Bayar Sekarang" di DOM untuk diupdate
                                // Karena kita dalam loop render, elemen baru saja ditambahkan ke container.
                                // Kita bisa cari berdasarkan content text atau struktur. 
                                // Tapi ID container `orders-container` sudah punya semua elemen.

                                // Kita cari elemen yg mengandung Order ID ini.
                                // Note: di render HTML kita pasang: "#${String(order.id).slice(0, 8).toUpperCase()}"

                                // Cara paling aman: Refresh data via re-fetch (initOrders) TAPI tanpa reload page full.
                                // ATAU, update elemen spesifik.

                                // Update UI Manual (Optimistic):
                                // 1. Ganti Badge Warna -> Blue (Sedang Dikemas)
                                // 2. Hapus Tombol Bayar

                                // Namun karena select elemen susah tanpa ID unik per card, kita reload fetch (initOrders) 
                                // TAPI kita harus hati-hati agar tidak looping fetch jika data DB belum update.

                                // Solusi: Update UI saja jika belum update.
                                // Kita perlu referensi ke elemen HTML yang baru dibuat.
                                // Sayangnya container.insertAdjacentHTML tidak me-return elemen.

                                // Workaround: Kita bisa tambahkan ID unik ke card order.
                                // Tapi karena ini fix cepat, kita reload FETCH data sekali lagi setelah 2 detik. 
                                // Jika data DB belum berubah, loop akan stop jika kita tidak reload PAGE.

                                setTimeout(() => {
                                    initOrders(); // Reload data safely (checkedOrders prevents loop)

                                    const Toast = Swal.mixin({
                                        toast: true,
                                        position: 'top-end',
                                        showConfirmButton: false,
                                        timer: 3000
                                    });
                                    Toast.fire({
                                        icon: 'success',
                                        title: 'Pembayaran Berhasil! Status diperbarui.'
                                    });
                                }, 1000);
                            }
                        })
                        .catch(e => console.error("Auto-check failed", e));
                }
            }
        });

    } catch (err) {
        console.error('Error fetching orders:', err);
        loading.innerHTML = `<p class="text-red-500">Gagal memuat pesanan.</p>`;
    }
}

// Check real status from backend (DISABLED - Using Webhook)
// async function checkPaymentStatus(orderId) { ... }

// 4. Pay Order Logic (Re-payment)
async function payOrder(orderId, amount) {
    try {
        console.log("Paying order (Resume):", orderId);

        // Generate ID unik baru untuk transaksi baru (Order ID - Timestamp)
        const midtransOrderId = `${orderId}-${Date.now()}`;

        const response = await fetch('http://localhost:3000/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: midtransOrderId,
                gross_amount: amount,
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Payment API Error:", data);
            throw new Error(data.error || 'Gagal init payment');
        }

        // Use Snap Popup if available, else redirect
        if (window.snap) {
            window.snap.pay(data.token, {
                onSuccess: function (result) {
                    // Update DB via Webhook, but we can also force reload
                    console.log("Payment success!", result);
                    window.location.reload();
                },
                onPending: function (result) {
                    console.log("Waiting for payment!", result);
                    window.location.reload();
                },
                onError: function (result) {
                    console.error("Payment failed!", result);
                    Swal.fire('Gagal', 'Pembayaran gagal.', 'error');
                }
            });
        } else if (data.redirect_url) {
            window.location.href = data.redirect_url;
        } else {
            alert("Gagal memuat link pembayaran.");
        }

    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Gagal memproses pembayaran: ' + e.message, 'error');
    }
}


// Realtime Subscription
async function initRealtimeOrders() {
    const client = window.db;
    if (!client) return;

    // Subscribe to changes for this user's orders
    // Note: RLS might handle filtering, but good to filter client side if needed or just reload
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;

    client.channel('realtime-my-orders')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${session.user.id}`
            },
            (payload) => {
                console.log('Order update:', payload);

                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });

                Toast.fire({
                    icon: 'info',
                    title: 'Status Pesanan Diperbarui!'
                });

                initOrders();
            }
        )
        .subscribe();
}

// Jalankan saat load
document.addEventListener('DOMContentLoaded', () => {
    initOrders();
    initRealtimeOrders();
});
