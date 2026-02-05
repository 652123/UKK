/*
 * CART.JS - Logika Keranjang Belanja
 * Menangani load item, update quantity, hapus, dan checkout
 */

const client = window.db;

// Format Rupiah
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

// --- MAIN LOGIC ---
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    loadCartItems();
});

async function checkAuth() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        window.location.href = 'index.html?login=true';
    }
}

async function loadCartItems() {
    const container = document.getElementById('cart-items-container');
    const loading = document.getElementById('cart-loading');

    // Get User
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;

    try {
        // Fetch Cart Items + Product Data
        const { data: cartItems, error } = await client
            .from('cart_items')
            .select(`
                id,
                quantity,
                size,
                product_id,
                products (
                    id,
                    name,
                    price,
                    image_url,
                    stock
                )
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        loading.classList.add('hidden');
        container.innerHTML = '';

        if (!cartItems || cartItems.length === 0) {
            container.innerHTML = `
                <div class="text-center py-20 bg-[#121212] rounded-xl border border-white/5">
                    <i class="fas fa-shopping-basket text-6xl text-gray-700 mb-6"></i>
                    <h3 class="text-xl font-bold text-white mb-2">Keranjang Kosong</h3>
                    <p class="text-gray-500 mb-6">Sepertinya Anda belum menambahkan produk apapun.</p>
                    <a href="index.html" class="inline-block bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition">
                        Mulai Belanja
                    </a>
                </div>
            `;
            calculateTotal();
            return;
        }

        // Render Items
        cartItems.forEach(item => {
            const product = item.products;
            if (!product) return; // Skip if product deleted

            // Image URL Logic
            let imgUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3C/svg%3E';
            if (product.image_url) {
                if (product.image_url.startsWith('http')) imgUrl = product.image_url;
                else {
                    const { data } = client.storage.from('product-images').getPublicUrl(product.image_url);
                    imgUrl = data.publicUrl;
                }
            }

            // Shopee-like Mobile Layout & Desktop Table Layout
            const html = `
                <div class="cart-item group bg-[#121212] border-b border-white/5 last:border-0 md:border md:rounded-xl md:mb-4 md:p-4 relative" data-id="${item.id}" data-price="${product.price}">
                    
                    <!-- Mobile View: Compact Flex Row -->
                    <div class="flex items-start gap-3 p-4 md:hidden">
                        <!-- Checkbox -->
                        <div class="self-center shrink-0">
                            <input type="checkbox" class="cart-check custom-checkbox w-5 h-5" value="${item.id}" checked onchange="calculateTotal()">
                        </div>
                        
                        <!-- Image -->
                        <a href="product-detail.html?id=${product.id}" class="shrink-0 w-20 h-20 bg-gray-800 rounded-lg overflow-hidden border border-white/5">
                            <img src="${imgUrl}" class="w-full h-full object-cover">
                        </a>

                        <!-- Content -->
                        <div class="flex-1 min-w-0 flex flex-col h-full justify-between gap-1">
                            <!-- Title & Delete Header -->
                            <div class="flex justify-between items-start gap-2">
                                <h3 class="text-xs font-medium text-gray-100 line-clamp-2 leading-relaxed">
                                    <a href="product-detail.html?id=${product.id}">${product.name}</a>
                                </h3>
                                <!-- Mobile Trash Icon -->
                                <button onclick="deleteCartItem('${item.id}')" class="text-gray-600 hover:text-red-500 -mt-1 -mr-1 p-2">
                                    <i class="fas fa-trash-alt text-xs"></i>
                                </button>
                            </div>

                            <!-- Variant Badge -->
                            <div>
                                <span class="bg-white/5 text-gray-400 text-[10px] px-1.5 py-0.5 rounded border border-white/5">Variasi: ${item.size || 'STD'}</span>
                            </div>

                            <!-- Price & Qty Row -->
                            <div class="flex justify-between items-end mt-1">
                                <p class="text-sm text-brand-400 font-bold">${formatRupiah(product.price)}</p>
                                
                                <div class="flex items-center border border-white/10 rounded overflow-hidden h-7">
                                    <button onclick="updateCartQty('${item.id}', -1, ${product.price})" class="w-7 h-full text-gray-400 hover:text-white active:bg-white/10 flex items-center justify-center border-r border-white/10"><i class="fas fa-minus text-[10px]"></i></button>
                                    <input type="text" readonly value="${item.quantity}" class="w-8 h-full text-center bg-transparent text-white text-xs font-medium border-none focus:outline-none product-qty-mobile m-0 p-0">
                                    <button onclick="updateCartQty('${item.id}', 1, ${product.price})" class="w-7 h-full text-gray-400 hover:text-white active:bg-white/10 flex items-center justify-center border-l border-white/10"><i class="fas fa-plus text-[10px]"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Desktop View (Using Grid like before) -->
                    <div class="hidden md:grid grid-cols-12 gap-4 items-center">
                        <div class="col-span-6 flex items-center gap-4">
                            <input type="checkbox" class="cart-check custom-checkbox" value="${item.id}" checked onchange="calculateTotal()">
                            <img src="${imgUrl}" class="w-16 h-16 rounded object-cover border border-white/10">
                            <div>
                                <h3 class="font-bold text-white text-sm line-clamp-1">${product.name}</h3>
                                <p class="text-xs text-gray-500">Size: ${item.size}</p>
                            </div>
                        </div>
                        <div class="col-span-2 text-center text-sm text-gray-300">
                            ${formatRupiah(product.price)}
                        </div>
                        <div class="col-span-2 flex justify-center">
                            <div class="flex items-center bg-black border border-white/10 rounded-lg overflow-hidden h-8">
                                <button onclick="updateCartQty('${item.id}', -1, ${product.price})" class="w-8 h-full text-gray-400 hover:text-white hover:bg-white/10">-</button>
                                <input type="number" readonly value="${item.quantity}" class="w-10 h-full text-center bg-transparent text-white text-sm font-bold border-none focus:outline-none product-qty-desktop">
                                <button onclick="updateCartQty('${item.id}', 1, ${product.price})" class="w-8 h-full text-gray-400 hover:text-white hover:bg-white/10">+</button>
                            </div>
                        </div>
                        <div class="col-span-1 text-center font-bold text-brand-400 text-sm item-total">
                            ${formatRupiah(product.price * item.quantity)}
                        </div>
                        <div class="col-span-1 text-center">
                            <button onclick="deleteCartItem('${item.id}')" class="text-gray-500 hover:text-red-500 p-2">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>

                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });

        calculateTotal();

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-center text-red-500 py-10">Gagal memuat keranjang.</p>`;
    }
}

