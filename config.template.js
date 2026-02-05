// config.js
// KONFIGURASI SUPABASE (dari .env via server injection)
const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_KEY = '__SUPABASE_KEY__';

// Midtrans Client Key (Injected)
window.MIDTRANS_CLIENT_KEY = '__MIDTRANS_CLIENT_KEY__';

// Inisialisasi Client Supabase
var supabaseClient; // Gunakan nama beda agar tidak menimpa window.supabase (library)

if (window.supabase) {
    if (!SUPABASE_URL.startsWith('http')) {
        console.error("Config not injected! Run via backend server.");
    } else {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase initialized successfully.");
    }
} else {
    console.error("Library Supabase belum dimuat! Pastikan script CDN sudah ada di <head>.");
}

// Export agar bisa dipakai jika menggunakan module (opsional, untuk script tag biasa variabel 'supabase' jadi global)
window.db = supabaseClient; // Alias global utama

// KONFIGURASI BACKEND (Midtrans, dll)
// Ubah ini saat deploy ke hosting (misal: https://api.tokokeren.com)
window.API_BASE_URL = '__API_BASE_URL__';

// --- GLOBAL THEME SETUP ---
// Override SweetAlert2 Default agar sesuai tema Dark Mode Website
if (typeof Swal !== 'undefined') {
    const originalSwal = window.Swal;
    window.Swal = originalSwal.mixin({
        background: '#121212', // Dark background
        color: '#e5e7eb', // Text gray-200
        confirmButtonColor: '#8b5cf6', // Brand-500 (Violet)
        cancelButtonColor: '#374151', // Gray-700
        iconColor: '#8b5cf6', // Violet Icon
        buttonsStyling: true,
        customClass: {
            popup: 'border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(139,92,246,0.15)]', // Glowing shadow
            title: 'text-white font-black tracking-wide',
            htmlContainer: 'text-gray-400 font-medium',
            confirmButton: 'bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl font-bold text-sm mx-2 shadow-lg shadow-brand-500/20 transition-all duration-300 transform hover:scale-105',
            cancelButton: 'bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold text-sm mx-2 border border-white/5 transition-all duration-300'
        }
    });
    // Restore static methods (like stopTimer, clickConfirm, etc. if mixin hides them, usually it preserves them)
    // Mixin returns a subclass, so it should be fine.
    console.log("SweetAlert2 Theme Applied: Dark Mode");
}
