// ============================================================================
// TOMMY'S HOSPITAL — Frontend API Configuration
// ============================================================================
// When deploying to Render & Netlify:
// Replace the URL below with your actual deployed Render backend URL.
// Example: const API_BASE_URL = 'https://just-path-hospital-backend.onrender.com';
// For local development with backend running locally, use 'http://localhost:3000'
// ============================================================================

const API_BASE_URL = 'https://tommys-hospital.onrender.com';

// Attach to window for global access across all frontend pages & dashboards
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
}

// Export for module environments if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL };
}
