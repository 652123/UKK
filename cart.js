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

            const html = `
                <div class="cart-item group grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#121212] p-4 rounded-xl items-center border border-white/5 hover:border-brand-500/30 transition shadow-lg relative overflow-hidden" data-id="${item.id}" data-price="${product.price}">
                    
                    <!-- Mobile: Checkbox & Product Info -->
                    <div class="col-span-1 md:col-span-6 flex items-center gap-4">
                        <input type="checkbox" class="cart-check custom-checkbox" value="${item.id}" checked onchange="calculateTotal()">
                        
                        <a href="product-detail.html?id=${product.id}" class="block w-20 h-24 rounded-lg overflow-hidden bg-gray-800 shrink-0 border border-white/5">
                            <img src="${imgUrl}" class="w-full h-full object-cover">
                        </a>

                        <div>
                            <h3 class="font-bold text-white line-clamp-1 text-sm md:text-base group-hover:text-brand-400 transition-colors">
                                <a href="product-detail.html?id=${product.id}">${product.name}</a>
                            </h3>
                            <p class="text-xs text-gray-400 mt-1">Ukuran: <span class="font-bold text-gray-200">${item.size || '-'}</span></p>
                            <p class="text-xs text-brand-400 mt-1 md:hidden font-bold">${formatRupiah(product.price)}</p>
                        </div>
                    </div>

                    <!-- Desktop: Price -->
                    <div class="col-span-2 text-center hidden md:block">
                        <span class="font-bold text-gray-200">${formatRupiah(product.price)}</span>
                    </div>

                    <!-- Quantity -->
                    <div class="col-span-1 md:col-span-2 flex justify-center">
                        <div class="flex items-center bg-black border border-white/10 rounded-lg overflow-hidden h-9">
                            <button onclick="updateCartQty('${item.id}', -1, ${product.price})" class="w-8 h-full text-gray-400 hover:text-white hover:bg-white/10 transition">−</button>
                            <input type="text" readonly value="${item.quantity}" class="w-10 h-full text-center bg-transparent text-white text-sm font-bold border-none focus:outline-none product-qty">
                            <button onclick="updateCartQty('${item.id}', 1, ${product.price})" class="w-8 h-full text-gray-400 hover:text-white hover:bg-white/10 transition">+</button>
                        </div>
                    </div>

                    <!-- Total per Item -->
                    <div class="col-span-1 text-center hidden md:block">
                        <span class="font-bold text-brand-400 item-total">${formatRupiah(product.price * item.quantity)}</span>
                    </div>

                    <!-- Action -->
                    <div class="col-span-1 md:col-span-1 text-right md:text-center absolute top-4 right-4 md:static">
                        <button onclick="deleteCartItem('${item.id}')" class="text-gray-600 hover:text-red-500 transition p-2">
                            <i class="fas fa-trash-alt"></i>
                        </button>
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
    const input = itemEl.querySelector('.product-qty');
    const totalEl = itemEl.querySelector('.item-total');

    let newQty = parseInt(input.value) + change;
    if (newQty < 1) return; // Minimal 1

    // Optimistic UI
    input.value = newQty;
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
    calculateTotal();
};

window.calculateTotal = () => {
    let total = 0;
    let count = 0;

    const checkboxes = document.querySelectorAll('.cart-check:checked');
    checkboxes.forEach(cb => {
        const itemEl = cb.closest('.cart-item');
        const price = parseInt(itemEl.dataset.price);
        const qty = parseInt(itemEl.querySelector('.product-qty').value);

        total += price * qty;
        count += 1;
    });

    // Update UI Summary
    document.getElementById('total-items-count').innerText = count;
    document.getElementById('total-price').innerText = formatRupiah(total);
};
