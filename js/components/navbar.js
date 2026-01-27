function renderNavbar() {
    // Add padding to body to prevent navbar overlaying content (since fixed takes it out of flow)
    document.body.classList.add('pt-20');

    const navbarHTML = `
    <nav class="fixed top-0 left-0 w-full z-[999] bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">

                <div class="flex-shrink-0">
                    <a href="index.html" class="text-3xl font-black uppercase tracking-wider tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-brand-accent">
                        DAZEON
                    </a>
                </div>

                <div class="hidden lg:flex lg:space-x-8">
                    <a href="index.html" class="font-medium text-gray-300 hover:text-white transition-colors duration-200 py-2">Beranda</a>
                    <a href="index.html#produk" class="font-medium text-gray-300 hover:text-white transition-colors duration-200 py-2">Produk</a>
                    <a href="index.html#Tentang" class="font-medium text-gray-300 hover:text-white transition-colors duration-200 py-2">Tentang</a>
                    <a href="index.html#kontak" class="font-medium text-gray-300 hover:text-white transition-colors duration-200 py-2">Kontak</a>
                </div>

                <div class="flex items-center space-x-4 lg:space-x-6">
                    <!-- SEARCH BAR -->
                    <div class="hidden lg:flex items-center bg-white/10 border border-white/5 rounded-full px-4 py-2 focus-within:bg-white/20 transition-all">
                        <input type="text" id="nav-search-input" placeholder="Cari..." 
                            class="bg-transparent border-none focus:outline-none text-sm w-32 xl:w-48 text-white placeholder-gray-500"
                            onkeypress="handleNavSearch(event)">
                        <button onclick="executeNavSearch()" class="text-gray-400 hover:text-white">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>

                    <a href="cart.html" class="relative text-gray-300 hover:text-white transition-colors" aria-label="Keranjang Belanja">
                        <i class="fas fa-shopping-cart text-xl"></i>
                        <span id="cart-count" class="absolute -top-2 -right-2 bg-brand-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg shadow-brand-500/50">0</span>
                    </a>

                    <button onclick="openAuthModal('login')" id="login-btn-nav" class="hidden sm:block bg-white text-black font-bold px-5 py-2.5 rounded-full text-sm hover:bg-gray-200 transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        Masuk
                    </button>

                    <button id="mobile-menu-btn" onclick="toggleMobileMenu()" class="lg:hidden text-gray-300 hover:text-white focus:outline-none" aria-label="Buka Menu">
                        <i class="fas fa-bars text-2xl"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Menu (Hidden by default) -->
        <div id="mobile-menu" class="hidden lg:hidden bg-[#0a0a0a] border-t border-white/10 absolute w-full left-0 shadow-xl backdrop-blur-xl">
            <div class="px-4 pt-2 pb-6 space-y-1">
                <a href="index.html" class="block px-3 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition">Beranda</a>
                <a href="index.html#produk" class="block px-3 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition">Produk</a>
                <a href="index.html#Tentang" class="block px-3 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition">Tentang</a>
                <a href="index.html#kontak" class="block px-3 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition">Kontak</a>
                
                <!-- Mobile Search -->
                <div class="mt-4 px-3">
                    <div class="flex items-center bg-white/5 border border-white/5 rounded-xl px-3 py-2">
                        <input type="text" id="mobile-search-input" placeholder="Cari produk..." 
                            class="bg-transparent border-none focus:outline-none text-sm w-full text-white placeholder-gray-500"
                            onkeypress="handleNavSearch(event, 'mobile')">
                        <button onclick="executeNavSearch('mobile')" class="text-gray-400 hover:text-white ml-2">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>

                 <div class="mt-4 px-3">
                    <button onclick="openAuthModal('login')" id="login-btn-mobile" class="w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors shadow-lg shadow-white/10">
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
            <a href="contact.html" 
               id="helpdesk-fab"
               class="fixed bottom-6 right-6 z-50 bg-brand-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-500 transform hover:scale-110 transition-all duration-300 flex items-center justify-center group">
                <i class="fas fa-headset text-3xl"></i>
                <span class="absolute right-full mr-3 bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Bantuan / Tiket
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
