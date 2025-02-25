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

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
                path="/dashboard" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/cars" 
                element={
                    <ProtectedRoute>
                        <CarList />
                    </ProtectedRoute>
                } 
            />
            <Route path="/bookings" element={
                <ProtectedRoute>
                    <MyBookings />
                </ProtectedRoute>
            } />
            <Route path="/profile" element={
                <ProtectedRoute>
                    <Profile />
                </ProtectedRoute>
            } />
            <Route path="/user-dashboard" element={
                <ProtectedRoute>
                    <UserDashboard />
                </ProtectedRoute>
            } />
        </Routes>
    );
};

export default AppRoutes; 