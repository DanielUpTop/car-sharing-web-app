import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    token: string | null;
    login: (email: string, password: string) => Promise<string>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const login = async (email: string, password: string): Promise<string> => {
        try {
            console.log('[AuthContext] Attempting login for:', email);
            const response = await axios.post('http://localhost:5001/api/auth/login', {
                email,
                password
            });

            const { token, user } = response.data;
            
            // Set up axios defaults for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            console.log('[AuthContext] Login successful:', user);
            
            return user.role;
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        console.log('[AuthContext] Logged out');
    };

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    // Set up axios defaults
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    
                    // Try to parse stored user first
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    
                    // Verify token in background
                    try {
                        await axios.get('http://localhost:5001/api/auth/verify-token');
                        console.log('[AuthContext] Token verified successfully');
                    } catch (error: any) {
                        console.error('[AuthContext] Token verification failed:', error.response?.status);
                        if (error.response?.status === 401 || error.response?.status === 404) {
                            console.log('[AuthContext] Invalid token, logging out');
                            logout();
                        }
                    }
                } catch (error) {
                    console.error('[AuthContext] Failed to initialize auth:', error);
                    logout();
                }
            } else {
                setLoading(false);
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        token: localStorage.getItem('token'),
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext; 