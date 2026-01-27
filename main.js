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
// Fungsi Buka Modal (Bisa dipanggil dari HTML: onclick="openAuthModal('register')")
window.openAuthModal = function (tab = 'login') {
    const modal = document.getElementById('auth-modal');
    const overlay = document.getElementById('modal-overlay');
    const panel = document.getElementById('modal-panel');

    if (modal) {
        modal.classList.remove('hidden');

        // Force Reflow
        void modal.offsetWidth;

        if (overlay) overlay.classList.remove('opacity-0');
        if (panel) {
            panel.classList.remove('opacity-0', 'scale-95');
            panel.classList.add('scale-100');
        }

        window.switchTab(tab);
    }
}

// Fungsi Tutup Modal
window.closeAuthModal = function () {
    const modal = document.getElementById('auth-modal');
    const overlay = document.getElementById('modal-overlay');
    const panel = document.getElementById('modal-panel');
    const msg = document.getElementById('modal-message');

    if (modal) {
        if (overlay) overlay.classList.add('opacity-0');
        if (panel) {
            panel.classList.add('opacity-0', 'scale-95');
            panel.classList.remove('scale-100');
        }

        // Wait for transition (300ms)
        setTimeout(() => {
            modal.classList.add('hidden');
            if (msg) msg.classList.add('hidden');
        }, 300);
    }
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

// Fungsi Helper Menampilkan Pesan Inline di Modal
function showModalMessage(type, text) {
    const msgEl = document.getElementById('modal-message');
    if (!msgEl) return;

    msgEl.classList.remove('hidden', 'text-red-400', 'bg-red-500/10', 'border-red-500/20', 'text-green-400', 'bg-green-500/10', 'border-green-500/20', 'border');

    if (type === 'error') {
        msgEl.classList.add('text-red-400', 'bg-red-500/10', 'border', 'border-red-500/20');
    } else {
        msgEl.classList.add('text-green-400', 'bg-green-500/10', 'border', 'border-green-500/20');
    }

    msgEl.innerText = text;
    msgEl.classList.remove('hidden');
    msgEl.style.display = 'block';
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
                // 2. Cek Role User (Optional: Bisa skip jika hanya butuh redirect)
                // const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).single();

                showModalMessage('success', 'Login Berhasil! Mengalihkan...');

                setTimeout(async () => {
                    const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).single();
                    const role = profile ? profile.role : 'pembeli';

                    if (role === 'bos') window.location.href = 'bos/boss_dashboard.html';
                    else if (role === 'admin') window.location.href = 'admin/dashboard.html';
                    else location.reload();
                }, 1000);

            } catch (err) {
                showModalMessage('error', err.message || 'Login Gagal');
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
                const { data, error } = await client.auth.signUp({
                    email,
                    password,
                    options: { data: { name } }
                });

                if (error) throw error;

                if (data.session) {
                    // Auto Login Handling
                    showModalMessage('success', 'Registrasi Berhasil! Anda telah masuk otomatis.');
                    regForm.reset();

                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    // Email Verification Required
                    showModalMessage('success', 'Registrasi Berhasil! Silakan cek email untuk verifikasi.');
                    regForm.reset();

                    setTimeout(() => {
                        window.switchTab('login');
                    }, 2000);
                }

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
                    // SIMULASI ALUR (Untuk UKK/Demo)
                    // Tidak mengirim email beneran, tapi pura-pura sukses dan langsung redirect

                    await new Promise(r => setTimeout(r, 1500)); // Fake loading 1.5s

                    // const { error } = await client.auth.resetPasswordForEmail(...) <-- HAPUS REAL LOGIC

                    showModalMessage('success', ' [SIMULASI] Link reset telah dikirim! Mengalihkan...');

                    setTimeout(() => {
                        window.location.href = 'reset-password.html'; // Direct redirect tanpa email
                    }, 1500);

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
        let skeletonHTML = '';
        for (let i = 0; i < 4; i++) {
            skeletonHTML += `
            <div class="product-skeleton bg-[#121212] rounded-xl overflow-hidden border border-white/5 shadow-sm animate-pulse">
                <div class="aspect-[4/5] bg-white/5 relative overflow-hidden">
                    <div class="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-15deg]"></div>
                </div>
                <div class="p-5 space-y-3">
                    <div class="h-3 w-1/4 bg-white/10 rounded-full"></div>
                    <div class="h-4 w-3/4 bg-white/10 rounded-full"></div>
                    <div class="pt-2 flex justify-between items-center">
                        <div class="h-4 w-1/3 bg-white/10 rounded-full"></div>
                        <div class="h-8 w-8 bg-white/10 rounded-lg"></div>
                    </div>
                </div>
            </div>`;
        }
        container.innerHTML = skeletonHTML;
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
                <div class="col-span-full py-16 text-center bg-[#121212] rounded-xl border border-dashed border-white/10">
                    <div class="text-5xl mb-4 opacity-30 grayscale">🔍</div>
                    <p class="text-gray-400 font-medium">
                        ${searchQuery ? `Tidak ada produk "${searchQuery}"` : 'Produk tidak ditemukan.'}
                    </p>
                    ${searchQuery || currentCategory !== 'ALL' ? `<button onclick="resetFilters()" class="mt-4 text-indigo-400 font-bold hover:text-indigo-300 hover:underline">Reset Filter</button>` : ''}
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

            const safeName = product.name.replace(/'/g, "\\'");
            const productCard = `
                    <div onclick="window.location.href='product-detail.html?id=${product.id}'" 
                        class="product-card group relative bg-[#121212] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.2)] hover:-translate-y-1 transition-all duration-300 border border-white/5 overflow-hidden ${stockClasses} cursor-pointer">
                        ${stockOverlay}
                        
                        <div class="block overflow-hidden relative aspect-[4/5] bg-[#0a0a0a]">
                            <img src="${imgUrl}" 
                                loading="lazy"
                                alt="${safeName}" 
                                class="w-full h-full object-cover object-center transition-transform duration-700"
                                onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%231a1a1a%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%234b5563%22 font-size=%2216%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                        </div>
                        
                        <div class="p-5">
                            <div class="mb-3">
                                <span class="inline-block px-2.5 py-1 text-[10px] font-bold tracking-wider text-indigo-300 uppercase bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                                    ${product.category || 'UMUM'}
                                </span>
                            </div>
                            <h3 class="text-base font-bold text-white group-hover:text-indigo-400 transition-colors mb-2 line-clamp-2 min-h-[3rem]">
                                ${product.name}
                            </h3>
                            <div class="flex items-center justify-between mt-4 border-t border-white/5 pt-4">
                                <p class="text-lg font-bold text-white">
                                    Rp ${parseInt(product.price).toLocaleString('id-ID')}
                                </p>
                                <button onclick="event.stopPropagation(); addToCart('${safeName}', ${product.price}, ${product.stock}, ${product.id})" 
                                    class="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-black hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-lg focus:outline-none ${product.stock <= 0 ? 'hidden' : ''}"
                                    aria-label="Tambah ke Keranjang">
                                    <i class="fas fa-shopping-bag text-sm"></i>
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
            confirmButtonColor: '#111827',
            background: '#121212',
            color: '#fff'
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