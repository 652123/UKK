/*
 * ========================================
 * KONEKTOR SUPABASE - HOME PAGE (MAIN.JS)
 * ========================================
 */

// 1. KONFIGURASI SUPABASE (SAYA SUDAH PERBAIKI URL-NYA)
const SUPABASE_URL = 'https://vatlrekidlsxtvxoaegn.supabase.co'; // 👈 URL WAJIB LENGKAP
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdGxyZWtpZGxzeHR2eG9hZWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyODc3NTIsImV4cCI6MjA3Njg2Mzc1Mn0.4ZrBuQDO-dspKY72lquNuGn5BisUChJwBxtKPD0aKE0';

// Cek apakah library Supabase sudah dimuat di HTML
if (!window.supabase) {
    console.error('Library Supabase belum dimuat! Pastikan script CDN ada di <head>.');
} else {
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// 2. FUNGSI LOAD PRODUK
async function loadProducts() {
    const productContainer = document.getElementById('product-list'); // Pastikan di index.html ada div id="product-list"
    
    if (!productContainer) return; // Stop jika tidak di halaman home

    productContainer.innerHTML = '<p class="text-center col-span-full py-10">Memuat produk...</p>';

    try {
        // Ambil data dari tabel 'products'
        let { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Kosongkan container
        productContainer.innerHTML = '';

        if (!products || products.length === 0) {
            productContainer.innerHTML = '<p class="text-center col-span-full text-gray-500">Belum ada produk.</p>';
            return;
        }

        // Loop dan Render Kartu Produk
        products.forEach(product => {
            const imgUrl = getImageUrl(product.image_url);
            
            // HTML KARTU PRODUK
            const productCardHTML = `
                <div class="group relative bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-lg transition duration-300">
                    <a href="product-detail.html?id=${product.id}" class="block">
                        
                        <div class="aspect-square w-full overflow-hidden rounded-xl bg-gray-100 relative mb-4">
                            <img src="${imgUrl}" alt="${product.name}" class="h-full w-full object-cover object-center group-hover:scale-105 transition duration-500">
                            ${product.stock < 5 ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">Stok Menipis</span>' : ''}
                        </div>

                        <h3 class="text-gray-900 font-bold text-lg truncate">${product.name}</h3>
                        <div class="flex justify-between items-center mt-2">
                            <p class="text-gray-900 font-bold">Rp${product.price.toLocaleString('id-ID')}</p>
                            <p class="text-xs text-gray-500">${product.stock} Tersedia</p>
                        </div>
                    </a>
                </div>
            `;
            
            // Masukkan ke HTML
            productContainer.insertAdjacentHTML('beforeend', productCardHTML);
        });

    } catch (err) {
        console.error("Gagal load produk:", err);
        productContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Gagal memuat produk: ${err.message}</p>`;
    }
}

// 3. HELPER: URL GAMBAR
function getImageUrl(path) {
    if (!path) return 'https://via.placeholder.com/400';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
}

// 4. JALANKAN SAAT WEB DIBUKA
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});