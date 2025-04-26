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
    const { isAuthenticated, loading, user } = useAuth();

    console.log('[ProtectedRoute] Checking access...', {
        isAuthenticated,
        loading,
        userEmail: user?.email,
        userRole: user?.role,
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

    // Check authentication first
    if (!isAuthenticated || !user) {
        console.error('[ProtectedRoute] Access denied: Not authenticated', {
            isAuthenticated,
            hasUser: !!user
        });
        return <Navigate to="/login" replace />;
    }

    // Check if admin access is required
    if (requireAdmin && user.role !== 'admin') {
        console.error('[ProtectedRoute] Access denied: Admin role required', {
            userRole: user.role
        });
        return <Navigate to="/dashboard" replace />;
    }

    // Check role-based access
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.error('[ProtectedRoute] Access denied: Role not allowed', {
            userRole: user.role,
            allowedRoles
        });
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute; 