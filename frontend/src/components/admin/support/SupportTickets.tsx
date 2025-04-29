import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Chip,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Message as MessageIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Send as SendIcon,
  PriorityHigh as PriorityHighIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

// Define interfaces for our data types
interface SupportTicket {
  id: number;
  user_id: number;
  user_name: string;
  subject: string;
  status: 'open' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
  last_reply_at: string | null;
  last_reply_by: 'user' | 'admin' | null;
  description: string;
}

interface Message {
  id: number;
  ticket_id: number;
  user_id: number | null;
  admin_id: number | null;
  is_admin: boolean;
  message: string;
  created_at: string;
  attachments: string[] | null;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  membership_type?: string;
  role: string;
}

const SupportTickets: React.FC = () => {
  const navigate = useNavigate();
  
  // State variables
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketUser, setTicketUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Resolution dialog state
  const [resolutionDialog, setResolutionDialog] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'closed'>('resolved');
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Check API configuration on component mount
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    console.log('API URL configuration:', apiUrl);
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      setSnackbar({
        open: true,
        message: 'Authentication token missing. Please log in again.',
        severity: 'error'
      });
    }
  }, []);

  // Fetch tickets on component mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Update filtered tickets when filters change
  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter, priorityFilter, tabValue]);

  // Fetch ticket data
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      
      console.log('Fetching tickets with token:', token.substring(0, 15) + '...');
      
      // Make a debug request to check our auth status
      try {
        const authCheckResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/check`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const authData = await authCheckResponse.json().catch(() => ({}));
        console.log('Auth check result:', authCheckResponse.status, authData);
      } catch (authErr) {
        console.warn('Auth check failed:', authErr);
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Log the full response for debugging
      console.log('Tickets response status:', response.status);
      console.log('Tickets response headers:', Object.fromEntries([...response.headers.entries()]));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', response.status, errorData);
        throw new Error(`Failed to fetch tickets: ${response.status} ${errorData.message || ''}`);
      }
      
      const data = await response.json();
      console.log('Tickets data received:', data);
      
      if (!Array.isArray(data)) {
        console.error('Expected array of tickets but received:', typeof data, data);
        throw new Error('Invalid ticket data format received');
      }
      
      // Map the data to match our interface
      const formattedTickets = data.map((ticket: any) => ({
        id: ticket.id,
        user_id: ticket.user_id || (ticket.user && ticket.user.id),
        user_name: ticket.user_name || (ticket.user && `${ticket.user.first_name} ${ticket.user.last_name}`),
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status === 'in_progress' ? 'open' : ticket.status,
        priority: ticket.priority,
        category: ticket.category || 'General',
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        last_reply_at: ticket.last_reply_at || null,
        last_reply_by: ticket.last_reply_by || null
      }));
      
      setTickets(formattedTickets);
      setFilteredTickets(formattedTickets);
      
      // If a ticket was previously selected, update its data
      if (selectedTicket) {
        const updatedSelectedTicket = formattedTickets.find((t: SupportTicket) => t.id === selectedTicket.id);
        if (updatedSelectedTicket) {
          setSelectedTicket(updatedSelectedTicket);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching tickets');
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to fetch tickets',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets based on search term and filters
  const filterTickets = () => {
    let filtered = [...tickets];
    
    // Filter by tab
    if (tabValue === 1) {
      filtered = filtered.filter(ticket => ticket.status === 'open');
    } else if (tabValue === 2) {
      filtered = filtered.filter(ticket => ticket.status === 'resolved' || ticket.status === 'closed');
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        ticket =>
          ticket.subject.toLowerCase().includes(term) ||
          ticket.user_name.toLowerCase().includes(term) ||
          ticket.id.toString().includes(term)
      );
    }
    
    setFilteredTickets(filtered);
  };

  // Fetch user details
  const fetchTicketUser = async (userId: number) => {
    try {
      console.log('Fetching user details for ID:', userId);
      const token = localStorage.getItem('token');
      
      // Use the admin user endpoint from adminUserRoutes.js
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch user details, status:', response.status);
        throw new Error(`Failed to fetch user details: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('User data received:', data);
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid user data received');
      }
      
      // Set user data with the structure received from the API
      setTicketUser({
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || '',
        membership_type: data.membership_type || data.membership_status || '',
        role: data.role
      });
    } catch (err) {
      console.error('Error fetching user details:', err);
      setSnackbar({
        open: true,
        message: 'Could not load user details. Please try again.',
        severity: 'warning'
      });
      
      // Optionally, try again after a short delay
      setTimeout(() => {
        if (selectedTicket) {
          fetchTicketUser(selectedTicket.user_id);
        }
      }, 3000); // Try again after 3 seconds
    }
  };

  // Handle ticket resolution
  const handleResolveTicket = async () => {
    if (!selectedTicket || !resolutionMessage.trim()) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // First send the final resolution message
      const messageResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: resolutionMessage,
          is_admin: true,
          is_resolution: true
        })
      });
      
      if (!messageResponse.ok) {
        throw new Error('Failed to send resolution message');
      }
      
      // Then update the ticket status
      const statusResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/support/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: resolutionStatus,
          priority: selectedTicket.priority
        })
      });
      
      if (!statusResponse.ok) {
        throw new Error('Failed to update ticket status');
      }
      
      // Update local state
      setSelectedTicket({
        ...selectedTicket,
        status: resolutionStatus
      });
      
      // Reset state
      setResolutionMessage('');
      setResolutionDialog(false);
      
      // Refresh data
      await fetchTickets();
      
      setSnackbar({
        open: true,
        message: `Ticket marked as ${resolutionStatus} with resolution message`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error resolving ticket:', err);
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to resolve ticket',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a ticket
  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await fetchTicketUser(ticket.user_id);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get status chip color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'error';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get priority chip color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  // Render loading spinner
  if (loading && tickets.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar position="fixed" color="default">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/admin/dashboard')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Support Tickets Management
          </Typography>
          <Button 
            color="inherit" 
            startIcon={<RefreshIcon />}
            onClick={fetchTickets}
          >
            Refresh
          </Button>
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* For spacing below AppBar */}
      
      <Container maxWidth="xl" sx={{ mt: 2, mb: 8 }}>
        {/* Add the main title here */}
        <Typography variant="h4" gutterBottom sx={{ color: 'black', mb: 3 }}>
          Support Tickets Management
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* Tickets List */}
          <Grid item xs={12} md={selectedTicket ? 5 : 12}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" display="flex" alignItems="center" sx={{ color: 'black' }}>
                  <ConfirmationNumberIcon sx={{ mr: 1 }} />
                  Support Tickets
                </Typography>
                <Box display="flex" alignItems="center">
                  <TextField
                    placeholder="Search tickets..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mr: 1 }}
                    InputProps={{
                      startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5 }} />
                    }}
                  />
                </Box>
              </Box>
              
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs 
                  value={tabValue} 
                  onChange={(_, newValue) => setTabValue(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="All Tickets" />
                  <Tab label="Open" />
                  <Tab label="Resolved/Closed" />
                </Tabs>
              </Box>
              
              <Box display="flex" gap={1} mb={2}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={priorityFilter}
                    label="Priority"
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Priorities</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {filteredTickets.length === 0 ? (
                <Alert severity="info">
                  No tickets match your current filters.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Last Updated</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow 
                          key={ticket.id}
                          hover
                          onClick={() => handleSelectTicket(ticket)}
                          selected={selectedTicket?.id === ticket.id}
                          sx={{ 
                            cursor: 'pointer',
                            bgcolor: ticket.status === 'open' 
                              ? 'rgba(255, 235, 59, 0.1)' 
                              : 'inherit'
                          }}
                        >
                          <TableCell>#{ticket.id}</TableCell>
                          <TableCell>{ticket.subject}</TableCell>
                          <TableCell>{ticket.user_name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={ticket.status.replace('_', ' ')} 
                              size="small"
                              color={getStatusColor(ticket.status) as any}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={ticket.priority} 
                              size="small"
                              color={getPriorityColor(ticket.priority) as any}
                            />
                          </TableCell>
                          <TableCell>
                            {formatDate(ticket.updated_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
          
          {/* Selected Ticket Details */}
          {selectedTicket && (
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h5">
                      #{selectedTicket.id}: {selectedTicket.subject}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created {formatDate(selectedTicket.created_at)}
                    </Typography>
                  </Box>
                  <Button 
                    variant="outlined" 
                    onClick={() => setResolutionDialog(true)}
                    disabled={selectedTicket.status !== 'open'}
                  >
                    {selectedTicket.status === 'open' ? 'Resolve Ticket' : 'View Details'}
                  </Button>
                </Box>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardHeader 
                        title="Ticket Info" 
                        titleTypographyProps={{ variant: 'subtitle1' }}
                        avatar={<ConfirmationNumberIcon />}
                      />
                      <CardContent sx={{ pt: 0 }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">Status:</Typography>
                          <Chip 
                            label={selectedTicket.status.replace('_', ' ')} 
                            size="small"
                            color={getStatusColor(selectedTicket.status) as any}
                          />
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">Priority:</Typography>
                          <Chip 
                            label={selectedTicket.priority} 
                            size="small"
                            color={getPriorityColor(selectedTicket.priority) as any}
                          />
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">Category:</Typography>
                          <Typography variant="body2">{selectedTicket.category}</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardHeader 
                        title="User Info" 
                        titleTypographyProps={{ variant: 'subtitle1' }}
                        avatar={<PersonIcon />}
                      />
                      <CardContent sx={{ pt: 0 }}>
                        {ticketUser ? (
                          <>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" color="text.secondary">Name:</Typography>
                              <Typography variant="body2">{ticketUser.first_name} {ticketUser.last_name}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" color="text.secondary">Email:</Typography>
                              <Typography variant="body2">{ticketUser.email}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" color="text.secondary">Membership:</Typography>
                              <Typography variant="body2">
                                {ticketUser.membership_type || 'None'}
                              </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" color="text.secondary">Role:</Typography>
                              <Typography variant="body2">
                                {ticketUser.role || 'User'}
                              </Typography>
                            </Box>
                          </>
                        ) : (
                          <>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                              <CircularProgress size={24} sx={{ mb: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                Loading user details...
                              </Typography>
                              {error && (
                                <Alert severity="error" sx={{ mt: 1, width: '100%' }}>
                                  Failed to load user information
                                </Alert>
                              )}
                              <Button 
                                size="small" 
                                onClick={() => selectedTicket && fetchTicketUser(selectedTicket.user_id)}
                                sx={{ mt: 1 }}
                              >
                                Retry
                              </Button>
                            </Box>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                <Card variant="outlined" sx={{ mb: 2, flexGrow: 1 }}>
                  <CardHeader 
                    title="Ticket Description" 
                    titleTypographyProps={{ variant: 'subtitle1' }}
                  />
                  <CardContent>
                    <Typography variant="body2">
                      {selectedTicket.description}
                    </Typography>
                  </CardContent>
                </Card>
                
                {selectedTicket.status === 'open' ? (
                  <Box display="flex" justifyContent="space-between">
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        setResolutionStatus('resolved');
                        setResolutionDialog(true);
                      }}
                      startIcon={<CheckCircleIcon />}
                    >
                      Mark Resolved
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setResolutionStatus('closed');
                        setResolutionDialog(true);
                      }}
                      startIcon={<CancelIcon />}
                    >
                      Close Ticket
                    </Button>
                  </Box>
                ) : (
                  <Alert severity={selectedTicket.status === 'resolved' ? 'success' : 'warning'}>
                    This ticket is {selectedTicket.status}. The user has been notified with a final resolution message.
                  </Alert>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Container>
      
      {/* Resolution Dialog */}
      <Dialog open={resolutionDialog} onClose={() => setResolutionDialog(false)}>
        <DialogTitle>
          {resolutionStatus === 'resolved' ? 'Resolve Ticket' : 'Close Ticket'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a final resolution message to the user. 
            This will be the only message they see, and no further responses will be accepted.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Enter your resolution message to the user..."
            value={resolutionMessage}
            onChange={(e) => setResolutionMessage(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolutionDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleResolveTicket} 
            variant="contained" 
            color={resolutionStatus === 'resolved' ? 'success' : 'error'}
            disabled={!resolutionMessage.trim()}
          >
            {resolutionStatus === 'resolved' ? 'Mark as Resolved' : 'Close Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SupportTickets; 