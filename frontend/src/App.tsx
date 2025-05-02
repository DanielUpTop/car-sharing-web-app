import React, { useEffect, useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import theme from './theme'
import './App.css'
import { Toaster } from 'react-hot-toast'
import { toast } from 'react-hot-toast'
import InfoIcon from '@mui/icons-material/Info'
import { AuthProvider, useAuth } from './contexts/AuthContext'

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
import CarDetailView from './components/cars/CarDetailView'
import RewardsPage from './components/rewards/RewardsPage'

// Admin components
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import CarManagement from './components/admin/CarManagement'
import UserManagement from './pages/Admin/UserManagement'
import BookingManagement from './components/admin/BookingManagement'
import Analytics from './components/admin/Analytics'
import ChatArchive from './components/admin/chat/ChatArchive'
import SupportTickets from './components/admin/support/SupportTickets'
import AdminHelpCenter from './components/admin/help/AdminHelpCenter'
import MembershipManagement from './components/admin/MembershipManagement'
import InsuranceManagement from './components/admin/InsuranceManagement'
import RewardManagement from './pages/Admin/RewardManagement'

// New component to handle query parameters globally
const QueryParamHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading } = useAuth(); // Removed checkAuthStatus as it doesn't exist

  useEffect(() => {
    // Avoid processing if auth state is loading or no relevant path/params
    if (loading || (!location.search && location.pathname !== '/memberships/success')) {
        console.log('[QueryParamHandler] Skipping processing (loading or no relevant search params/path).');
        return;
    }
    console.log('[QueryParamHandler] Processing:', location.pathname, location.search);

    const queryParams = new URLSearchParams(location.search);
    let shouldNavigate = false;
    let navigateTo = location.pathname; // Default to staying on current page
    let navigationOptions = { replace: true }; // Base options

    // --- Membership Success Handling ---
    if (location.pathname === '/memberships/success' && queryParams.has('session_id')) {
      const sessionId = queryParams.get('session_id');
      console.log('[QueryParamHandler] Membership Payment success detected via session_id:', sessionId);

      // TODO (Optional): Verify session_id with backend here.
      // The backend webhook should handle the actual membership update reliably.

      setTimeout(() => toast.success('Membership payment successful! Your details may take a moment to update.'), 100);

      // Removed call to non-existent checkAuthStatus.
      // Relying on navigation to /memberships and MembershipView re-fetching data.

      navigateTo = '/memberships';
      shouldNavigate = true;
      queryParams.delete('session_id');
      // Add state for potential use on the target page (optional)
      // Note: Linter might complain, but react-router supports this.
      // Cast navigationOptions to include state
      navigationOptions = { ...navigationOptions, state: { membershipSuccess: true } } as typeof navigationOptions & { state: { membershipSuccess: boolean } };

    }
    // --- Keep existing handlers for other scenarios ---
    else if (queryParams.has('cancelled')) { // Stripe Cancel URL param
      console.log('[QueryParamHandler] Payment cancellation detected.');
      setTimeout(() => toast('Payment process cancelled.', { icon: <InfoIcon color="info" /> }), 100);
      navigateTo = '/memberships'; // Go back to memberships page
      shouldNavigate = true;
      queryParams.delete('cancelled');
    } else if (queryParams.has('payment_failed')) { // Custom failure param (if used)
      console.log('[QueryParamHandler] Payment failure detected.');
      setTimeout(() => toast.error('Payment failed. Please try again or contact support.'), 100);
       navigateTo = '/memberships'; // Go back to memberships page
      shouldNavigate = true;
       queryParams.delete('payment_failed');
    } else if (queryParams.has('error')) { // Generic error param (if used)
      const errorType = queryParams.get('error') || 'Unknown error';
      console.log('[QueryParamHandler] Generic error detected:', errorType);
      setTimeout(() => toast.error(`An error occurred: ${decodeURIComponent(errorType)}. Please try again.`), 100);
       navigateTo = '/memberships'; // Go back to memberships page
       shouldNavigate = true;
       queryParams.delete('error');
    }
    // --- Deprecated/Alternative Flow Handler (Keep for now?) ---
    // This might be for a different payment flow (e.g., direct Payment Intents)
    // If '/dashboard/membership' is never the intended redirect, this can be removed later.
     else if (queryParams.has('payment_success')) {
      const type = queryParams.get('type') || 'item'; // Generic type
      console.log('[QueryParamHandler] Generic Payment success detected for type:', type);
      setTimeout(() => toast.success(`Successfully purchased ${type}!`), 100);
      // Original redirect was '/dashboard/membership', changing to '/memberships' for consistency,
      // but review if this flow is still needed and where it *should* go.
      navigateTo = '/memberships'; // Changed from '/dashboard/membership'
      shouldNavigate = true;
      queryParams.delete('payment_success');
      queryParams.delete('type');
    }

    // Construct the final path with any remaining query params
    const remainingParams = queryParams.toString();
    // Use navigateTo which might have been updated. If navigating away from /memberships/success, don't include it.
    const targetPath = (navigateTo === '/memberships/success' && shouldNavigate) ? location.pathname : navigateTo;
    const finalNavigatePath = targetPath + (remainingParams ? `?${remainingParams}` : '');

    // Only navigate if we explicitly decided to and the target is different
    if (shouldNavigate && finalNavigatePath !== location.pathname + location.search) {
      console.log(`[QueryParamHandler] Navigating from ${location.pathname}${location.search} to ${finalNavigatePath}`);
      setTimeout(() => navigate(finalNavigatePath, navigationOptions), 150);
    } else if (shouldNavigate) {
        console.log(`[QueryParamHandler] Already at target or no change needed: ${finalNavigatePath}`);
    } else {
      console.log('[QueryParamHandler] No navigation needed by this handler.');
    }

  }, [location.search, location.pathname, navigate, loading]); // Removed checkAuthStatus dependency

  return null; // This component doesn't render anything visible
};

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            <Toaster position="top-center" reverseOrder={false} />
            <QueryParamHandler />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/completion" element={<PaymentCompletion />} />
              <Route path="/memberships/success" element={<MembershipSuccessRedirecting />} />

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
                    <Route path="rewards" element={<RewardsPage />} />
                  </Routes>
                </ProtectedRoute>
              } />

              {/* Changed route path from /dashboard/membership to /memberships */}
              <Route path="/memberships" element={
                <ProtectedRoute>
                  <MembershipView />
                </ProtectedRoute>
              } />

              {/* Add specific car detail route - PROTECTED */}
              <Route 
                  path="/cars/:id" 
                  element={
                      <ProtectedRoute>
                          <CarDetailView />
                      </ProtectedRoute>
                  }
              />

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
                <Route path="rewards" element={<RewardManagement />} />
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

// Simple component to show while redirecting from /memberships/success
// You might want to style this or add a loading indicator
const MembershipSuccessRedirecting = () => {
    return (
        <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
            Processing membership update...
        </div>
    );
};

export default App
