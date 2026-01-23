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
let currentShippingCost = 15000; // Default JNE
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
    console.log("User ID:", currentUserId);

    // Load Data
    await loadCartManual();

    // Autofill Data (Sync with Profile)
    await autofillShippingData();

    // Listener Radio Button Kurir
    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentShippingCost = parseInt(e.target.dataset.cost);
            selectedCourier = e.target.value;
            updateTotalDisplay();
        });
    });
}

// --- FUNGSI AUTOFILL ---
async function autofillShippingData() {
    try {
        const { data: profile, error } = await client
            .from('profiles')
            .select('name, phone, address, city, postal_code')
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

            console.log("Autofill data from profile success.");
        }
    } catch (err) {
        console.error("Autofill error:", err);
    }
}

// --- FUNGSI AMBIL DATA (CARA MANUAL YANG AMAN) ---
async function loadCartManual() {
    try {
        // 1. Ambil data keranjang dulu
        const { data: cartData, error: cartError } = await client
            .from('cart_items')
            .select('*')
            .eq('user_id', currentUserId);

        if (cartError) throw cartError;

        if (!cartData || cartData.length === 0) {
            summaryItemsContainer.innerHTML = '<p class="text-center text-red-500 py-4">Keranjang kosong.</p>';
            updateTotalDisplay(); // Biar setidaknya ongkir kehitung
            return;
        }

        // 2. Ambil detail produk berdasarkan ID yang ada di keranjang
        // Kita kumpulkan semua product_id dulu
        const productIds = cartData.map(item => item.product_id);

        const { data: productsData, error: prodError } = await client
            .from('products')
            .select('id, name, price')
            .in('id', productIds);

        if (prodError) throw prodError;

        // 3. Gabungkan Data (Manual Join)
        summaryItemsContainer.innerHTML = '';
        itemsSubtotal = 0;
        cartItems = []; // Reset

        cartData.forEach(cartItem => {
            // Cari produk yang cocok
            const product = productsData.find(p => p.id === cartItem.product_id);

            if (product) {
                // Hitung total per item
                const totalPerItem = product.price * cartItem.quantity;
                itemsSubtotal += totalPerItem;

                // Simpan ke variabel global untuk proses order nanti
                cartItems.push({
                    cart_id: cartItem.id,
                    product_id: product.id,
                    quantity: cartItem.quantity,
                    price: product.price,
                    name: product.name,
                    size: cartItem.size
                });

                // Render HTML
                summaryItemsContainer.innerHTML += `
                    <div class="flex justify-between items-start text-sm border-b border-gray-100 pb-2">
                        <div>
                            <p class="font-bold text-gray-800">${product.name}</p>
                            <p class="text-xs text-gray-500">Size: ${cartItem.size} | Qty: ${cartItem.quantity}</p>
                        </div>
                        <p class="font-semibold text-gray-700">Rp${totalPerItem.toLocaleString('id-ID')}</p>
                    </div>
                `;
            }
        });

        // 4. Update Angka Total
        updateTotalDisplay();
        // Aktifkan tombol
        placeOrderButton.disabled = false;

    } catch (error) {
        console.error("Gagal load cart:", error);
        summaryItemsContainer.innerHTML = `<p class="text-red-500 text-xs">Gagal memuat: ${error.message}</p>`;
    }
}

// --- FUNGSI UPDATE TAMPILAN HARGA ---
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
    const serviceFee = 1000;
    const grandTotal = itemsSubtotal + currentShippingCost + serviceFee;

    const shippingAddress = {
        name: recipientName,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        postal_code: document.getElementById('postal_code').value,
        courier: selectedCourier
    };

    // --- VALIDATION CHECK ---
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postal_code) {
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

        const response = await fetch('http://localhost:3000/api/payment', {
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
                            // Optional: empty cart
                            return client.from('cart_items').delete().eq('user_id', currentUserId);
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
                onClose: function () {
                    console.log('Customer closed the popup without finishing the payment');
                    placeOrderButton.disabled = false;
                    placeOrderButton.innerText = 'Bayar Sekarang';
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