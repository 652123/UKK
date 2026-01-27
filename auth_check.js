// auth_check.js
// Script to check authentication and role access
// Requires supabase client (window.db or window.supabase) to be initialized first

// Helper for notifications (Fallback to alert if Swal not loaded)
function notify(type, title, text) {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({ icon: type, title: title, text: text, confirmButtonColor: '#111827', background: '#121212', color: '#fff' });
    } else {
        alert(`${title}\n${text}`);
        return Promise.resolve({ isConfirmed: true });
    }
}

async function checkAuth(allowedRoles = [], isPublic = false) {
    // Tunggu sebentar untuk memastikan client Supabase siap (jika load async)
    if (!window.db) {
        console.warn("Supabase client (window.db) belum siap, menunggu...");
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!window.db) {
            console.error("Supabase client tidak ditemukan. Pastikan config.js dimuat.");
            if (!isPublic) {
                await notify('error', 'Error Sistem', 'Sesi tidak valid. Kembali ke halaman login.');
                window.location.href = '/index.html';
            }
            return;
        }
    }

    const { data: { session }, error } = await window.db.auth.getSession();

    if (error || !session) {
        if (!isPublic) {
            console.warn("Tidak ada sesi aktif, redirect ke login.");
            notify('warning', 'Akses Ditolak', 'Silakan login terlebih dahulu.').then(() => {
                window.location.href = '/index.html';
            });
        } else {
            // console.log("Halaman publik: User belum login.");
        }
        return;
    }

    const user = session.user;

    // Ambil role dari tabel profiles
    const { data: profile, error: profileError } = await window.db
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error("Gagal mengambil profil user:", profileError);
        if (!isPublic) {
            await notify('error', 'Gagal', 'Gagal memverifikasi profil akun.');
            window.location.href = '/index.html';
        }
        return;
    }

    // Validasi Role (Hanya untuk halaman yang membatasi role)
    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
        if (!isPublic) {
            console.warn(`User role '${profile.role}' tidak diizinkan masuk ke halaman ini.`);
            await notify('error', 'Akses Dilarang', 'Anda tidak memiliki hak akses ke halaman ini.');

            // Redirect berdasarkan role yang benar
            if (profile.role === 'bos') window.location.href = '/bos/boss_dashboard.html';
            else if (profile.role === 'admin') window.location.href = '/admin/dashboard.html';
            else window.location.href = '/index.html';
            return;
        }
    }

    // Jika berhasil
    // console.log(`Auth sukses.User: ${profile.name} (${profile.role})`);

    // Update nama user di UI jika ada elemennya
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        userNameEl.innerText = profile.name || user.email;
    }

    // Update tombol Login jadi Logout di halaman publik jika user login
    if (isPublic) {
        const loginBtn = document.querySelector("button[onclick=\"openAuthModal('login')\"]");
        if (loginBtn) {
            // Updated: Show only first name to handle long names in navbar
            const firstName = profile.name ? profile.name.split(' ')[0] : 'User';
            loginBtn.innerText = `Halo, ${firstName}`;
            // Hapus onclick lama (openAuthModal) dan ganti baru
            loginBtn.removeAttribute("onclick");
            loginBtn.addEventListener("click", async () => {

                // --- ADMIN MENU ---
                if (profile.role === 'admin') {
                    if (typeof Swal !== 'undefined') {
                        const result = await Swal.fire({
                            title: `Administrator`,
                            text: `Halo ${profile.name}, masuk ke dashboard?`,
                            icon: 'info',
                            showCancelButton: true,
                            confirmButtonText: '🚀 Dashboard Admin',
                            cancelButtonText: '🚪 Logout',
                            confirmButtonColor: '#111827',
                            cancelButtonColor: '#d33',
                            background: '#121212',
                            color: '#fff'
                        });

                        if (result.isConfirmed) {
                            window.location.href = '/admin/dashboard.html';
                        } else if (result.dismiss === Swal.DismissReason.cancel) {
                            await window.db.auth.signOut();
                            window.location.reload();
                        }
                    } else {
                        if (confirm("Masuk ke Dashboard Admin?")) window.location.href = '/admin/dashboard.html';
                    }
                }
                // --- BOS MENU ---
                else if (profile.role === 'bos') {
                    if (typeof Swal !== 'undefined') {
                        const result = await Swal.fire({
                            title: `Boss Panel`,
                            text: `Halo ${profile.name}, lihat laporan?`,
                            icon: 'info',
                            showCancelButton: true,
                            confirmButtonText: '💼 Dashboard Bos',
                            cancelButtonText: '🚪 Logout',
                            confirmButtonColor: '#111827',
                            cancelButtonColor: '#d33',
                            background: '#121212',
                            color: '#fff'
                        });

                        if (result.isConfirmed) {
                            window.location.href = '/bos/boss_dashboard.html';
                        } else if (result.dismiss === Swal.DismissReason.cancel) {
                            await window.db.auth.signOut();
                            window.location.reload();
                        }
                    } else {
                        if (confirm("Masuk ke Dashboard Bos?")) window.location.href = '/bos/boss_dashboard.html';
                    }
                }
                // --- USER / PEMBELI MENU ---
                else {
                    if (typeof Swal !== 'undefined') {
                        const result = await Swal.fire({
                            title: `Hai, ${profile.name}!`,
                            text: "Mau ngapain?",
                            icon: 'info',
                            showCancelButton: true,
                            showDenyButton: true,
                            confirmButtonText: '👤 Profil Saya',
                            denyButtonText: '📦 Pesanan Saya',
                            cancelButtonText: '🚪 Logout',
                            confirmButtonColor: '#fff',
                            confirmButtonAriaLabel: 'Profil Saya',
                            customClass: { confirmButton: 'text-black font-bold' },
                            denyButtonColor: '#6366f1',
                            cancelButtonColor: '#dc2626',
                            background: '#121212',
                            color: '#fff'
                        });

                        if (result.isConfirmed) {
                            window.location.href = 'profile.html';
                        } else if (result.isDenied) {
                            window.location.href = 'my-orders.html';
                        } else if (result.dismiss === Swal.DismissReason.cancel) {
                            await window.db.auth.signOut();
                            window.location.reload();
                        }
                    } else {
                        // Fallback for no Swal
                        if (confirm("Klik OK untuk ke Profil, Cancel untuk Logout")) {
                            window.location.href = 'profile.html';
                        } else {
                            await window.db.auth.signOut();
                            window.location.reload();
                        }
                    }
                }
            });

            loginBtn.classList.remove('bg-gray-900', 'bg-white', 'text-black');
            loginBtn.classList.add('bg-gradient-to-r', 'from-brand-600', 'to-brand-accent', 'text-white', 'border', 'border-white/20', 'shadow-[0_0_15px_rgba(139,92,246,0.5)]');
        }
    }

    // Setup Logout Button jika ada (untuk dashboard)
    setupLogout();
}

