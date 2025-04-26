import axios from 'axios';

// Create axios instance with custom config
const api = axios.create({
    baseURL: 'http://localhost:5001',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('[API] Adding token to request:', config.url);
        }
        return config;
    },
    (error) => {
        console.error('[API] Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('[API] Response error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.response?.data?.message
        });

        // Check if the error is a 401 (Unauthorized)
        if (error.response?.status === 401) {
            const url = error.config?.url || '';
            
            // Only clear token for specific auth-related errors
            if (
                error.response?.data?.message?.includes('Invalid token') ||
                error.response?.data?.message?.includes('Token has expired') ||
                error.response?.data?.message?.includes('Access token is required')
            ) {
                console.log('[API] Clearing token due to auth error');
                localStorage.removeItem('token');
                
                // Only redirect if not already on login page and not an API verification request
                if (!window.location.pathname.includes('/login') && !url.includes('/verify')) {
                    console.log('[API] Redirecting to login page');
                    window.location.href = '/login';
                }
            } else {
                console.warn('[API] 401 error but not clearing token:', error.response?.data?.message);
            }
        }
        
        return Promise.reject(error);
    }
);

export default api; 