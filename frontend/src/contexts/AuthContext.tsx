import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: () => boolean;
    error: string | null;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Export the useAuth hook
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await api.get('/api/auth/verify-token');
            setUser(response.data.user);
            setError(null);
        } catch (error) {
            console.error('<<<< AuthContext: checkAuth FAILED! Clearing token and user. Error:', error);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setError('Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setError(null);
            const response = await api.post('/api/auth/login', { email, password });
            const { token: newToken, user } = response.data;
            
            if (!newToken || !user) {
                throw new Error('Invalid response from server');
            }

            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(user);
            setError(null);

            // Return the user role so the component can handle navigation
            return user.role;
        } catch (error: any) {
            console.error('Login failed:', error);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            
            const errorMessage = error.response?.data?.message || error.message || 'Failed to login';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const logout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setError(null);
            window.location.href = '/login';
        }
    };

    const isAdmin = () => {
        return user?.role === 'admin';
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                isAuthenticated: !!user,
                isAdmin,
                error,
                token
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}; 