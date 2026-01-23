function renderNavbar() {
    const navbarHTML = `
    <nav class="sticky top-0 z-50 bg-white bg-opacity-90 backdrop-blur-md shadow-sm">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">

                <div class="flex-shrink-0">
                    <a href="index.html" class="text-3xl font-black text-gray-900 uppercase tracking-wider">
                        Dazeon
                    </a>
                </div>

                <div class="hidden md:flex md:space-x-10">
                    <a href="index.html" class="font-semibold text-gray-500 hover:text-gray-900 transition-colors duration-200 py-2">Beranda</a>
                    <a href="index.html#produk" class="font-semibold text-gray-500 hover:text-gray-900 transition-colors duration-200 py-2">Produk</a>
                    <a href="index.html#Tentang" class="font-semibold text-gray-500 hover:text-gray-900 transition-colors duration-200 py-2">Tentang</a>
                    <a href="index.html#kontak" class="font-semibold text-gray-500 hover:text-gray-900 transition-colors duration-200 py-2">Kontak</a>
                </div>

                <div class="flex items-center space-x-5">
                    <!-- SEARCH BAR -->
                    <div class="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2">
                        <input type="text" id="nav-search-input" placeholder="Cari..." 
                            class="bg-transparent border-none focus:outline-none text-sm w-32 lg:w-48 text-gray-700"
                            onkeypress="handleNavSearch(event)">
                        <button onclick="executeNavSearch()" class="text-gray-500 hover:text-black">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>

                    <a href="cart.html" class="relative text-gray-600 hover:text-gray-900" aria-label="Keranjang Belanja">
                        <i class="fas fa-shopping-cart text-2xl"></i>
                        <span id="cart-count" class="absolute -top-2 -right-3 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">0</span>
                    </a>

                    <button onclick="openAuthModal('login')" id="login-btn-nav" class="hidden sm:block bg-gray-900 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors duration-200">
                        Masuk / Daftar
                    </button>

                    <button id="mobile-menu-btn" onclick="toggleMobileMenu()" class="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none" aria-label="Buka Menu">
                        <i class="fas fa-bars text-2xl"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Menu (Hidden by default) -->
        <div id="mobile-menu" class="hidden md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg">
            <div class="px-4 pt-2 pb-6 space-y-1">
                <a href="index.html" class="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Beranda</a>
                <a href="index.html#produk" class="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Produk</a>
                <a href="index.html#Tentang" class="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Tentang</a>
                <a href="index.html#kontak" class="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Kontak</a>
                
                <!-- Mobile Search -->
                <div class="mt-4 px-3">
                    <div class="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                        <input type="text" id="mobile-search-input" placeholder="Cari produk..." 
                            class="bg-transparent border-none focus:outline-none text-sm w-full text-gray-700"
                            onkeypress="handleNavSearch(event, 'mobile')">
                        <button onclick="executeNavSearch('mobile')" class="text-gray-500 hover:text-black ml-2">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>

                 <div class="mt-4 px-3">
                    <button onclick="openAuthModal('login')" id="login-btn-mobile" class="w-full bg-gray-900 text-white font-bold py-3 rounded-lg text-sm hover:bg-gray-800 transition-colors shadow-md">
                        Masuk / Daftar
                    </button>
                </div>
            </div>
        </div>
    </nav>`;

    const container = document.getElementById('navbar-container');
    if (container) {
        container.innerHTML = navbarHTML;

        // --- 10. WHATSAPP FLOATING BUTTON (Batch 1 Improvement) ---
        const existingFab = document.getElementById('whatsapp-fab');
        if (!existingFab) {
            const fabHTML = `
            <a href="https://wa.me/6281234567890?text=Halo%20Dazeon%20Store,%20saya%20mau%20tanya%20produk..." 
               target="_blank"
               id="whatsapp-fab"
               class="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transform hover:scale-110 transition-all duration-300 flex items-center justify-center group">
                <i class="fab fa-whatsapp text-3xl"></i>
                <span class="absolute right-full mr-3 bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Chat Admin
                </span>
            </a>`;
            document.body.insertAdjacentHTML('beforeend', fabHTML);
        }
    }
}

// MOBILE MENU TOGGLE
window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-btn');
    const icon = btn.querySelector('i');

    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        menu.classList.add('hidden');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

// SEARCH LOGIC
window.handleNavSearch = (event, type = 'desktop') => {
    if (event.key === 'Enter') {
        executeNavSearch(type);
    }
}

window.executeNavSearch = (type = 'desktop') => {
    const inputId = type === 'mobile' ? 'mobile-search-input' : 'nav-search-input';
    const query = document.getElementById(inputId).value.trim();
    if (query) {
        // Redirect to index with search param
        window.location.href = `index.html?search=${encodeURIComponent(query)}#produk`;
    }
}

document.addEventListener('DOMContentLoaded', renderNavbar);
