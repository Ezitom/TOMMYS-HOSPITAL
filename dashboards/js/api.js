// Shared API Fetch Wrapper with Authentication Headers

// Base URL helper: reads from window.API_BASE_URL (configured via config.js)
function getApiUrl(endpoint) {
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }
    const base = (typeof window !== 'undefined' && window.API_BASE_URL)
        ? window.API_BASE_URL
        : '';
    if (!base) return endpoint;
    return `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

async function refreshSessionIfNeeded() {
    const token = localStorage.getItem('jph_token');
    const role = localStorage.getItem('jph_role');
    const refreshToken = localStorage.getItem('jph_refresh_token');
    
    if (!token || !role) {
        window.location.href = '/dashboards/auth/login.html';
        return false;
    }

    try {
        const res = await fetch(getApiUrl('/api/auth/refresh'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!res.ok) return true; // if refresh endpoint not available, continue anyway

        const data = await res.json();
        if (data.success && data.data.token) {
            localStorage.setItem('jph_token', data.data.token);
            if (data.data.refresh_token) {
                localStorage.setItem('jph_refresh_token', data.data.refresh_token);
            }
        }
        return true;
    } catch (err) {
        // Network error during refresh — do not log out, just continue
        console.warn('Token refresh failed silently:', err);
        return true;
    }
}

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('jph_token');
    
    if (!token) {
        window.location.href = '/dashboards/auth/login.html';
        return null;
    }

    try {
        const targetUrl = getApiUrl(url);
        const res = await fetch(targetUrl, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        // Only logout on 401 if it is a genuine auth failure
        if (res.status === 401) {
            // Try to refresh the token once before logging out
            const refreshToken = localStorage.getItem('jph_refresh_token');
            const refreshRes = await fetch(getApiUrl('/api/auth/refresh'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            const refreshData = await refreshRes.json();

            if (refreshData.success && refreshData.data.token) {
                // Token refreshed successfully — retry the original request once
                localStorage.setItem('jph_token', refreshData.data.token);
                if (refreshData.data.refresh_token) {
                    localStorage.setItem('jph_refresh_token', refreshData.data.refresh_token);
                }
                const retryRes = await fetch(targetUrl, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${refreshData.data.token}`,
                        ...(options.headers || {})
                    }
                });
                return retryRes.json();
            } else {
                // Refresh also failed — now it is safe to logout
                localStorage.clear();
                window.location.href = '/dashboards/auth/login.html';
                return null;
            }
        }

        // For all other error status codes (404, 500 etc) do NOT logout
        // Just return the response and let the page handle it
        return res.json();

    } catch (err) {
        // Network error — do NOT logout, just log and return null
        console.error('API request failed:', err);
        return null;
    }
}

