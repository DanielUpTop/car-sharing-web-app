import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import Dashboard from '../components/dashboard/Dashboard';
import CarList from '../components/cars/CarList';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import MyBookings from '../components/bookings/MyBookings';
import Profile from '../components/profile/Profile';
import UserDashboard from '../components/dashboard/UserDashboard';
import PaymentComplete from '../components/payments/PaymentComplete';
import MembershipView from '../components/membership/MembershipView';
import InsuranceView from '../components/insurance/InsuranceView';
import RewardsPage from '../components/rewards/RewardsPage';
import AdminLayout from '../components/admin/AdminLayout';
import AdminDashboard from '../components/admin/AdminDashboard';
import MembershipManagement from '../components/admin/MembershipManagement';
import SupportTickets from '../components/admin/support/SupportTickets';
import InsuranceManagement from '../components/admin/InsuranceManagement';
import UserManagement from '../pages/Admin/UserManagement';

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
                path="/dashboard" 
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            <Route 
                path="/dashboard/cars" 
                element={<ProtectedRoute><CarList /></ProtectedRoute>}
            />
            <Route 
                path="/dashboard/bookings" 
                element={<ProtectedRoute><MyBookings /></ProtectedRoute>}
            />
            <Route 
                path="/dashboard/profile" 
                element={<ProtectedRoute><Profile /></ProtectedRoute>}
            />
            <Route 
                path="/dashboard/stats" 
                element={<ProtectedRoute><UserDashboard /></ProtectedRoute>}
            />
            <Route 
                path="/dashboard/membership" 
                element={<ProtectedRoute><MembershipView /></ProtectedRoute>}
            />
            <Route 
                path="/dashboard/insurance" 
                element={<ProtectedRoute><InsuranceView /></ProtectedRoute>}
            />
            <Route 
                path="/dashboard/rewards" 
                element={<ProtectedRoute><RewardsPage /></ProtectedRoute>}
            />
            <Route 
                path="/payment/complete" 
                element={<ProtectedRoute><PaymentComplete /></ProtectedRoute>}
            />
            
            {/* Routes managed by AdminLayout */}
            <Route 
                path="/admin" 
                element={<AdminLayout />}
            >
                <Route 
                    index 
                    element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} 
                />
                <Route 
                    path="memberships" 
                    element={<ProtectedRoute allowedRoles={["admin"]}><SupportTickets /></ProtectedRoute>}
                />
                <Route 
                    path="members" 
                    element={<ProtectedRoute allowedRoles={["admin"]}><MembershipManagement /></ProtectedRoute>}
                />
                <Route 
                    path="users" 
                    element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} 
                />
                <Route 
                    path="tickets" 
                    element={<ProtectedRoute allowedRoles={["admin"]}><SupportTickets /></ProtectedRoute>} 
                />
                <Route 
                    path="insurance" 
                    element={<ProtectedRoute allowedRoles={["admin"]}><InsuranceManagement /></ProtectedRoute>} 
                />
            </Route>
        </Routes>
    );
};

export default AppRoutes; 