// --- ACTIONS ---

window.updateCartQty = async (itemId, change, price) => {
    const itemEl = document.querySelector(`.cart-item[data-id="${itemId}"]`);

    // Select BOTH inputs (mobile & desktop)
    const inputs = itemEl.querySelectorAll('input[readonly]'); // Selects product-qty-mobile & product-qty-desktop
    const totalEl = itemEl.querySelector('.item-total');

    // Use value from the first found input as reference
    let currentQty = parseInt(inputs[0].value);
    let newQty = currentQty + change;

    if (newQty < 1) return; // Minimal 1

    // Optimistic UI: Update ALL inputs
    inputs.forEach(input => input.value = newQty);

    if (totalEl) totalEl.innerText = formatRupiah(newQty * price);
    calculateTotal();

    // Backend Update
    try {
        const { error } = await client
            .from('cart_items')
            .update({ quantity: newQty })
            .eq('id', itemId);

        if (error) throw error;
    } catch (err) {
        console.error("Update qty failed:", err);
        // Revert (Simple alert for now)
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal update quantity' });
    }
};

window.deleteCartItem = async (itemId) => {
    // Confirm
    const result = await Swal.fire({
        title: 'Hapus Item?',
        text: "Produk akan dihapus dari keranjang.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal',
        background: '#121212',
        color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
        const { error } = await client.from('cart_items').delete().eq('id', itemId);
        if (error) throw error;

        // Remove UI
        const itemEl = document.querySelector(`.cart-item[data-id="${itemId}"]`);
        if (itemEl) {
            itemEl.remove();
            calculateTotal();

            // Cek Empty
            const container = document.getElementById('cart-items-container');
            if (container.children.length === 0) {
                window.location.reload(); // Reload to show empty state
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'Dihapus',
            showConfirmButton: false,
            timer: 1000,
            background: '#121212',
            color: '#fff'
        });

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    }
};

window.toggleSelectAll = (source) => {
    const checkboxes = document.querySelectorAll('.cart-check');
    checkboxes.forEach(cb => cb.checked = source.checked);

    // Sync the other Select All checkbox (Mobile <-> Desktop)
    const mobileSelect = document.getElementById('select-all');
    const desktopSelect = document.getElementById('select-all-desktop');
    if (mobileSelect) mobileSelect.checked = source.checked;
    if (desktopSelect) desktopSelect.checked = source.checked;

    calculateTotal();
};

window.calculateTotal = () => {
    let total = 0;
    let count = 0;

    // Iterate over ITEMS, not checkboxes, to verify selection state
    // This prevents double counting because we have duplicate checkboxes for Mobile/Desktop layout
    const cartItems = document.querySelectorAll('.cart-item');

    cartItems.forEach(item => {
        // Check if ANY checkbox inside this item is checked
        // (Since we sync them, checking one is enough)
        const isChecked = item.querySelector('.cart-check:checked');

        if (isChecked) {
            const price = parseInt(item.dataset.price);

            // Get quantity from the valid input (mobile or desktop)
            const qtyInput = item.querySelector('input[readonly]');
            const qty = parseInt(qtyInput.value || 0);

            total += price * qty;
            count += qty; // Count total ITEMS (quantity), not just rows
        }
    });

    // Update UI
    const totalItemsElements = ['total-items-count', 'total-items-count-desktop'];
    const totalPriceElements = ['total-price', 'total-price-desktop'];

    totalItemsElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = count;
    });

    totalPriceElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = formatRupiah(total);
    });
};

window.proceedToCheckout = () => {
    // 1. Cek apakah ada item yang dipilih/tersedia
    const totalItems = parseInt(document.getElementById('total-items-count').innerText);
    if (totalItems === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Keranjang Kosong',
            text: 'Pilih minimal satu produk untuk checkout.',
            confirmButtonColor: '#111827'
        });
        return;
    }

    // 2. KUNCI PERBAIKAN: Hapus sisa data "Beli Sekarang" (Direct Buy)
    // Agar checkout.js mendeteksi ini sebagai pembelian dari Keranjang (Database), bukan Direct Buy.
    localStorage.removeItem('direct_buy_item');

    // 3. Redirect ke Checkout
    window.location.href = 'checkout.html';
};
