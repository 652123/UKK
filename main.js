/*
 * ========================================
 * MAIN.JS - LOGIKA UTAMA & SUPABASE
 * (Produk, Auth, Modal, Keranjang)
 * ========================================
 */

// --- 1. KONFIGURASI SUPABASE ---
// Inisialisasi diambil dari config.js
const client = window.db;

if (!client) {
    console.error('Supabase client belum tersedia. Pastikan config.js dimuat.');
}


// --- 2. LOGIKA AUTH MODAL (LOGIN & REGISTER) ---

// Fungsi Buka Modal (Bisa dipanggil dari HTML: onclick="openAuthModal('register')")
window.openAuthModal = function (tab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        window.switchTab(tab);
    }
}

// Fungsi Tutup Modal
window.closeAuthModal = function () {
    const modal = document.getElementById('auth-modal');
    const msg = document.getElementById('modal-message');
    if (modal) modal.classList.add('hidden');
    if (msg) msg.classList.add('hidden');
}

// Fungsi Ganti Tab (Masuk <-> Daftar)
window.switchTab = function (tab) {
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');
    const formForgot = document.getElementById('form-forgot');

    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');
    const msg = document.getElementById('modal-message');

    if (msg) msg.classList.add('hidden'); // Sembunyikan pesan lama

    // Reset visibility
    if (formLogin) formLogin.classList.add('hidden');
    if (formReg) formReg.classList.add('hidden');
    if (formForgot) formForgot.classList.add('hidden');

    // Reset styles
    if (tabLogin) {
        tabLogin.classList.remove('text-gray-900', 'border-gray-900', 'font-bold');
        tabLogin.classList.add('text-gray-500', 'border-transparent', 'font-medium');
    }
    if (tabReg) {
        tabReg.classList.remove('text-gray-900', 'border-gray-900', 'font-bold');
        tabReg.classList.add('text-gray-500', 'border-transparent', 'font-medium');
    }

    if (tab === 'login') {
        if (formLogin) formLogin.classList.remove('hidden');
        if (tabLogin) {
            tabLogin.classList.add('text-gray-900', 'border-gray-900', 'font-bold');
            tabLogin.classList.remove('text-gray-500', 'border-transparent', 'font-medium');
        }
    } else if (tab === 'register') {
        if (formReg) formReg.classList.remove('hidden');
        if (tabReg) {
            tabReg.classList.add('text-gray-900', 'border-gray-900', 'font-bold');
            tabReg.classList.remove('text-gray-500', 'border-transparent', 'font-medium');
        }
    } else if (tab === 'forgot') {
        if (formForgot) formForgot.classList.remove('hidden');
    }
}

// Fungsi Helper Menampilkan Pesan dengan SweetAlert2
function showModalMessage(type, text) {
    const swalType = type === 'error' ? 'error' : 'success';
    const title = type === 'error' ? 'Oops...' : 'Berhasil!';

    Swal.fire({
        icon: swalType,
        title: title,
        text: text,
        confirmButtonColor: '#111827', // Gray-900
        timer: type === 'success' ? 2000 : undefined,
        timerProgressBar: type === 'success',
        showConfirmButton: type === 'error' // Auto close for success
    });
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
                const { data, error } = await client.auth.signInWithPassword({ email, password });
                if (error) throw error;

                // 2. Cek Role User
                const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).single();

                await Swal.fire({
                    icon: 'success',
                    title: 'Login Berhasil!',
                    text: 'Mengalihkan ke halaman utama...',
                    timer: 1500,
                    showConfirmButton: false
                });

                const role = profile ? profile.role : 'pembeli';
                if (role === 'bos') window.location.href = 'bos/boss_dashboard.html';
                else if (role === 'admin') window.location.href = 'admin/dashboard.html';
                else location.reload(); // Refresh halaman untuk user biasa


            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Gagal',
                    text: err.message,
                    confirmButtonColor: '#111827'
                });
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
                const { error } = await client.auth.signUp({
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
        // D. PROSES LUPA PASSWORD
        const forgotForm = document.getElementById('form-forgot');
        if (forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btn-forgot-submit');
                const originalText = btn.innerText;

                btn.disabled = true; btn.innerText = "MENGIRIM...";

                const email = document.getElementById('forgot-email').value;

                try {
                    const { error } = await client.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin + '/reset-password.html',
                    });
                    if (error) throw error;

                    showModalMessage('success', 'Link reset password telah dikirim ke email Anda.');
                    forgotForm.reset();

                } catch (err) {
                    showModalMessage('error', err.message);
                } finally {
                    btn.disabled = false; btn.innerText = originalText;
                }
            });
        }
    }

    // Load produk saat halaman siap
    loadProducts(true);
});


