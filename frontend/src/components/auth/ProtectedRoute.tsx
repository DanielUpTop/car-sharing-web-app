import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, requireAdmin }) => {
    const { isAuthenticated, loading, user, token } = useAuth();

    console.log('[ProtectedRoute] Checking access...', {
        isAuthenticated,
        loading,
        userEmail: user?.email,
        userRole: user?.role,
        hasToken: !!token,
        allowedRoles,
        requireAdmin,
        hasUser: !!user
    });

    if (loading) {
        console.log('[ProtectedRoute] Still loading auth state...');
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated || !user) {
        if (!token) {
            console.error('[ProtectedRoute] Access denied: Not authenticated and no token found.');
            return <Navigate to="/login" replace />;
        } else {
            console.warn('[ProtectedRoute] Not authenticated but token exists. Waiting briefly (showing spinner). State might be updating...');
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                    <CircularProgress />
                </Box>
            );
        }
    }

    if (requireAdmin && user.role !== 'admin') {
        console.error('[ProtectedRoute] Access denied: Admin role required', {
            userRole: user.role
        });
        return <Navigate to="/dashboard" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.error('[ProtectedRoute] Access denied: Role not allowed', {
            userRole: user.role,
            allowedRoles
        });
        return <Navigate to="/dashboard" replace />;
    }

    console.log('[ProtectedRoute] Access granted.');
    return <>{children}</>;
};

export default ProtectedRoute; 