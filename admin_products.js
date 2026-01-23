/*
 * ========================================
 * KONEKTOR SUPABASE - ADMIN: MANAJEMEN PRODUK
 * ========================================
 */

// 1. Inisialisasi Klien Supabase
const SUPABASE_URL = 'https://vatlrekidlsxtvxoaegn.supabase.co'; // 👈 GANTI INI JIKA BEDA
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdGxyZWtpZGxzeHR2eG9hZWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyODc3NTIsImV4cCI6MjA3Njg2Mzc1Mn0.4ZrBuQDO-dspKY72lquNuGn5BisUChJwBxtKPD0aKE0'; // 👈 GANTI INI JIKA BEDA

if (!window.supabase) {
    console.error('Error: Supabase client library not found.');
    alert('Koneksi ke server gagal. Harap refresh halaman.');
}
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Tangkap Elemen HTML
const productTableBody = document.getElementById('product-table-body');
const loadingSpinner = document.getElementById('loading-spinner');
const productCountInfo = document.getElementById('product-count-info');

// 3. Fungsi Utama: Muat dan Tampilkan Produk di Tabel
async function loadProducts() {
    if (!productTableBody || !loadingSpinner) return;

    // Tampilkan loading
    loadingSpinner.classList.remove('hidden');
    productTableBody.innerHTML = ''; // Kosongkan tabel

    try {
        // Ambil data dari tabel 'products'
        let { data: products, error, count } = await supabase
            .from('products')
            .select('*', { count: 'exact' }) // Ambil semua kolom DAN hitung total baris
            .order('created_at', { ascending: false }); // Urutkan terbaru

        if (error) throw error;

        // Sembunyikan loading
        loadingSpinner.classList.add('hidden');

        if (!products || products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-10 text-center text-gray-500">Belum ada produk.</td></tr>';
            if (productCountInfo) productCountInfo.innerText = 'Menampilkan 0 - 0 dari 0 produk';
            return;
        }

        // Jika berhasil, isi tabel
        console.log('Produk diterima:', products);

        products.forEach((product, index) => {
            const productRowHTML = `
                <tr class="hover:bg-gray-50 transition-colors duration-150">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <img src="${getImageUrl(product.image_url)}" 
                             alt="${product.name}" 
                             class="w-12 h-12 rounded-md object-cover"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 60%22%3E%3Crect fill=%22%23f0f0f0%22 width=%2260%22 height=%2260%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23888%22 font-size=%228%22 text-anchor=%22middle%22 dy=%22.3em%22%3EError%3C/text%3E%3C/svg%3E';">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Rp${product.price.toLocaleString('id-ID')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold ${product.stock < 10 ? 'text-red-600' : 'text-gray-700'}">
                        ${product.stock}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <a href="edit_product.html?id=${product.id}" class="text-indigo-600 hover:text-indigo-900" title="Edit">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button onclick="deleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}', '${product.image_url}')" class="text-red-600 hover:text-red-900" title="Hapus">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
            productTableBody.insertAdjacentHTML('beforeend', productRowHTML);
        });

        // Update info pagination
        if (productCountInfo) productCountInfo.innerText = `Menampilkan ${products.length} dari ${count} produk`;

    } catch (err) {
        console.error('Error fetching products:', err.message);
        loadingSpinner.classList.add('hidden');
        productTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-red-500">Gagal memuat produk: ${err.message}</td></tr>`;
    }
}

// 4. FUNGSI AKSI: Hapus Produk
async function deleteProduct(productId, productName, imageUrl) {
    const result = await Swal.fire({
        title: 'Hapus Produk?',
        text: `Anda yakin ingin menghapus produk "${productName}" (ID: ${productId})?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    console.log(`Menghapus produk ID: ${productId}...`);
    try {
        // (Opsional tapi Penting) Hapus gambar dari Supabase Storage dulu
        if (imageUrl) {
            const { error: storageError } = await supabase.storage
                .from('product-images') // 👈 GANTI NAMA BUCKET JIKA BEDA
                .remove([imageUrl]); // Hapus file berdasarkan namanya

            if (storageError && storageError.message !== 'The resource was not found') {
                // Tampilkan error jika HAPUS GAMBAR gagal (tapi lanjutkan proses)
                console.warn('Gagal menghapus gambar di storage:', storageError.message);
            } else {
                console.log('Gambar di storage berhasil dihapus.');
            }
        }

        // Hapus data produk dari tabel 'products'
        const { error: dbError } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (dbError) throw dbError;

        // Jika berhasil
        Swal.fire('Berhasil!', 'Produk berhasil dihapus!', 'success');
        loadProducts(); // Muat ulang tabel

    } catch (error) {
        console.error('Gagal menghapus produk:', error.message);
        Swal.fire('Gagal!', `Gagal menghapus produk: ${error.message}`, 'error');
    }
}

// 5. Fungsi Bantuan untuk URL Gambar (Sama seperti di main.js)
function getImageUrl(fileName) {
    if (!fileName) return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"%3E%3Crect fill="%23f0f0f0" width="60" height="60"/%3E%3Ctext x="50%25" y="50%25" fill="%23888" font-size="8" text-anchor="middle" dy=".3em"%3ENo Img%3C/text%3E%3C/svg%3E';
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName); // 👈 GANTI NAMA BUCKET
    return data.publicUrl;
}

// 6. Fungsi Cek Login (PENTING: Amankan Halaman Admin)
async function checkAdminLogin() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // Jika tidak ada yang login, tendang ke login.html
        alert('Anda harus login untuk mengakses halaman ini.');
        window.location.href = '../login.html'; // Sesuaikan path jika perlu
        return;
    }

    // Cek perannya
    let { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (error || !profile) {
        // Jika profil tidak ada, tendang
        alert('Gagal mengambil data profil.');
        window.location.href = '../login.html';
        return;
    }

    // Cek jika perannya BUKAN admin atau karyawan
    if (profile.role !== 'admin' && profile.role !== 'karyawan') {
        // Jika dia pembeli, tendang ke halaman utama
        alert('Anda tidak punya hak akses ke halaman ini.');
        window.location.href = '../index.html';
        return;
    }

    // Jika lolos, tampilkan nama & muat produk
    document.getElementById('user-name').innerText = profile.role; // Tampilkan 'admin' or 'karyawan'
    loadProducts(); // Muat produk HANYA JIKA login berhasil
}

// 7. Jalankan Fungsi Utama Saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', checkAdminLogin);