// --- 4. LOGIKA PRODUK (FILTER, SORT, PAGINATION) ---

// Global Filter State
let currentCategory = 'ALL';
let currentSort = 'newest';
let currentPage = 0;
const PRODUCTS_PER_PAGE = 8;
let hasMoreProducts = true;
let isLoadingProducts = false;

// Fungsi Load Produk dari Supabase
async function loadProducts(reset = false) {
    const container = document.getElementById('product-list');
    const loadMoreBtn = document.getElementById('btn-load-more');
    if (!container) return;

    if (reset) {
        currentPage = 0;
        hasMoreProducts = true;
        container.innerHTML = ''; // Reset grid
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    }

    if (!hasMoreProducts || isLoadingProducts) return;
    isLoadingProducts = true;

    // Show small loader if loading more (not reset)
    if (!reset && loadMoreBtn) {
        loadMoreBtn.innerText = 'Memuat...';
        loadMoreBtn.disabled = true;
    }

    // Default loader for first load
    if (reset) {
        container.innerHTML = `
        <div class="col-span-full py-20 flex flex-col items-center justify-center">
            <i class="fas fa-circle-notch fa-spin text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 font-medium">Memuat koleksi...</p>
        </div>`;
    }

    // Cek Search Param
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');

    try {
        let query = client
            .from('products')
            .select('*')
            .gte('stock', 1);

        // A. Filter Category
        if (currentCategory !== 'ALL') {
            query = query.eq('category', currentCategory);
        }

        // B. Search
        if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`);
            const sectionTitle = document.getElementById('produk');
            if (sectionTitle) {
                sectionTitle.innerText = `Hasil Pencarian: "${searchQuery}"`;
            }
        }

        // C. Sort
        switch (currentSort) {
            case 'newest': query = query.order('created_at', { ascending: false }); break;
            case 'price_asc': query = query.order('price', { ascending: true }); break;
            case 'price_desc': query = query.order('price', { ascending: false }); break;
            case 'name_asc': query = query.order('name', { ascending: true }); break;
            default: query = query.order('created_at', { ascending: false });
        }

        // D. Pagination
        // Note: range is 0-based index
        const from = currentPage * PRODUCTS_PER_PAGE;
        const to = from + PRODUCTS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data: products, error } = await query;

        if (error) throw error;

        // Clear Loader
        if (reset) container.innerHTML = '';
        if (loadMoreBtn) {
            loadMoreBtn.innerText = 'Muat Lebih Banyak';
            loadMoreBtn.disabled = false;
        }

        if (products.length < PRODUCTS_PER_PAGE) {
            hasMoreProducts = false;
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        } else {
            if (loadMoreBtn) loadMoreBtn.classList.remove('hidden');
        }

        if (products.length === 0 && reset) {
            container.innerHTML = `
                <div class="col-span-full py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <div class="text-5xl mb-4 opacity-30">🔍</div>
                    <p class="text-gray-500 font-medium">
                        ${searchQuery ? `Tidak ada produk "${searchQuery}"` : 'Produk tidak ditemukan.'}
                    </p>
                    ${searchQuery || currentCategory !== 'ALL' ? `<button onclick="resetFilters()" class="mt-4 text-brand font-bold hover:underline">Reset Filter</button>` : ''}
                </div>`;
            return;
        }

        // Render Produk
        products.forEach(product => {
            let imgUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"%3E%3Crect fill="%23f3f4f6" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" fill="%239ca3af" font-size="16" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
            if (product.image_url) {
                if (product.image_url.startsWith('http')) {
                    imgUrl = product.image_url;
                } else {
                    const { data } = client.storage.from('product-images').getPublicUrl(product.image_url);
                    imgUrl = data.publicUrl;
                }
            }

            // Logic Stok
            let stockClasses = '';
            let stockOverlay = '';

            if (product.stock <= 0) {
                stockOverlay = `
                <div class="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10 transition duration-300">
                    <span class="bg-black text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">HABIS</span>
                </div>`;
                stockClasses = 'opacity-75 grayscale';
            }

            const productCard = `
                <div class="product-card group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden ${stockClasses}">
                    ${stockOverlay}
                    <a href="product-detail.html?id=${product.id}" class="block overflow-hidden relative aspect-[4/5]">
                        <img src="${imgUrl}" 
                            alt="${product.name}" 
                            class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%239ca3af%22 font-size=%2216%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                    </a>
                    
                    <div class="p-4">
                        <div class="mb-2">
                            <span class="inline-block px-2 py-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase bg-gray-50 rounded-sm">
                                ${product.category || 'UMUM'}
                            </span>
                        </div>
                        <h3 class="text-sm font-bold text-gray-900 group-hover:text-black transition-colors mb-1 line-clamp-2 min-h-[2.5rem]">
                            <a href="product-detail.html?id=${product.id}">${product.name}</a>
                        </h3>
                        <div class="flex items-center justify-between mt-3">
                            <p class="text-base font-bold text-gray-900">
                                Rp ${parseInt(product.price).toLocaleString('id-ID')}
                            </p>
                            <button onclick="addToCart('${product.name}', ${product.price}, ${product.stock}, ${product.id})" 
                                class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-black hover:text-white transition-all transform hover:scale-110 focus:outline-none ${product.stock <= 0 ? 'hidden' : ''}"
                                aria-label="Tambah ke Keranjang">
                                <i class="fas fa-plus text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', productCard);
        });

        currentPage++;

    } catch (err) {
        console.error("Gagal load produk:", err);
        container.innerHTML = `<p class="text-center text-red-500 col-span-full">Gagal memuat: ${err.message}</p>`;
    } finally {
        isLoadingProducts = false;
    }
}