// Global UI helper functions (Toast)
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : 'success'}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slide-out 0.3s forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Format currency values in Nigerian Naira
function formatNaira(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '₦0.00';
    return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date values in Nigerian format (DD/MM/YYYY)
function formatDateNG(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
}

// Shared dashboard layout initializer
async function initDashboardLayout(role, activeTabId) {
    await refreshSessionIfNeeded();
    const token = localStorage.getItem('jph_token');
    const userRole = localStorage.getItem('jph_role');
    const userStr = localStorage.getItem('jph_user');

    // 1. Role verification check
    if (!token || userRole !== role) {
        localStorage.clear();
        window.location.href = '/dashboards/auth/login.html';
        return;
    }

    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) return;

    // 2. Setup user profile elements in sidebar and topbar
    const displayName = user.full_name || 'User';
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const avatarInitialsEl = document.getElementById('user-avatar-initials');
    if (avatarInitialsEl) avatarInitialsEl.textContent = initials;

    const topbarInitialsEl = document.getElementById('topbar-avatar-initials');
    if (topbarInitialsEl) topbarInitialsEl.textContent = initials;

    const displayNameEl = document.getElementById('user-display-name');
    if (displayNameEl) displayNameEl.textContent = displayName;

    // 3. Mark active navigation item
    if (activeTabId) {
        const activeLink = document.getElementById(activeTabId);
        if (activeLink) activeLink.classList.add('active');
    }

    // 4. Setup Theme Toggle Action
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        // Render initial SVG based on theme
        const renderThemeIcon = () => {
            const isDark = document.documentElement.classList.contains('dark');
            themeToggleBtn.innerHTML = isDark 
                ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>` 
                : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
        };
        renderThemeIcon();

        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDarkNow = document.documentElement.classList.contains('dark');
            localStorage.setItem('jph-theme', isDarkNow ? 'dark' : 'light');
            renderThemeIcon();
        });
    }

    // 5. Sidebar Hamburger Toggle (Mobile) + Overlay
    const hamburgerBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    // Inject sidebar overlay into DOM if not already present
    let sidebarOverlay = document.getElementById('sidebar-overlay');
    if (!sidebarOverlay) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.id = 'sidebar-overlay';
        sidebarOverlay.className = 'sidebar-overlay';
        document.body.appendChild(sidebarOverlay);
    }

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
        sidebarOverlay.addEventListener('click', () => {
            closeSidebar();
        });
        // Close sidebar on nav link click (mobile UX)
        sidebar.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) closeSidebar();
            });
        });
    }

    // 6. User Dropdown Menu Toggle
    const profileTrigger = document.getElementById('profile-dropdown-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
            // Hide notification panel if open
            const notifPanel = document.getElementById('notifications-panel');
            if (notifPanel) notifPanel.classList.remove('show');
        });
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('show');
        });
    }

    // 7. Notification Panel Dropdown Toggle
    const bellBtn = document.getElementById('bell-btn');
    const notifPanel = document.getElementById('notifications-panel');
    if (bellBtn && notifPanel) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('show');
            // Hide profile dropdown if open
            if (profileDropdown) profileDropdown.classList.remove('show');
        });
        document.addEventListener('click', () => {
            notifPanel.classList.remove('show');
        });
    }

    // 8. Bind logout buttons
    const logoutDropdownBtn = document.getElementById('logout-btn-dropdown');
    if (logoutDropdownBtn) {
        logoutDropdownBtn.addEventListener('click', logout);
    }
    const sidebarLogoutBtn = document.getElementById('nav-logout');
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', logout);
    }

    // 9. Fetch Notifications
    fetchNotifications(role);
}

// Fetch and display user notifications in the top bar dropdown
async function fetchNotifications(role) {
    const unreadCountBadge = document.getElementById('unread-count');
    const notifListContainer = document.getElementById('notifications-list-container');
    const markAllReadBtn = document.getElementById('mark-all-read');

    if (!notifListContainer) return;

    // Role-specific notification API endpoint path
    const url = `/api/${role === 'patient' ? 'patients' : (role === 'doctor' ? 'doctors' : 'patients')}/notifications`;
    
    // For admin, let's default notifications or let admin use standard patients notification table format
    const res = await apiRequest(url, { method: 'GET' });

    if (res && res.success && res.data) {
        const notifications = res.data;
        const unreadList = notifications.filter(n => !n.is_read);

        // Update Badge Count
        if (unreadCountBadge) {
            if (unreadList.length > 0) {
                unreadCountBadge.textContent = unreadList.length;
                unreadCountBadge.style.display = 'flex';
            } else {
                unreadCountBadge.style.display = 'none';
            }
        }

        // Render List
        if (notifications.length === 0) {
            notifListContainer.innerHTML = `<li class="notification-empty-state">No notifications yet</li>`;
        } else {
            notifListContainer.innerHTML = notifications.map(n => `
                <li class="notification-item ${n.is_read ? '' : 'unread'}">
                    <div>${n.message}</div>
                    <div class="notification-item-time">${formatDateNG(n.created_at)}</div>
                </li>
            `).join('');
        }

        // Add Mark All as Read trigger
        if (markAllReadBtn) {
            markAllReadBtn.style.display = unreadList.length > 0 ? 'inline' : 'none';
            markAllReadBtn.onclick = async () => {
                const readUrl = `/api/${role === 'patient' ? 'patients' : (role === 'doctor' ? 'doctors' : 'patients')}/notifications/read`;
                const markRes = await apiRequest(readUrl, { method: 'PUT' });
                if (markRes && markRes.success) {
                    fetchNotifications(role);
                }
            };
        }
    }
}

// Inline CSS animation rule for sliding out toasts
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes slide-out {
    to {
        transform: translateX(120%);
        opacity: 0;
    }
}
`;
document.head.appendChild(styleSheet);
