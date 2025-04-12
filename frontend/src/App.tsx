import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import theme from './theme'
import './App.css'

// Components
import HomePage from './components/home/HomePage'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Dashboard from './components/dashboard/Dashboard'
import UserDashboard from './components/dashboard/UserDashboard'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Profile from './components/profile/Profile'
import MapView from './components/map/MapView'
import MyBookings from './components/bookings/MyBookings'

// Admin components
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import CarManagement from './components/admin/CarManagement'
import UserManagement from './components/admin/UserManagement'
import BookingManagement from './components/admin/BookingManagement'
import Analytics from './components/admin/Analytics'

// Auth Context
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* User routes */}
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="cars" element={<MapView />} />
                    <Route path="bookings" element={<MyBookings />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="stats" element={<UserDashboard />} />
                  </Routes>
                </ProtectedRoute>
              } />

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="cars" element={<CarManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="bookings" element={<BookingManagement />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