// UI Handlers
window.filterCategory = (cat) => {
    currentCategory = cat;

    // Update Button UI
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-black', 'text-white', 'border-black');
        btn.classList.add('border-gray-300', 'text-gray-600');

        if (
            (cat === 'ALL' && btn.innerText === 'Semua') ||
            (cat !== 'ALL' && btn.innerText.includes(cat)) ||
            (cat === 'Accessories' && btn.innerText === 'Aksesoris')
        ) {
            btn.classList.add('active', 'bg-black', 'text-white', 'border-black');
            btn.classList.remove('border-gray-300', 'text-gray-600');
        }
    });

    loadProducts(true);
};

window.sortProducts = (val) => {
    currentSort = val;
    loadProducts(true);
};

window.loadMoreProducts = () => {
    loadProducts(false);
};

window.resetFilters = () => {
    window.location.href = 'index.html';
};


// Helper URL Gambar
function getImageUrl(path) {
    if (!path) return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" fill="%239ca3af" font-size="16" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    if (path.startsWith('http')) return path;
    const { data } = client.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
}


// --- 5. LOGIKA KERANJANG & BADGE (Realtime) ---
let totalItemsInCart = 0;

// Update Badge Count Function
async function updateCartCount() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        updateBadgeUI(0);
        return;
    }

    const { count, error } = await client
        .from('cart_items')
        .select('*', { count: 'exact', head: true }) // head:true means only fetch count, not data
        .eq('user_id', session.user.id);

    if (!error) {
        // Karena spec cart items = row (bukan quantity), kalau mau sum quantity harus fetch data.
        // Tapi untuk badge sederhana, row count biasanya cukup, atau kita sum quantity jika perlu.
        // Mari kita coba fetch sum quantity agar lebih akurat dengan "jumlah barang".
        const { data: items } = await client.from('cart_items').select('quantity').eq('user_id', session.user.id);
        const totalQty = items ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        updateBadgeUI(totalQty);
    }
}

function updateBadgeUI(count) {
    totalItemsInCart = count;
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = count > 99 ? '99+' : count;
        badge.classList.remove('hidden'); // Ensure visible
        if (count === 0) badge.classList.add('hidden'); // Optional: hide if 0
        else badge.classList.remove('hidden');
    }
}

// Init Realtime Badge
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial Load
    updateCartCount();

    // 2. Subscribe Realtime
    const { data: { session } } = await client.auth.getSession();
    if (session) {
        client.channel('public:cart_badge')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `user_id = eq.${session.user.id} ` },
                (payload) => {
                    updateCartCount();
                })
            .subscribe();
    }
});

// window.addToCart is below...
window.addToCart = async function (productName, price, stock, productId) {
    // Mencegah link default
    if (window.event) window.event.preventDefault();
    if (window.event) window.event.stopPropagation();

    // 1. Cek Login
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        Swal.fire({
            icon: 'info',
            title: 'Login Diperlukan',
            text: 'Silakan login terlebih dahulu untuk berbelanja.',
            confirmButtonText: 'Login Sekarang',
            confirmButtonColor: '#111827'
        }).then((result) => {
            if (result.isConfirmed) {
                window.openAuthModal('login');
            }
        });
        return;
    }

    // 2. Redirect ke Detail untuk Pilih Ukuran
    // Karena kita butuh ukuran (S, M, L, dll), kita tidak bisa langsung add to cart dari index
    // kecuali kita set default size, tapi itu bad UX.
    window.location.href = `product-detail.html?id=${productId}`;
}