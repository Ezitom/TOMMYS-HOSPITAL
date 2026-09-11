document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Functionality
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            if (htmlElement.classList.contains('dark')) {
                htmlElement.classList.remove('dark');
                localStorage.setItem('jph-theme', 'light');
            } else {
                htmlElement.classList.add('dark');
                localStorage.setItem('jph-theme', 'dark');
            }
        });
    }

    // Login Dropdown Toggle and Close on Outside Click
    const loginNavBtn = document.getElementById('login-nav-btn');
    const loginDropdownMenu = document.getElementById('login-dropdown-menu');

    if (loginNavBtn && loginDropdownMenu) {
        loginNavBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loginDropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!loginDropdownMenu.contains(e.target) && e.target !== loginNavBtn) {
                loginDropdownMenu.classList.remove('show');
            }
        });
    }

    // Sticky Header elevation on scroll
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) {
                header.classList.add('elevated');
            } else {
                header.classList.remove('elevated');
            }
        });
    }

    // Hamburger Mobile Menu + Dynamic Overlay Injection
    const hamburger = document.getElementById('hamburger-btn');
    const mobileOverlay = document.getElementById('mobile-nav');

    // Dynamically create background dimming overlay if not exists
    let navBgOverlay = document.getElementById('nav-overlay');
    if (!navBgOverlay) {
        navBgOverlay = document.createElement('div');
        navBgOverlay.id = 'nav-overlay';
        navBgOverlay.className = 'nav-overlay';
        document.body.appendChild(navBgOverlay);
    }

    function openMobileNav() {
        if (mobileOverlay) mobileOverlay.classList.add('open');
        if (navBgOverlay) navBgOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileNav() {
        if (mobileOverlay) mobileOverlay.classList.remove('open');
        if (navBgOverlay) navBgOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Inject Theme Toggle and Close button inside Mobile Menu
    if (mobileOverlay && !mobileOverlay.querySelector('.mobile-menu-header')) {
        const menuHeader = document.createElement('div');
        menuHeader.className = 'mobile-menu-header';
        menuHeader.style.display = 'flex';
        menuHeader.style.justifyContent = 'space-between';
        menuHeader.style.alignItems = 'center';
        menuHeader.style.marginBottom = '20px';
        menuHeader.style.width = '100%';

        // Theme toggle inside mobile menu
        const menuThemeToggle = document.createElement('button');
        menuThemeToggle.className = 'theme-toggle-btn';
        menuThemeToggle.setAttribute('aria-label', 'Toggle Theme');
        menuThemeToggle.innerHTML = `
            <!-- Sun Icon (shown in dark mode) -->
            <svg class="sun-icon" viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <!-- Moon Icon (shown in light mode) -->
            <svg class="moon-icon" viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;
        menuThemeToggle.addEventListener('click', () => {
            if (htmlElement.classList.contains('dark')) {
                htmlElement.classList.remove('dark');
                localStorage.setItem('jph-theme', 'light');
            } else {
                htmlElement.classList.add('dark');
                localStorage.setItem('jph-theme', 'dark');
            }
        });

        // Close button (X)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-menu-close';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.color = 'var(--text-primary)';
        closeBtn.style.padding = '8px';
        closeBtn.style.display = 'flex';
        closeBtn.style.alignItems = 'center';
        closeBtn.style.justifyContent = 'center';
        closeBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        closeBtn.addEventListener('click', closeMobileNav);

        menuHeader.appendChild(menuThemeToggle);
        menuHeader.appendChild(closeBtn);
        mobileOverlay.insertBefore(menuHeader, mobileOverlay.firstChild);
    }

    if (hamburger && mobileOverlay) {
        hamburger.addEventListener('click', () => {
            if (mobileOverlay.classList.contains('open')) {
                closeMobileNav();
            } else {
                openMobileNav();
            }
        });

        if (navBgOverlay) {
            navBgOverlay.addEventListener('click', closeMobileNav);
        }

        // Close on nav link click
        mobileOverlay.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMobileNav);
        });
    }


    // Scroll Fade-in Animation (IntersectionObserver)
    const revealElements = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });
    } else {
        // Fallback for older browsers
        revealElements.forEach(element => {
            element.classList.add('active');
        });
    }

    // Appointment Request Form is now handled in contact.html
});
