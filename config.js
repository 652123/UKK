// config.js
// KONFIGURASI SUPABASE (dari .env)
const SUPABASE_URL = 'https://rkpkfgenzpfynypeceto.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcGtmZ2VuenBmeW55cGVjZXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzQ4NTksImV4cCI6MjA4Mzg1MDg1OX0.cbZNCFnTzgiQQPC1Cstvw--JcdzA-W0--8UdR2Gxbsk';

// Inisialisasi Client Supabase
var supabase; // Gunakan var agar tidak error jika redeclare di global scope (walaupun idealnya modules)

if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase initialized successfully.");
} else {
    console.error("Library Supabase belum dimuat! Pastikan script CDN sudah ada di <head>.");
}

// Export agar bisa dipakai jika menggunakan module (opsional, untuk script tag biasa variabel 'supabase' jadi global)
window.db = supabase; // Alias global
