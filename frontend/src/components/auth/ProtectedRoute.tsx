import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
    const { user, token, isAdmin } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const authState = {
            hasUser: !!user,
            hasToken: !!token,
            userRole: user?.role,
            requireAdmin,
            isAdminUser: isAdmin(),
            path: location.pathname
        };
        console.log('ProtectedRoute state:', authState);
    }, [user, token, requireAdmin, location]);

    // If there's no token or user, redirect to login
    if (!token || !user) {
        console.log('No authentication, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check admin access
    if (requireAdmin) {
        const adminCheck = isAdmin();
        console.log('Admin check:', { requireAdmin, isAdmin: adminCheck, userRole: user.role });
        
        if (!adminCheck) {
            console.log('Admin access denied, redirecting to dashboard');
            return <Navigate to="/dashboard" replace />;
        }
    }

    console.log('Access granted:', { path: location.pathname, userRole: user.role });
    return <>{children}</>;
};

export default ProtectedRoute; 