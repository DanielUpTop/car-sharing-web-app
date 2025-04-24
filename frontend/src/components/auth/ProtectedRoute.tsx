import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    console.log(`[ProtectedRoute] Checking route: ${location.pathname}. Loading: ${loading}, IsAuth: ${isAuthenticated}, User: ${user ? user.email : 'null'}`);

    // Show loading state
    if (loading) {
        console.log(`[ProtectedRoute] Showing loading spinner for ${location.pathname}`);
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    // If there's no user, redirect to login
    if (!isAuthenticated || !user) {
        console.error(`[ProtectedRoute] <<<< UNAUTHENTICATED >>>> for route ${location.pathname}. IsAuth: ${isAuthenticated}, User: ${user ? 'exists' : 'null'}. Redirecting to /login.`);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check admin access
    if (requireAdmin && user.role !== 'admin') {
        console.warn(`[ProtectedRoute] Admin access required for ${location.pathname}, user role is ${user.role}. Redirecting to /dashboard.`);
        return <Navigate to="/dashboard" replace />;
    }

    console.log(`[ProtectedRoute] Access granted for ${location.pathname}`);
    return <>{children}</>;
};

export default ProtectedRoute; 