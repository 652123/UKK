/*
 * ========================================
 * CHECKOUT JS - VERSI STABIL (MANUAL FETCH)
 * ========================================
 */

// 1. CONFIG
// Mengambil client dari config.js (window.db)
const client = window.db;

if (!client) {
    console.error("Supabase client belum siap. Pastikan config.js dimuat sebelum checkout.js");
    Swal.fire({
        icon: 'error',
        title: 'Konfigurasi Error',
        text: 'Gagal memuat koneksi database.'
    });
}

// Elemen HTML
const summaryItemsContainer = document.getElementById('summary-items-container');
const subtotalElement = document.getElementById('subtotal');
const shippingCostElement = document.getElementById('shipping-cost');
const totalPriceElement = document.getElementById('total-price');
const placeOrderButton = document.getElementById('place-order-button');

// Variabel Data
let currentUserId = null;
let cartItems = []; // Menyimpan data lengkap (cart + product info)
let itemsSubtotal = 0;
let currentShippingCost = 0; // Default 0 until province selected
let selectedCourier = 'JNE';

// --- INIT ---
// --- INIT ---
async function initCheckout() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        Swal.fire({
            icon: 'warning',
            title: 'Sesi Habis',
            text: 'Silakan login kembali untuk melanjutkan.',
            confirmButtonColor: '#111827'
        }).then(() => {
            window.location.href = 'index.html?login=true';
        });
        return;
    }
    currentUserId = session.user.id;
    // console.log("User ID:", currentUserId);

    // Load Data
    await loadCartManual();

    // Autofill Data (Sync with Profile)
    await autofillShippingData();

    // Listener Radio Button Kurir
    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedCourier = e.target.value;
            // Recalculate based on City + Courier logic
            updateShippingEstimate();
        });
    });

    // Smart Back Navigation
    const params = new URLSearchParams(window.location.search);
    const fromProductId = params.get('from_product');
    if (fromProductId) {
        const backBtn = document.getElementById('back-button');
        if (backBtn) {
            backBtn.href = `product-detail.html?id=${fromProductId}`;
            backBtn.innerHTML = `<i class="fas fa-chevron-left mr-2"></i> Kembali ke Produk`;
        }
    }
}

// --- FUNGSI AUTOFILL ---
async function autofillShippingData() {
    try {
        const { data: profile, error } = await client
            .from('profiles')
            .select('name, phone, address, city, postal_code, province')
            .eq('id', currentUserId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.warn("Gagal load profile:", error);
            return;
        }

        if (profile) {
            if (profile.name) document.getElementById('name').value = profile.name;
            if (profile.phone) document.getElementById('phone').value = profile.phone;
            if (profile.address) document.getElementById('address').value = profile.address;
            if (profile.city) document.getElementById('city').value = profile.city;
            if (profile.postal_code) document.getElementById('postal_code').value = profile.postal_code;
            if (profile.province) {
                document.getElementById('province').value = profile.province;
                // Auto-calculate shipping if province is present
                updateShippingEstimate();
            }

            // console.log("Autofill data from profile success.");
        }
    } catch (err) {
        console.error("Autofill error:", err);
    }
}

