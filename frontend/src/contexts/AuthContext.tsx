import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    status: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: () => {},
    logout: () => {},
    isAdmin: () => false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [initialized, setInitialized] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Initialize auth state from localStorage
    useEffect(() => {
        try {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            
            if (savedToken && savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setToken(savedToken);
                setUser(parsedUser);
                console.log('Initialized auth state from localStorage:', {
                    token: savedToken,
                    user: parsedUser
                });
            }
        } catch (error) {
            console.error('Error initializing auth state:', error);
            // Clear potentially corrupted data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } finally {
            setInitialized(true);
        }
    }, []);

    const login = (newToken: string, userData: User) => {
        console.log('Login called with:', { token: newToken, user: userData });
        
        // Validate input
        if (!newToken || !userData) {
            console.error('Invalid login data');
            return;
        }

        // Update localStorage
        try {
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Update state
            setToken(newToken);
            setUser(userData);
            
            console.log('Auth state updated successfully');
        } catch (error) {
            console.error('Error updating auth state:', error);
        }
    };

    const logout = () => {
        console.log('Logging out...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const isAdmin = () => {
        const isAdminUser = user?.role === 'admin';
        console.log('isAdmin check:', { user, isAdmin: isAdminUser });
        return isAdminUser;
    };

    if (!initialized) {
        return null; // or a loading spinner
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}; 