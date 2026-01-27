// KONFIGURASI SUPABASE (dari .env via server injection)
const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_KEY = '__SUPABASE_KEY__';

// Inisialisasi Client Supabase
var supabaseClient; // Gunakan nama beda agar tidak menimpa window.supabase (library)

if (window.supabase) {
    if (SUPABASE_URL === '__SUPABASE_URL__') {
        console.error("Config not injected! Please run using 'npm start' and access via localhost:3000");
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
