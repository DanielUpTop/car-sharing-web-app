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
import VerifyEmail from './components/auth/VerifyEmail'
import Dashboard from './components/dashboard/Dashboard'
import UserDashboard from './components/dashboard/UserDashboard'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Profile from './components/profile/Profile'
import MapView from './components/map/MapView'
import MyBookings from './components/bookings/MyBookings'
import EnhancedProfile from './components/profile/EnhancedProfile'
import InsuranceView from './components/insurance/InsuranceView'
import MembershipView from './components/membership/MembershipView'
import HelpCenter from './components/help/HelpCenter'
import EnhancedChat from './components/chat/EnhancedChat'
import AdminChat from './components/admin/AdminChat'
import PaymentCompletion from './components/payments/PaymentCompletion'

// Admin components
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import CarManagement from './components/admin/CarManagement'
import UserManagement from './components/admin/UserManagement'
import BookingManagement from './components/admin/BookingManagement'
import Analytics from './components/admin/Analytics'
import ChatArchive from './components/admin/chat/ChatArchive'
import SupportTickets from './components/admin/support/SupportTickets'
import AdminHelpCenter from './components/admin/help/AdminHelpCenter'
import MembershipManagement from './components/admin/MembershipManagement'
import InsuranceManagement from './components/admin/InsuranceManagement'

// Auth Context
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/completion" element={<PaymentCompletion />} />

              {/* User routes */}
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="cars" element={<MapView />} />
                    <Route path="bookings" element={<MyBookings />} />
                    <Route path="profile" element={<EnhancedProfile />} />
                    <Route path="stats" element={<UserDashboard />} />
                    <Route path="insurance" element={<InsuranceView />} />
                    <Route path="membership" element={<MembershipView />} />
                    <Route path="help" element={<HelpCenter />} />
                    <Route path="chat" element={<EnhancedChat />} />
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
                <Route path="members" element={<MembershipManagement />} />
                <Route path="insurance" element={<InsuranceManagement />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="chat" element={<AdminChat />} />
                <Route path="chat-archive" element={<ChatArchive />} />
                <Route path="tickets" element={<SupportTickets />} />
                <Route path="help/manage" element={<AdminHelpCenter />} />
                <Route path="help/analytics" element={<Analytics />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
