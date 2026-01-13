/*
 * ========================================
 * CHECKOUT JS - VERSI STABIL (MANUAL FETCH)
 * ========================================
 */

// 1. CONFIG
const SUPABASE_URL = 'https://vatlrekidlsxtvxoaegn.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdGxyZWtpZGxzeHR2eG9hZWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyODc3NTIsImV4cCI6MjA3Njg2Mzc1Mn0.4ZrBuQDO-dspKY72lquNuGn5BisUChJwBxtKPD0aKE0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
async function initCheckout() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert("Sesi habis. Silakan login kembali.");
        window.location.href = 'login.html';
        return;
    }
    currentUserId = session.user.id;
    console.log("User ID:", currentUserId);
    
    // Load Data
    await loadCartManual();

    // Listener Radio Button Kurir
    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentShippingCost = parseInt(e.target.dataset.cost);
            selectedCourier = e.target.value;
            updateTotalDisplay();
        });
    });
}

// --- FUNGSI AMBIL DATA (CARA MANUAL YANG AMAN) ---
async function loadCartManual() {
    try {
        // 1. Ambil data keranjang dulu
        const { data: cartData, error: cartError } = await supabase
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
        
        const { data: productsData, error: prodError } = await supabase
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

    try {
        // 1. Buat Order Baru
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: currentUserId,
                total_amount: grandTotal,
                shipping_cost: currentShippingCost,
                status: 'menunggu_pembayaran',
                shipping_address: shippingAddress
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Masukkan Detail Produk
        const orderDetails = cartItems.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_purchase: item.price
        }));

        const { error: detailError } = await supabase.from('order_details').insert(orderDetails);
        if (detailError) throw detailError;

        // 3. Hapus Keranjang
        await supabase.from('cart_items').delete().eq('user_id', currentUserId);

        // 4. Sukses
        alert("Pesanan Berhasil Dibuat!");
        window.location.href = `order-success.html?id=${order.id}`;

    } catch (error) {
        console.error(error);
        alert('Gagal membuat pesanan: ' + error.message);
        placeOrderButton.disabled = false;
        placeOrderButton.innerText = 'Bayar Sekarang';
    }
});

// Jalankan saat load
document.addEventListener('DOMContentLoaded', initCheckout);