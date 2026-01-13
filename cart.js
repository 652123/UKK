// 1. CONFIG SUPABASE (PASTIKAN URL INI BENAR)
const SUPABASE_URL = 'https://vatlrekidlsxtvxoaegn.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdGxyZWtpZGxzeHR2eG9hZWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyODc3NTIsImV4cCI6MjA3Njg2Mzc1Mn0.4ZrBuQDO-dspKY72lquNuGn5BisUChJwBxtKPD0aKE0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserId = null;

// 2. INIT
async function initCart() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html'; // Redirect kalau belum login
        return;
    }
    currentUserId = session.user.id;
    loadCartItems();
}

// 3. LOAD DATA KERANJANG
async function loadCartItems() {
    const container = document.getElementById('cart-items-container');
    const loading = document.getElementById('cart-loading');

    try {
        // Ambil data keranjang user ini
        const { data: cartData, error } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Ambil data detail produk (name, price, image)
        const productIds = cartData.map(item => item.product_id);
        const { data: products } = await supabase
            .from('products')
            .select('id, name, price, image_url, stock')
            .in('id', productIds);

        loading.style.display = 'none';
        container.innerHTML = '';

        if (cartData.length === 0) {
            container.innerHTML = `
                <div class="bg-white p-12 text-center rounded shadow-sm">
                    <div class="text-6xl mb-4">🛒</div>
                    <p class="text-gray-500 text-lg">Keranjang belanja Anda kosong.</p>
                    <a href="index.html" class="inline-block mt-4 bg-brand text-white px-6 py-2 rounded hover:bg-red-700">Belanja Sekarang</a>
                </div>`;
            updateTotalSummary([]);
            return;
        }

        // Render Item
        let grandTotal = 0;
        let totalItems = 0;

        cartData.forEach(item => {
            const product = products.find(p => p.id === item.product_id);
            if (!product) return;

            const itemTotal = product.price * item.quantity;
            grandTotal += itemTotal;
            totalItems += item.quantity;
            const imgUrl = getImageUrl(product.image_url);

            // HTML ITEM (STYLE SHOPEE)
            const html = `
            <div class="bg-white p-4 rounded shadow-sm border border-gray-100 flex flex-col md:grid md:grid-cols-12 gap-4 items-center group">
                
                <div class="flex items-start gap-3 w-full md:col-span-6">
                    <input type="checkbox" checked class="mt-1 w-4 h-4 accent-brand cursor-pointer">
                    <a href="product-detail.html?id=${product.id}" class="block w-20 h-20 flex-shrink-0 border border-gray-200 rounded overflow-hidden">
                        <img src="${imgUrl}" class="w-full h-full object-cover" alt="${product.name}">
                    </a>
                    <div class="flex-1 min-w-0">
                        <a href="product-detail.html?id=${product.id}" class="text-sm font-medium text-gray-900 line-clamp-2 hover:text-brand transition mb-1">
                            ${product.name}
                        </a>
                        <div class="flex items-center text-xs text-gray-500 border border-gray-200 w-fit px-2 py-1 rounded cursor-pointer hover:border-gray-400">
                            Variasi: ${item.size} <i class="fas fa-chevron-down ml-1 text-[10px]"></i>
                        </div>
                        <p class="md:hidden font-bold text-brand mt-2">Rp${product.price.toLocaleString('id-ID')}</p>
                    </div>
                </div>

                <div class="hidden md:block col-span-2 text-center text-gray-600 text-sm">
                    Rp${product.price.toLocaleString('id-ID')}
                </div>

                <div class="flex items-center justify-center col-span-2">
                    <div class="flex items-center border border-gray-300 rounded overflow-hidden h-8">
                        <button onclick="updateQty(${item.id}, ${item.quantity - 1})" class="px-3 hover:bg-gray-100 text-gray-600 h-full border-r border-gray-300">-</button>
                        <input type="number" value="${item.quantity}" class="w-12 text-center text-sm focus:outline-none border-none h-full" readonly>
                        <button onclick="updateQty(${item.id}, ${item.quantity + 1})" class="px-3 hover:bg-gray-100 text-gray-600 h-full border-l border-gray-300">+</button>
                    </div>
                </div>

                <div class="hidden md:block col-span-1 text-center font-bold text-brand text-sm">
                    Rp${itemTotal.toLocaleString('id-ID')}
                </div>

                <div class="col-span-1 text-right w-full md:w-auto">
                    <button onclick="deleteItem(${item.id})" class="text-gray-400 hover:text-brand transition p-2">
                        <i class="fas fa-trash-alt"></i> <span class="md:hidden text-sm ml-1">Hapus</span>
                    </button>
                </div>

            </div>`;
            
            container.insertAdjacentHTML('beforeend', html);
        });

        updateTotalSummary(grandTotal, totalItems);

    } catch (err) {
        console.error(err);
        loading.innerHTML = '<p class="text-red-500">Gagal memuat keranjang.</p>';
    }
}

// 4. UPDATE KUANTITAS
async function updateQty(itemId, newQty) {
    if (newQty < 1) return; // Minimal 1
    // Bisa tambah validasi stok max di sini kalau mau

    try {
        await supabase.from('cart_items').update({ quantity: newQty }).eq('id', itemId);
        loadCartItems(); // Reload UI
    } catch (err) {
        console.error("Gagal update qty:", err);
    }
}

// 5. HAPUS ITEM
async function deleteItem(itemId) {
    if(!confirm("Hapus produk ini dari keranjang?")) return;
    
    try {
        await supabase.from('cart_items').delete().eq('id', itemId);
        loadCartItems();
    } catch (err) {
        console.error("Gagal hapus:", err);
    }
}

// 6. UPDATE TOTAL BAWAH
function updateTotalSummary(totalPrice, count) {
    const totalElem = document.getElementById('total-price');
    const countElem = document.getElementById('total-items-count');
    
    if(totalElem) totalElem.innerText = `Rp${(totalPrice || 0).toLocaleString('id-ID')}`;
    if(countElem) countElem.innerText = count || 0;
}

// 7. HELPER GAMBAR
function getImageUrl(path) {
    if (!path) return 'https://via.placeholder.com/100';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
}

// START
document.addEventListener('DOMContentLoaded', initCart);