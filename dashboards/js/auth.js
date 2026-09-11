// Authentication logic for TOMMY'S HOSPITAL Dashboards

function getAuthApiUrl(endpoint) {
    if (typeof getApiUrl === 'function') {
        return getApiUrl(endpoint);
    }
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
    const base = (typeof window !== 'undefined' && window.API_BASE_URL)
        ? window.API_BASE_URL
        : '';
    if (!base) return endpoint;
    return `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Login Form Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!emailInput.value.trim() || !passwordInput.value) {
                showToast("Please fill in all fields", "error");
                return;
            }

            // Show loading state
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "Signing In...";

            try {
                const response = await fetch(getAuthApiUrl('/api/auth/login'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: emailInput.value.trim(),
                        password: passwordInput.value
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Save session details to local storage
                    localStorage.setItem('jph_token', result.data.token);
                    localStorage.setItem('jph_refresh_token', result.data.refresh_token);
                    localStorage.setItem('jph_role', result.data.role);
                    localStorage.setItem('jph_user', JSON.stringify(result.data.profile));

                    showToast("Login successful!", "success");

                    // Track login in Google Tag Manager
                    if (typeof window !== 'undefined' && window.dataLayer) {
                        window.dataLayer.push({
                            event: 'login_success',
                            user_role: result.data.role
                        });
                    }

                    // Redirect based on user role
                    setTimeout(() => {
                        if (result.data.role === 'patient') {
                            window.location.href = '/dashboards/patient/index.html';
                        } else if (result.data.role === 'doctor') {
                            window.location.href = '/dashboards/doctor/index.html';
                        } else if (result.data.role === 'admin') {
                            window.location.href = '/dashboards/admin/index.html';
                        }
                    }, 800);
                } else {
                    showToast(result.error || "Login failed. Please verify credentials.", "error");
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            } catch (err) {
                showToast("Server communication issue. Please try again.", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    // 2. Handle Patient Register Form Submit
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullNameInput = document.getElementById('fullname');
            const emailInput = document.getElementById('email');
            const phoneInput = document.getElementById('phone');
            const dobInput = document.getElementById('dob');
            const genderSelect = document.getElementById('gender');
            const bloodGroupSelect = document.getElementById('blood_group');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm_password');
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            // Validation checks
            if (!fullNameInput.value.trim() || !emailInput.value.trim() || !passwordInput.value || !confirmPasswordInput.value) {
                showToast("Full Name, Email, and Password fields are required.", "error");
                return;
            }

            if (passwordInput.value.length < 8) {
                showToast("Password must be at least 8 characters long.", "error");
                return;
            }

            if (passwordInput.value !== confirmPasswordInput.value) {
                showToast("Passwords do not match.", "error");
                return;
            }

            // Show loading state
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "Creating Account...";

            try {
                const response = await fetch(getAuthApiUrl('/api/auth/register'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: emailInput.value.trim(),
                        password: passwordInput.value,
                        full_name: fullNameInput.value.trim(),
                        phone: phoneInput.value.trim() || null,
                        date_of_birth: dobInput.value || null,
                        gender: genderSelect.value || null,
                        blood_group: bloodGroupSelect.value || null
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showToast("Registration successful! Redirecting to login...", "success");

                    // Track registration in Google Tag Manager
                    if (typeof window !== 'undefined' && window.dataLayer) {
                        window.dataLayer.push({
                            event: 'registration_success',
                            user_role: 'patient'
                        });
                    }

                    setTimeout(() => {
                        window.location.href = '/dashboards/auth/login.html?registered=true';
                    }, 1500);
                } else {
                    showToast(result.error || "Registration failed. Try again.", "error");
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            } catch (err) {
                showToast("Server registration communication error.", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
});

// Logout handler
async function logout() {
    try {
        const token = localStorage.getItem('jph_token');
        if (token) {
            await fetch(getAuthApiUrl('/api/auth/logout'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (e) {
        console.error("Logout API call error:", e);
    } finally {
        // Always clear localStorage and redirect to login
        localStorage.clear();
        window.location.href = '/dashboards/auth/login.html';
    }
}
