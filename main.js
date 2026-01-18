/*
 * ========================================
 * MAIN.JS - LOGIKA UTAMA & SUPABASE
 * (Produk, Auth, Modal, Keranjang)
 * ========================================
 */

// --- 1. KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'https://vatlrekidlsxtvxoaegn.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdGxyZWtpZGxzeHR2eG9hZWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyODc3NTIsImV4cCI6MjA3Njg2Mzc1Mn0.4ZrBuQDO-dspKY72lquNuGn5BisUChJwBxtKPD0aKE0';

// Cek Library & Init Client
if (!window.supabase) {
    console.error('Library Supabase belum dimuat!');
}
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// --- 2. LOGIKA AUTH MODAL (LOGIN & REGISTER) ---

// Fungsi Buka Modal (Bisa dipanggil dari HTML: onclick="openAuthModal('register')")
window.openAuthModal = function(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    if(modal) {
        modal.classList.remove('hidden');
        window.switchTab(tab);
    }
}

// Fungsi Tutup Modal
window.closeAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    const msg = document.getElementById('modal-message');
    if(modal) modal.classList.add('hidden');
    if(msg) msg.classList.add('hidden');
}

// Fungsi Ganti Tab (Masuk <-> Daftar)
window.switchTab = function(tab) {
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');
    const msg = document.getElementById('modal-message');

    if(msg) msg.classList.add('hidden'); // Sembunyikan pesan lama

    if (tab === 'login') {
        formLogin.classList.remove('hidden');
        formReg.classList.add('hidden');
        
        // Style Tab Aktif
        tabLogin.classList.add('text-gray-900', 'border-gray-900', 'font-bold');
        tabLogin.classList.remove('text-gray-500', 'border-transparent', 'font-medium');
        
        tabReg.classList.remove('text-gray-900', 'border-gray-900', 'font-bold');
        tabReg.classList.add('text-gray-500', 'border-transparent', 'font-medium');
    } else {
        formLogin.classList.add('hidden');
        formReg.classList.remove('hidden');

        // Style Tab Aktif
        tabReg.classList.add('text-gray-900', 'border-gray-900', 'font-bold');
        tabReg.classList.remove('text-gray-500', 'border-transparent', 'font-medium');

        tabLogin.classList.remove('text-gray-900', 'border-gray-900', 'font-bold');
        tabLogin.classList.add('text-gray-500', 'border-transparent', 'font-medium');
    }
}

// Fungsi Helper Menampilkan Pesan di Modal
function showModalMessage(type, text) {
    const msg = document.getElementById('modal-message');
    if(!msg) return;

    msg.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
    
    if (type === 'error') {
        msg.classList.add('bg-red-100', 'text-red-700');
    } else {
        msg.classList.add('bg-green-100', 'text-green-700');
    }
    msg.innerHTML = text;
    msg.classList.remove('hidden');
}


// --- 3. EVENT LISTENER: PROSES LOGIN & REGISTER ---
document.addEventListener('DOMContentLoaded', () => {

    // A. PROSES LOGIN
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-login-submit');
            const originalText = btn.innerText;
            
            btn.disabled = true; 
            btn.innerText = "MEMPROSES...";

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                // 1. Login ke Supabase
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                // 2. Cek Role User
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
                
                showModalMessage('success', 'Login berhasil! Mengalihkan...');
                
                setTimeout(() => {
                    const role = profile ? profile.role : 'pembeli';
                    if (role === 'bos') window.location.href = 'bos/boss_dashboard.html';
                    else if (role === 'admin') window.location.href = 'admin/dashboard.html';
                    else location.reload(); // Refresh halaman untuk user biasa
                }, 1000);

            } catch (err) {
                showModalMessage('error', 'Login gagal: ' + err.message);
                btn.disabled = false; 
                btn.innerText = originalText;
            }
        });
    }

    // B. PROSES REGISTER (DAFTAR AKUN)
    const regForm = document.getElementById('form-register');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-reg-submit');
            const originalText = btn.innerText;
            
            btn.disabled = true; 
            btn.innerText = "MENDAFTAR...";

            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            try {
                // Daftar ke Supabase
                // Data 'name' akan otomatis masuk ke tabel 'profiles' lewat Trigger SQL
                const { error } = await supabase.auth.signUp({
                    email, 
                    password,
                    options: { data: { name } } 
                });

                if (error) throw error;

                showModalMessage('success', 'Berhasil! Silakan Login.');
                regForm.reset();
                
                // Pindah ke tab Login setelah 1.5 detik
                setTimeout(() => {
                    window.switchTab('login');
                }, 1500);

            } catch (err) {
                showModalMessage('error', err.message);
            } finally {
                btn.disabled = false; 
                btn.innerText = originalText;
            }
        });
    }

    // Load produk saat halaman siap
    loadProducts();
});


// --- 4. LOGIKA LOAD PRODUK (HOMEPAGE) ---
async function loadProducts() {
    const productContainer = document.getElementById('product-list');
    if (!productContainer) return; 

    productContainer.innerHTML = '<p class="text-center col-span-full py-10">Memuat produk...</p>';

    try {
        let { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        productContainer.innerHTML = '';

        if (!products || products.length === 0) {
            productContainer.innerHTML = '<p class="text-center col-span-full text-gray-500">Belum ada produk.</p>';
            return;
        }

        products.forEach(product => {
            const imgUrl = getImageUrl(product.image_url);
            const productCardHTML = `
                <div class="bg-white shadow-lg rounded-xl overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <a href="product-detail.html?id=${product.id}" class="block">
                        <div class="relative">
                            <img src="${imgUrl}" alt="${product.name}" class="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110">
                            ${product.stock < 5 ? '<span class="absolute top-4 right-4 text-xs font-bold text-white px-3 py-1 rounded-full bg-red-500">STOK MENIPIS</span>' : ''}
                            
                            <button onclick="addToCart('${product.name}', ${product.price})" class="absolute bottom-4 left-1/2 -translate-x-1/2 w-11/12 bg-black bg-opacity-70 text-white font-semibold py-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-opacity-100">
                                <i class="fas fa-shopping-cart mr-2"></i> Tambah Keranjang
                            </button>
                        </div>
                        <div class="p-5">
                            <h3 class="text-lg font-bold text-gray-900 truncate">${product.name}</h3>
                            <p class="text-sm text-gray-500 mt-1">Stok: ${product.stock}</p>
                            <p class="text-xl font-extrabold text-gray-900 mt-3">Rp${product.price.toLocaleString('id-ID')}</p>
                        </div>
                    </a>
                </div>
            `;
            productContainer.insertAdjacentHTML('beforeend', productCardHTML);
        });

    } catch (err) {
        console.error("Gagal load produk:", err);
        productContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Gagal memuat: ${err.message}</p>`;
    }
}

// Helper URL Gambar
function getImageUrl(path) {
    if (!path) return 'https://via.placeholder.com/400';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
}


// --- 5. LOGIKA KERANJANG BELANJA (Simulasi) ---
let totalItemsInCart = 0;
window.addToCart = function(productName, price) {
    // Mencegah link default
    if (window.event) window.event.preventDefault();
    if (window.event) window.event.stopPropagation();

    // Notifikasi Sederhana
    alert(`"${productName}" berhasil ditambahkan ke keranjang!`);
    
    // Update Badge
    totalItemsInCart++; 
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.innerText = totalItemsInCart;
        cartCountElement.classList.add('transform', 'scale-125');
        setTimeout(() => cartCountElement.classList.remove('transform', 'scale-125'), 200);
    }
}