// --- FUNGSI AMBIL DATA (DIRECT BUY vs KERANJANG) ---
async function loadCartManual() {
    try {
        summaryItemsContainer.innerHTML = '';
        itemsSubtotal = 0;
        cartItems = [];

        // 1. CEK: Apakah ini Direct Buy (Beli Sekarang)?
        const directItemJson = localStorage.getItem('direct_buy_item');

        if (directItemJson) {
            // --- MODE: DIRECT BUY ---
            // console.log("Mode: Direct Buy (Ignoring Cart)");
            const directItem = JSON.parse(directItemJson);

            // Perlu fetch ulang price/stock dari DB untuk keamanan (jangan percaya localStorage 100%)
            const { data: product, error: prodError } = await client
                .from('products')
                .select('id, name, price, stock')
                .eq('id', directItem.product_id)
                .single();

            if (prodError) throw prodError;

            const totalPerItem = product.price * directItem.quantity;
            itemsSubtotal += totalPerItem;

            cartItems.push({
                cart_id: 'direct_temp', // Dummy ID
                product_id: product.id,
                quantity: directItem.quantity,
                price: product.price,
                name: product.name,
                size: directItem.size,
                is_direct: true // Flag penting
            });

            // Render HTML
            renderCartItemHTML(product.name, directItem.size, directItem.quantity, totalPerItem);

            // HAPUS direct_buy_item agar kalau refresh/back tidak nyangkut selamanya? 
            // Opsional: Biarkan sampai sukses bayar. Kalau user cancel (tutup tab), item hilang dari "context" checkout berikutnya jika dia buka cart checkout.
            // Tapi problem: Kalau dia refresh page, direct buy hilang?
            // User experience: Refresh page HARUS tetap direct buy.
            // Kapan dihapus? Saat "Back to Cart" atau "Payment Success".

        } else {
            // --- MODE: KERANJANG DATABSE ---
            // console.log("Mode: Database Cart");

            const { data: cartData, error: cartError } = await client
                .from('cart_items')
                .select('*')
                .eq('user_id', currentUserId);

            if (cartError) throw cartError;

            if (!cartData || cartData.length === 0) {
                summaryItemsContainer.innerHTML = '<p class="text-center text-red-400 py-4 text-xs font-bold uppercase tracking-wide">Keranjang kosong.</p>';
                updateTotalDisplay();
                return;
            }

            const productIds = cartData.map(item => item.product_id);
            const { data: productsData, error: prodError } = await client
                .from('products')
                .select('id, name, price')
                .in('id', productIds);

            if (prodError) throw prodError;

            cartData.forEach(cartItem => {
                const product = productsData.find(p => p.id === cartItem.product_id);
                if (product) {
                    const totalPerItem = product.price * cartItem.quantity;
                    itemsSubtotal += totalPerItem;

                    cartItems.push({
                        cart_id: cartItem.id,
                        product_id: product.id,
                        quantity: cartItem.quantity,
                        price: product.price,
                        name: product.name,
                        size: cartItem.size,
                        is_direct: false
                    });

                    renderCartItemHTML(product.name, cartItem.size, cartItem.quantity, totalPerItem);
                }
            });
        }

        // 4. Update Angka Total
        updateTotalDisplay();
        placeOrderButton.disabled = false;

    } catch (error) {
        console.error("Gagal load cart:", error);
        summaryItemsContainer.innerHTML = `<p class="text-red-400 text-xs text-center border border-red-500/20 bg-red-500/10 p-2 rounded">Gagal memuat: ${error.message}</p>`;
    }
}

function renderCartItemHTML(name, size, qty, total) {
    summaryItemsContainer.innerHTML += `
        <div class="flex justify-between items-start text-sm border-b border-white/5 pb-3">
            <div>
                <p class="font-bold text-gray-200 line-clamp-1">${name}</p>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Size: <span class="text-white">${size}</span> | Qty: <span class="text-white">${qty}</span></p>
            </div>
            <p class="font-bold text-brand-400">Rp${total.toLocaleString('id-ID')}</p>
        </div>
    `;
}

// --- FUNGSI UPDATE TAMPILAN HARGA ---
// --- FUNGSI UPDATE TAMPILAN HARGA ---
function updateShippingEstimate() {
    // 1. Determine Base Cost (Province-based)
    const province = document.getElementById('province').value;
    let baseCost = 0;

    switch (province) {
        case '': baseCost = 0; break; // Belum pilih
        // Origin: Mojokerto
        case 'Jawa Timur': baseCost = 8000; break;
        case 'Jawa Tengah': baseCost = 12000; break;
        case 'DI Yogyakarta': baseCost = 12000; break;
        case 'Jawa Barat': baseCost = 16000; break;
        case 'DKI Jakarta': baseCost = 18000; break;
        case 'Bali': baseCost = 14000; break;
        default: baseCost = 40000; // Luar Jawa
    }

    // 2. Calculate Specific Courier Costs
    let costJNE = 0, costJNT = 0, costSiCepat = 0;

    if (baseCost > 0) {
        costJNE = baseCost; // Standard
        costJNT = baseCost + 2000; // Express Premium
        costSiCepat = baseCost - 1000; // Discount
        if (costSiCepat < 0) costSiCepat = 0;
    }

    // 3. Update UI Text (The Cards)
    const elJNE = document.getElementById('courier-price-JNE');
    const elJNT = document.getElementById('courier-price-JNT');
    const elSiCepat = document.getElementById('courier-price-SICEPAT');

    if (elJNE) elJNE.innerText = `Rp${costJNE.toLocaleString('id-ID')}`;
    if (elJNT) elJNT.innerText = `Rp${costJNT.toLocaleString('id-ID')}`;
    if (elSiCepat) elSiCepat.innerText = `Rp${costSiCepat.toLocaleString('id-ID')}`;

    // 4. Update Current Selected Cost
    const selectedRadio = document.querySelector('input[name="shipping"]:checked');
    if (selectedRadio) {
        if (selectedRadio.value === 'JNE') currentShippingCost = costJNE;
        if (selectedRadio.value === 'JNT') currentShippingCost = costJNT;
        if (selectedRadio.value === 'SICEPAT') currentShippingCost = costSiCepat;
    } else {
        // Default fall back
        currentShippingCost = costJNE;
    }

    // 5. Update Summary Total
    updateTotalDisplay();
}