function setupLogout() {
    const logoutLinks = document.querySelectorAll('a[href*="login.html"], a[href*="logout"]');
    logoutLinks.forEach(link => {
        // Clone node untuk menghapus event listener lama agar tidak double
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);

        newLink.addEventListener('click', async (e) => {
            e.preventDefault();

            let confirmed = false;

            if (typeof Swal !== 'undefined') {
                const result = await Swal.fire({
                    title: 'Konfirmasi Logout',
                    text: "Anda yakin ingin keluar dari sistem?",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Ya, Keluar',
                    background: '#121212',
                    color: '#fff'
                });
                confirmed = result.isConfirmed;
            } else {
                confirmed = confirm("Apakah Anda yakin ingin logout?");
            }

            if (confirmed) {
                const { error } = await window.db.auth.signOut();
                if (error) console.error("Logout error:", error);
                window.location.href = '/index.html';
            }
        });
    });
}

// --- REALTIME AUTH LISTENER ---
document.addEventListener('DOMContentLoaded', () => {
    // Tunggu window.db siap
    const interval = setInterval(() => {
        if (window.db) {
            clearInterval(interval);

            // Listen for Auth Changes
            window.db.auth.onAuthStateChange((event, session) => {
                // console.log("Auth State Change:", event);

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED_OR_USER_UPDATED') {
                    // Re-run checkAuth to update UI (Pass true for isPublic to avoid redirect loops on public pages)
                    // We detect current path to decide allowedRoles? 
                    // For simplicity, we just trigger UI update logic if on public page
                    const isAdminPage = window.location.pathname.includes('/admin/');
                    const isBosPage = window.location.pathname.includes('/bos/');

                    if (!isAdminPage && !isBosPage) {
                        checkAuth([], true);
                    }
                } else if (event === 'SIGNED_OUT') {
                    // Reset Navbar UI
                    const loginBtn = document.querySelector("button[onclick^='openAuthModal']"); // Selector might need adjust if ID changed
                    const userNameEl = document.getElementById('user-name'); // If used

                    // Simply reload to clear state is easiest, or manually reset
                    // window.location.reload(); // Reloading is safest for clean state
                }
            });
        }
    }, 100);
});
