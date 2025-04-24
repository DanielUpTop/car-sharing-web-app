import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Tabs,
    Tab,
    CircularProgress,
    Alert,
    List,
    ListItem,
    ListItemText,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    FormHelperText,
    Paper,
    Divider,
    useTheme,
    Avatar,
    AppBar,
    Toolbar,
    IconButton
} from '@mui/material';
import { format } from 'date-fns';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import GavelIcon from '@mui/icons-material/Gavel';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';

interface Policy {
    id: number;
    coverage_type: string;
    coverage_amount: number;
    start_date: string;
    end_date: string | null;
    status: string;
    booking_start: string;
    booking_end: string;
    make: string;
    model: string;
}

interface Claim {
    id: number;
    policy_id: number;
    incident_date: string;
    description: string;
    claim_amount: number;
    status: string;
    coverage_type: string;
    coverage_amount: number;
    make: string;
    model: string;
}

// Add interface for creating a new policy
interface BookingOption {
    id: number;
    car_make: string;
    car_model: string;
    start_date: string;
    end_date: string;
}

// Add error boundary component
class InsuranceErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Insurance component error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    <Alert severity="error" sx={{ mb: 3 }}>
                        <Typography variant="h5" gutterBottom>Something went wrong</Typography>
                        <Typography variant="body1">{this.state.error?.message}</Typography>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={() => window.location.reload()}
                            sx={{ mt: 2 }}
                        >
                            Reload Page
                        </Button>
                    </Alert>
                </Container>
            );
        }

        return this.props.children;
    }
}