function updateTotalDisplay() {
    const serviceFee = 1000;
    const grandTotal = itemsSubtotal + currentShippingCost + serviceFee;

    // Update HTML
    if (subtotalElement) subtotalElement.innerText = `Rp${itemsSubtotal.toLocaleString('id-ID')}`;
    if (shippingCostElement) shippingCostElement.innerText = `Rp${currentShippingCost.toLocaleString('id-ID')}`;
    if (totalPriceElement) totalPriceElement.innerText = `Rp${grandTotal.toLocaleString('id-ID')}`;
}

// --- HANDLE SUBMIT ORDER ---
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get Session for email
    const { data: { session } } = await client.auth.getSession();

    placeOrderButton.disabled = true;
    placeOrderButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

    const recipientName = document.getElementById('name').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const notes = document.getElementById('notes').value; // Capture Notes
    const serviceFee = 1000;
    const grandTotal = itemsSubtotal + currentShippingCost + serviceFee;

    const shippingAddress = {
        name: recipientName,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        province: document.getElementById('province').value, // Add Province
        city: document.getElementById('city').value, // Manual City
        postal_code: document.getElementById('postal_code').value,
        courier: selectedCourier,
        notes: notes // Add Notes to JSON
    };

    // --- VALIDATION CHECK ---
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.province || !shippingAddress.city || !shippingAddress.postal_code) {
        Swal.fire({
            icon: 'error',
            title: 'Isi Data Lengkap',
            text: 'Mohon lengkapi semua kolom alamat pengiriman.',
            confirmButtonColor: '#d33'
        });
        placeOrderButton.disabled = false;
        placeOrderButton.innerHTML = 'Bayar Sekarang';
        return;
    }

    // --- 0. SECURITY CHECK: REALTIME STOCK VALIDATION ---
    // Prevent Race Condition / Overselling
    try {
        const productIds = cartItems.map(i => i.product_id);
        const { data: freshProducts, error: stockError } = await client
            .from('products')
            .select('id, name, stock')
            .in('id', productIds);

        if (stockError) throw stockError;

        // Check each item
        for (const item of cartItems) {
            const freshProd = freshProducts.find(p => p.id === item.product_id);
            if (!freshProd) throw new Error(`Produk '${item.name}' tidak lagi tersedia.`);

            if (freshProd.stock < item.quantity) {
                throw new Error(`Stok '${item.name}' tidak mencukupi (Tersisa: ${freshProd.stock}, Diminta: ${item.quantity}). Mohon update keranjang.`);
            }
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Stok Tidak Cukup',
            text: err.message,
            confirmButtonColor: '#d33'
        });
        placeOrderButton.disabled = false;
        placeOrderButton.innerHTML = 'Bayar Sekarang';
        return; // STOP CHECKOUT
    }

    try {
        // 1. Buat Order Baru (Status Awal: Menunggu Pembayaran)
        // Kita gunakan UUID atau Text. Supabase generate ID biasanya, tapi Midtrans butuh ID yang unik.
        // Kita biarkan Supabase generate ID, lalu kita update order dengan ID tersebut jika perlu, 
        // tapi Midtrans butuh ID ORDER saat request TOKEN.
        // Jadi urutannya: Insert -> Dapat ID -> Request Token -> Update Order (opsional simpan token) -> Snap Pay

        const { data: order, error: orderError } = await client
            .from('orders')
            .insert({
                user_id: currentUserId,
                total_amount: grandTotal,
                shipping_cost: currentShippingCost,
                status: 'menunggu_pembayaran',
                shipping_address: JSON.stringify(shippingAddress) // Simpan sebagai JSON string agar aman
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Masukkan Detail Produk
        const orderDetails = cartItems.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            size: item.size, // Save size info
            quantity: item.quantity,
            price_at_purchase: item.price
        }));

        const { error: detailError } = await client.from('order_details').insert(orderDetails);
        if (detailError) throw detailError;

        // 3. Request Token ke Backend Midtrans
        // (Since we might be reusing IDs if DB was reset)
        const midtransOrderId = `${order.id}-${Date.now()}`;

        // Simpan ke localStorage untuk kebutuhan cek status di halaman success
        localStorage.setItem('last_midtrans_id', midtransOrderId);

        // Gunakan API_BASE_URL dari config.js
        const apiUrl = (window.API_BASE_URL || 'http://localhost:3000') + '/api/payment';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: midtransOrderId, // Send unique ID
                gross_amount: grandTotal,
                customer_details: {
                    first_name: shippingAddress.name,
                    email: session ? session.user.email : 'customer@example.com',
                    phone: shippingAddress.phone,
                    billing_address: shippingAddress,
                    shipping_address: shippingAddress
                }
            })
        });

        const paymentData = await response.json();

        if (!response.ok || !paymentData.token) {
            console.error("Backend Error:", paymentData);
            throw new Error(paymentData.error || 'Gagal mendapatkan token pembayaran.');
        }

        const snapToken = paymentData.token;
        // Swal.close(); // Hapus notifikasi

        // SNAP POPUP MODE
        if (window.snap) {
            window.snap.pay(snapToken, {
                onSuccess: function (result) {
                    console.log("Payment Success:", result);

                    // UX Optimize: Force Backend Sync NOW before redirecting.
                    // This ensures DB status is 'dikemas' when user lands on success page.
                    // alert("Pembayaran Berhasil! Memproses tiket..."); // Optional Feedback

                    fetch(`http://localhost:3000/api/payment/${midtransOrderId}`)
                        .then(() => {
                            // Cek apakah ini Direct Buy?
                            const isDirectBuy = cartItems.length > 0 && cartItems[0].is_direct;

                            if (isDirectBuy) {
                                // JANGAN hapus DB Cart, cukup hapus localStorage
                                localStorage.removeItem('direct_buy_item');
                                return Promise.resolve();
                            } else {
                                // Order Biasa (Keranjang) -> Kosongkan Cart di DB
                                return client.from('cart_items').delete().eq('user_id', currentUserId);
                            }
                        })
                        .then(() => {
                            console.log("Redirecting to success page with ID:", order.id);
                            window.location.href = `order-success.html?id=${order.id}`;
                        })
                        .catch(err => {
                            console.error("Sync error but payment success:", err);
                            // Fallback redirect
                            window.location.href = `order-success.html?id=${order.id}`;
                        });
                },
                onPending: function (result) {
                    console.log("Payment Pending:", result);
                    window.location.href = `order-success.html?id=${order.id}`;
                },
                onError: function (result) {
                    console.error("Payment Error:", result);
                    placeOrderButton.disabled = false;
                    placeOrderButton.innerText = 'Bayar Sekarang';
                },
                onClose: async function () {
                    console.log('Customer closed the popup without finishing the payment');

                    // Sesuai request: "Seolah tidak terjadi apa-apa, pesanan tidak masuk"
                    // Maka kita hapus order yang statusnya masih 'pending' (menunggu_pembayaran) ini dari database.
                    try {
                        const { error: deleteError } = await client
                            .from('orders')
                            .delete()
                            .eq('id', order.id);

                        if (deleteError) throw deleteError;

                        console.log("Order deleted due to cancellation.");

                    } catch (err) {
                        console.error("Gagal menghapus order:", err.message);
                    }

                    // Reset Tombol agar bisa coba lagi
                    placeOrderButton.disabled = false;
                    placeOrderButton.innerHTML = 'Bayar Sekarang';
                }
            });
        } else {
            console.error("Snap JS not loaded!");
            // Fallback to redirect if Snap is missing (though it shouldn't be)
            if (paymentData.redirect_url) {
                window.location.href = paymentData.redirect_url;
            }
        }

    } catch (error) {
        console.error(error);
        // Minimal error logging, remove flashy alerts if requested
        // Swal.fire(...) -> Removed or replaced with simple log/alert if really needed
        alert("Gagal memproses pesanan: " + error.message);

        placeOrderButton.disabled = false;
        placeOrderButton.innerText = 'Bayar Sekarang';
    }
});

// Jalankan saat load
document.addEventListener('DOMContentLoaded', initCheckout);