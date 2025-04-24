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
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Check if the error is a 401 (Unauthorized)
        if (error.response?.status === 401) {
            // Skip token removal for email service related errors
            const url = error.config?.url || '';
            const isEmailServiceError = 
                url.includes('email') || 
                url.includes('confirmation') ||
                (error.response?.data?.message && 
                 error.response.data.message.includes('car details'));
            
            if (!isEmailServiceError) {
                // Clear token on 401 Unauthorized (only for non-email errors)
            localStorage.removeItem('token');
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
                }
            } else {
                // Just log email service errors but don't log the user out
                console.warn('Email service error occurred:', error.response?.data?.message);
            }
        }
        return Promise.reject(error);
    }
);

export default api; 