const InsuranceView = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openNewClaim, setOpenNewClaim] = useState(false);
    const [openNewPolicy, setOpenNewPolicy] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [availableBookings, setAvailableBookings] = useState<BookingOption[]>([]);
    const [policyForm, setPolicyForm] = useState({
        booking_id: '',
        coverage_type: 'basic', // default value
        coverage_amount: '500' // default value
    });
    const [claimForm, setClaimForm] = useState({
        incident_date: '',
        description: '',
        claim_amount: ''
    });

    useEffect(() => {
        fetchPoliciesAndClaims();
    }, []);

    const fetchPoliciesAndClaims = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error('No token found in localStorage');
                setError('Please log in to view insurance data');
                return;
            }

            console.log('Making API calls to:', {
                policiesUrl: `${import.meta.env.VITE_API_URL}/api/insurance/policies`,
                claimsUrl: `${import.meta.env.VITE_API_URL}/api/insurance/claims`,
                token: token.substring(0, 10) + '...' // Log first 10 chars of token for debugging
            });

            const [policiesRes, claimsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/api/insurance/policies`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${import.meta.env.VITE_API_URL}/api/insurance/claims`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            console.log('API responses:', {
                policies: {
                    status: policiesRes.status,
                    statusText: policiesRes.statusText
                },
                claims: {
                    status: claimsRes.status,
                    statusText: claimsRes.statusText
                }
            });

            if (!policiesRes.ok || !claimsRes.ok) {
                const policiesError = await policiesRes.text();
                const claimsError = await claimsRes.text();
                console.error('API errors:', { policiesError, claimsError });
                throw new Error(
                    !policiesRes.ok 
                        ? `Failed to fetch policies: ${policiesRes.status} ${policiesRes.statusText}`
                        : `Failed to fetch claims: ${claimsRes.status} ${claimsRes.statusText}`
                );
            }

            const [policiesData, claimsData] = await Promise.all([
                policiesRes.json(),
                claimsRes.json()
            ]);

            console.log('API data:', { policiesData, claimsData });

            setPolicies(policiesData);
            setClaims(claimsData);
        } catch (err) {
            console.error('Error in fetchPoliciesAndClaims:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while fetching insurance data');
        } finally {
            setLoading(false);
        }
    };

    // Add function to fetch available bookings
    const fetchAvailableBookings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error('No token found in localStorage');
                setError('Please log in to view available bookings');
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/active`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
            }

            const bookings = await response.json();
            setAvailableBookings(bookings);
            setOpenNewPolicy(true);
        } catch (err) {
            console.error('Error fetching available bookings:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while fetching available bookings');
        } finally {
            setLoading(false);
        }
    };

    // Add function to handle policy creation
    const handleCreatePolicy = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/insurance/policies`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    booking_id: Number(policyForm.booking_id),
                    coverage_type: policyForm.coverage_type,
                    coverage_amount: Number(policyForm.coverage_amount)
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create policy: ${errorText}`);
            }

            await fetchPoliciesAndClaims();
            setOpenNewPolicy(false);
            setPolicyForm({
                booking_id: '',
                coverage_type: 'basic',
                coverage_amount: '500'
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create policy');
        }
    };

    const handleSubmitClaim = async () => {
        if (!selectedPolicy) return;

        try {
            // Validate the form data
            if (!claimForm.incident_date) {
                setError('Incident date is required');
                return;
            }

            if (!claimForm.description || claimForm.description.trim().length < 10) {
                setError('Description must be at least 10 characters long');
                return;
            }

            if (!claimForm.claim_amount || Number(claimForm.claim_amount) <= 0) {
                setError('Claim amount must be greater than 0');
                return;
            }

            // Format the date properly if needed
            const formattedDate = new Date(claimForm.incident_date).toISOString().split('T')[0];
            
            console.log('Submitting claim with data:', {
                policy_id: selectedPolicy.id,
                incident_date: formattedDate,
                description: claimForm.description,
                claim_amount: Number(claimForm.claim_amount)
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/insurance/claims`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    policy_id: selectedPolicy.id,
                    incident_date: formattedDate,
                    description: claimForm.description,
                    claim_amount: Number(claimForm.claim_amount)
                })
            });

            console.log('Claim response status:', response.status);
            const responseData = await response.text();
            console.log('Claim response data:', responseData);

            if (!response.ok) {
                throw new Error(`Failed to submit claim: ${responseData}`);
            }

            await fetchPoliciesAndClaims();
            setOpenNewClaim(false);
            setClaimForm({ incident_date: '', description: '', claim_amount: '' });
            setSelectedPolicy(null);
        } catch (err) {
            console.error('Error in handleSubmitClaim:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit claim');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'approved':
                return 'success';
            case 'pending':
                return 'warning';
            case 'expired':
            case 'rejected':
                return 'error';
            default:
                return 'default';
        }
    };

    // Add data sanitization helper
    const sanitizeNumber = (value: any): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return Number(value) || 0;
        return 0;
    };

    // Function to get policy type label and color
    const getPolicyTypeDetails = (type: string) => {
        switch (type.toLowerCase()) {
            case 'basic':
                return { 
                    label: 'Basic Coverage', 
                    color: theme.palette.info.main,
                    description: 'Basic liability protection for your rental'
                };
            case 'standard':
                return { 
                    label: 'Standard Coverage', 
                    color: theme.palette.success.main,
                    description: 'Comprehensive coverage for most incidents'
                };
            case 'premium':
                return { 
                    label: 'Premium Coverage', 
                    color: theme.palette.error.main,
                    description: 'Full protection with maximum benefits'
                };
            default:
                return { 
                    label: type, 
                    color: theme.palette.grey[500],
                    description: 'Insurance coverage for your rental'
                };
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column">
                <SecurityIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.7 }} />
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>Loading insurance information...</Typography>
            </Box>
        );
    }

    return (
        <InsuranceErrorBoundary>
            {/* Navbar */}
            <AppBar position="fixed">
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={() => navigate('/dashboard')}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Car Sharing Dashboard - Insurance
                    </Typography>
                    <IconButton color="inherit" onClick={handleLogout}>
                        <LogoutIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Toolbar /> {/* This empty Toolbar creates space below the AppBar */}
            
            <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
                <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                    <Box display="flex" alignItems="center" mb={2}>
                        <SecurityIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                        <Typography variant="h4" component="h1">
                            Insurance Management
                        </Typography>
                    </Box>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
                        Manage your insurance policies and claims for your car rentals. Protect your trips with our comprehensive coverage options.
                    </Typography>
                </Paper>

                <Paper elevation={1} sx={{ borderRadius: 2, mb: 4 }}>
                    <Tabs 
                        value={tab} 
                        onChange={(_, newValue) => setTab(newValue)}
                        sx={{ 
                            borderBottom: 1, 
                            borderColor: 'divider',
                            '& .MuiTab-root': {
                                minHeight: 64,
                                fontSize: '1rem'
                            }
                        }}
                        variant="fullWidth"
                    >
                        <Tab 
                            label="My Policies" 
                            icon={<VerifiedUserIcon />} 
                            iconPosition="start"
                        />
                        <Tab 
                            label="My Claims" 
                            icon={<AssignmentIcon />} 
                            iconPosition="start"
                        />
                    </Tabs>

                    {error && (
                        <Alert severity="error" sx={{ m: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Policies Tab */}
                    {tab === 0 && (
                        <Box p={3}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" component="h2">
                                    {policies.length > 0 ? 'Your Insurance Policies' : 'No Policies Yet'}
                                </Typography>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    onClick={fetchAvailableBookings}
                                    startIcon={<AddCircleOutlineIcon />}
                                    sx={{ borderRadius: 2 }}
                                >
                                    New Policy
                                </Button>
                            </Box>

                            {policies.length === 0 && !loading && (
                                <Paper 
                                    elevation={0} 
                                    sx={{ 
                                        py: 5, 
                                        px: 3, 
                                        textAlign: 'center', 
                                        borderRadius: 2,
                                        bgcolor: 'background.default',
                                        border: '1px dashed',
                                        borderColor: 'divider'
                                    }}
                                >
                                    <SecurityIcon sx={{ fontSize: 70, color: 'text.secondary', mb: 2, opacity: 0.6 }} />
                                    <Typography variant="h6" gutterBottom>No Insurance Policies Found</Typography>
                                    <Typography variant="body1" color="textSecondary" paragraph>
                                        You don't have any active insurance policies yet. You need to have an active booking to purchase insurance.
                                    </Typography>
                                    <Button 
                                        variant="outlined" 
                                        color="primary" 
                                        onClick={() => window.location.href = '/dashboard/cars'}
                                        sx={{ mt: 2, borderRadius: 2 }}
                                    >
                                        Browse Cars to Book
                                    </Button>
                                </Paper>
                            )}

                            <Grid container spacing={3}>
                                {policies.map((policy) => {
                                    const policyTypeDetails = getPolicyTypeDetails(policy.coverage_type);
                                    
                                    return (
                                        <Grid item xs={12} md={6} key={policy.id}>
                                            <Card 
                                                sx={{ 
                                                    height: '100%', 
                                                    display: 'flex', 
                                                    flexDirection: 'column',
                                                    borderRadius: 2,
                                                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: 6
                                                    }
                                                }}
                                                variant="outlined"
                                            >
                                                <Box 
                                                    sx={{ 
                                                        bgcolor: policyTypeDetails.color,
                                                        color: '#fff',
                                                        py: 1.5,
                                                        px: 2,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {policyTypeDetails.label}
                                                    </Typography>
                                                    <Chip
                                                        label={policy.status}
                                                        color={getStatusColor(policy.status)}
                                                        size="small"
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                </Box>
                                                
                                                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                                    <Box display="flex" alignItems="center" mb={2}>
                                                        <Avatar 
                                                            sx={{ 
                                                                bgcolor: 'background.default',
                                                                color: 'primary.main',
                                                                mr: 2
                                                            }}
                                                        >
                                                            <DirectionsCarIcon />
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="h6" component="div">
                                                                {policy.make} {policy.model}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Policy #{policy.id}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    
                                                    <Typography 
                                                        variant="body2" 
                                                        color="text.secondary" 
                                                        paragraph
                                                        sx={{ mb: 2 }}
                                                    >
                                                        {policyTypeDetails.description}
                                                    </Typography>
                                                    
                                                    <Divider sx={{ my: 2 }} />
                                                    
                                                    <List disablePadding>
                                                        <ListItem disablePadding sx={{ mb: 1 }}>
                                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                                <AttachMoneyIcon color="primary" fontSize="small" />
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary="Coverage Amount"
                                                                secondary={`$${sanitizeNumber(policy.coverage_amount).toFixed(2)}`}
                                                                primaryTypographyProps={{ variant: 'body2' }}
                                                                secondaryTypographyProps={{ 
                                                                    variant: 'subtitle1',
                                                                    fontWeight: 'bold',
                                                                    color: 'text.primary'
                                                                }}
                                                            />
                                                        </ListItem>
                                                        <ListItem disablePadding>
                                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                                <EventIcon color="primary" fontSize="small" />
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary="Booking Period"
                                                                secondary={`${format(new Date(policy.booking_start), 'MMM d, yyyy')} - ${format(new Date(policy.booking_end), 'MMM d, yyyy')}`}
                                                                primaryTypographyProps={{ variant: 'body2' }}
                                                                secondaryTypographyProps={{ variant: 'body2' }}
                                                            />
                                                        </ListItem>
                                                    </List>
                                                </CardContent>
                                                <CardActions sx={{ p: 2, pt: 0 }}>
                                                    <Button
                                                        fullWidth
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={() => {
                                                            setSelectedPolicy(policy);
                                                            setOpenNewClaim(true);
                                                        }}
                                                        disabled={policy.status !== 'active'}
                                                        startIcon={<GavelIcon />}
                                                        sx={{ borderRadius: 2 }}
                                                    >
                                                        File Claim
                                                    </Button>
                                                </CardActions>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    )}

                    {/* Claims Tab */}
                    {tab === 1 && (
                        <Box p={3}>
                            <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
                                {claims.length > 0 ? 'Your Insurance Claims' : 'No Claims Filed'}
                            </Typography>

                            {claims.length === 0 && !loading && (
                                <Paper 
                                    elevation={0} 
                                    sx={{ 
                                        py: 5, 
                                        px: 3, 
                                        textAlign: 'center', 
                                        borderRadius: 2,
                                        bgcolor: 'background.default',
                                        border: '1px dashed',
                                        borderColor: 'divider'
                                    }}
                                >
                                    <AssignmentIcon sx={{ fontSize: 70, color: 'text.secondary', mb: 2, opacity: 0.6 }} />
                                    <Typography variant="h6" gutterBottom>No Insurance Claims Found</Typography>
                                    <Typography variant="body1" color="textSecondary" paragraph>
                                        You haven't filed any insurance claims yet. If you need to report an incident, you can file a claim for an active policy.
                                    </Typography>
                                    {tab === 1 && policies.length > 0 && (
                                        <Button 
                                            variant="outlined" 
                                            color="primary" 
                                            onClick={() => setTab(0)}
                                            sx={{ mt: 2, borderRadius: 2 }}
                                        >
                                            View Your Policies
                                        </Button>
                                    )}
                                </Paper>
                            )}

                            <Grid container spacing={3}>
                                {claims.map((claim) => (
                                    <Grid item xs={12} md={6} key={claim.id}>
                                        <Card 
                                            sx={{ 
                                                height: '100%', 
                                                display: 'flex', 
                                                flexDirection: 'column',
                                                borderRadius: 2,
                                                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: 6
                                                }
                                            }}
                                            variant="outlined"
                                        >
                                            <Box 
                                                sx={{ 
                                                    bgcolor: getStatusColor(claim.status) + '.main',
                                                    color: '#fff',
                                                    py: 1.5,
                                                    px: 2,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    Claim #{claim.id}
                                                </Typography>
                                                <Chip
                                                    label={claim.status.toUpperCase()}
                                                    color={getStatusColor(claim.status)}
                                                    size="small"
                                                    sx={{ fontWeight: 'bold', bgcolor: '#fff' }}
                                                />
                                            </Box>
                                            
                                            <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                                <Box display="flex" alignItems="center" mb={2}>
                                                    <Avatar 
                                                        sx={{ 
                                                            bgcolor: 'background.default',
                                                            color: 'primary.main',
                                                            mr: 2
                                                        }}
                                                    >
                                                        <DirectionsCarIcon />
                                                    </Avatar>
                                                    <Typography variant="h6">
                                                        {claim.make} {claim.model}
                                                    </Typography>
                                                </Box>
                                                
                                                <Box 
                                                    sx={{ 
                                                        mt: 2, 
                                                        p: 2, 
                                                        bgcolor: 'background.default',
                                                        borderRadius: 1
                                                    }}
                                                >
                                                    <Box display="flex" alignItems="flex-start" mb={1}>
                                                        <DescriptionIcon 
                                                            fontSize="small" 
                                                            sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} 
                                                        />
                                                        <Box>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Description
                                                            </Typography>
                                                            <Typography variant="body1">
                                                                {claim.description}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                
                                                <Divider sx={{ my: 2 }} />
                                                
                                                <List disablePadding>
                                                    <ListItem disablePadding sx={{ mb: 1 }}>
                                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                                            <AttachMoneyIcon color="primary" fontSize="small" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary="Claim Amount"
                                                            secondary={`$${sanitizeNumber(claim.claim_amount).toFixed(2)}`}
                                                            primaryTypographyProps={{ variant: 'body2' }}
                                                            secondaryTypographyProps={{ 
                                                                variant: 'subtitle1',
                                                                fontWeight: 'bold',
                                                                color: 'text.primary'
                                                            }}
                                                        />
                                                    </ListItem>
                                                    <ListItem disablePadding sx={{ mb: 1 }}>
                                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                                            <EventIcon color="primary" fontSize="small" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary="Incident Date"
                                                            secondary={format(new Date(claim.incident_date), 'MMM d, yyyy')}
                                                            primaryTypographyProps={{ variant: 'body2' }}
                                                            secondaryTypographyProps={{ variant: 'body2' }}
                                                        />
                                                    </ListItem>
                                                    <ListItem disablePadding>
                                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                                            <LocalOfferIcon color="primary" fontSize="small" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary="Coverage"
                                                            secondary={`${claim.coverage_type} - $${sanitizeNumber(claim.coverage_amount).toFixed(2)}`}
                                                            primaryTypographyProps={{ variant: 'body2' }}
                                                            secondaryTypographyProps={{ variant: 'body2' }}
                                                        />
                                                    </ListItem>
                                                </List>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </Paper>

                {/* New Policy Dialog - enhanced */}
                <Dialog 
                    open={openNewPolicy} 
                    onClose={() => setOpenNewPolicy(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ pb: 1 }}>
                        <Box display="flex" alignItems="center">
                            <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                            Create New Insurance Policy
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Select a booking and coverage type to protect your rental experience.
                        </Typography>
                        
                        <FormControl fullWidth margin="normal">
                            <InputLabel id="booking-select-label">Select Booking</InputLabel>
                            <Select
                                labelId="booking-select-label"
                                value={policyForm.booking_id}
                                label="Select Booking"
                                onChange={(e) => setPolicyForm({
                                    ...policyForm,
                                    booking_id: e.target.value as string
                                })}
                            >
                                {availableBookings.length === 0 ? (
                                    <MenuItem disabled>No active bookings found</MenuItem>
                                ) : (
                                    availableBookings.map((booking) => (
                                        <MenuItem key={booking.id} value={booking.id}>
                                            {booking.car_make} {booking.car_model} - {format(new Date(booking.start_date), 'MMM d, yyyy')}
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                            <FormHelperText>Select a booking to insure</FormHelperText>
                        </FormControl>
                        
                        <FormControl fullWidth margin="normal">
                            <InputLabel id="coverage-type-label">Coverage Type</InputLabel>
                            <Select
                                labelId="coverage-type-label"
                                value={policyForm.coverage_type}
                                label="Coverage Type"
                                onChange={(e) => {
                                    const type = e.target.value as string;
                                    let amount = '500';
                                    
                                    // Set default amounts based on coverage type
                                    if (type === 'standard') amount = '1000';
                                    if (type === 'premium') amount = '2000';
                                    
                                    setPolicyForm({
                                        ...policyForm,
                                        coverage_type: type,
                                        coverage_amount: amount
                                    });
                                }}
                            >
                                <MenuItem value="basic">Basic Coverage - Limited Protection</MenuItem>
                                <MenuItem value="standard">Standard Coverage - Comprehensive Protection</MenuItem>
                                <MenuItem value="premium">Premium Coverage - Maximum Protection</MenuItem>
                            </Select>
                            <FormHelperText>
                                {policyForm.coverage_type === 'basic' && 'Basic liability and collision coverage'}
                                {policyForm.coverage_type === 'standard' && 'Comprehensive coverage for most incidents'}
                                {policyForm.coverage_type === 'premium' && 'Full protection with maximum benefits'}
                            </FormHelperText>
                        </FormControl>
                        
                        <TextField
                            label="Coverage Amount"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={policyForm.coverage_amount}
                            onChange={(e) => setPolicyForm({
                                ...policyForm,
                                coverage_amount: e.target.value
                            })}
                            InputProps={{
                                startAdornment: <span style={{ marginRight: '8px' }}>$</span>,
                            }}
                            helperText="The maximum coverage amount for claims"
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button 
                            onClick={() => setOpenNewPolicy(false)}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreatePolicy} 
                            color="primary"
                            variant="contained"
                            disabled={!policyForm.booking_id}
                            startIcon={<SecurityIcon />}
                            sx={{ borderRadius: 2 }}
                        >
                            Create Policy
                        </Button>
                    </DialogActions>
                </Dialog>
                
                {/* File Claim Dialog - enhanced */}
                <Dialog 
                    open={openNewClaim} 
                    onClose={() => setOpenNewClaim(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ pb: 1 }}>
                        <Box display="flex" alignItems="center">
                            <ReportProblemIcon sx={{ mr: 1, color: 'error.main' }} />
                            File New Insurance Claim
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        
                        {selectedPolicy && (
                            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Filing claim for:
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">
                                    {selectedPolicy.make} {selectedPolicy.model} - Policy #{selectedPolicy.id}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {getPolicyTypeDetails(selectedPolicy.coverage_type).label} - 
                                    ${sanitizeNumber(selectedPolicy.coverage_amount).toFixed(2)}
                                </Typography>
                            </Box>
                        )}
                        
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Please provide details about the incident that occurred during your rental period.
                        </Typography>
                        
                        <TextField
                            label="Incident Date"
                            type="date"
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            value={claimForm.incident_date}
                            onChange={(e) => {
                                setError(null);
                                setClaimForm({ ...claimForm, incident_date: e.target.value });
                            }}
                            helperText="When did the incident occur?"
                        />
                        <TextField
                            label="Description"
                            multiline
                            rows={4}
                            fullWidth
                            margin="normal"
                            value={claimForm.description}
                            onChange={(e) => {
                                setError(null);
                                setClaimForm({ ...claimForm, description: e.target.value });
                            }}
                            helperText="Please provide detailed information about what happened (min. 10 characters)"
                            placeholder="Describe the incident in detail, including what happened, where it occurred, and any other relevant information."
                        />
                        <TextField
                            label="Claim Amount"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={claimForm.claim_amount}
                            onChange={(e) => {
                                setError(null);
                                setClaimForm({ ...claimForm, claim_amount: e.target.value });
                            }}
                            InputProps={{
                                startAdornment: <span style={{ marginRight: '8px' }}>$</span>,
                            }}
                            helperText={selectedPolicy ? 
                                `Maximum coverage: $${sanitizeNumber(selectedPolicy.coverage_amount).toFixed(2)}` : 
                                "Enter the amount you're claiming"
                            }
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button 
                            onClick={() => {
                                setOpenNewClaim(false);
                                setError(null);
                            }}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmitClaim} 
                            color="primary"
                            variant="contained"
                            disabled={!claimForm.incident_date || !claimForm.description || !claimForm.claim_amount}
                            startIcon={<GavelIcon />}
                            sx={{ borderRadius: 2 }}
                        >
                            Submit Claim
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </InsuranceErrorBoundary>
    );
};

export default InsuranceView; 