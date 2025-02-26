import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import theme from './theme'
import './App.css'
import HomePage from './components/home/HomePage'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Dashboard from './components/dashboard/Dashboard'
import UserDashboard from './components/dashboard/UserDashboard'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Profile from './components/profile/Profile'
import MapView from './components/map/MapView'
import MyBookings from './components/bookings/MyBookings'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
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

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
