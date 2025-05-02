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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { getMaxInsuranceCoverage, MembershipType } from '../../utils/membershipUtils';
import { toast } from 'react-hot-toast';

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
    admin_notes?: string;
    created_at?: string;
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
    const [membershipType, setMembershipType] = useState<MembershipType>(null);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null); // State for uploaded files

    useEffect(() => {
        fetchPoliciesAndClaims();
        fetchMembership();
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

    const fetchMembership = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 404) {
                setMembershipType(null);
                return;
            }
            
            if (!response.ok) {
                throw new Error('Failed to fetch membership');
            }
            
            const data = await response.json();
            setMembershipType(data.type as MembershipType);
        } catch (error) {
            console.error('Error fetching membership:', error);
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

            // Determine default policy state based on CURRENT membershipType
            const defaultType = membershipType === null ? 'low' : 'basic';
            const defaultAmount = membershipType === null ? '100' : '500';

            // Set the policy form state right before opening the dialog
            setPolicyForm({
                booking_id: '', // Reset booking selection
                coverage_type: defaultType,
                coverage_amount: defaultAmount
            });
            
            setOpenNewPolicy(true); // Open dialog AFTER setting state

        } catch (err) {
            console.error('Error fetching available bookings:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while fetching available bookings');
        } finally {
            setLoading(false);
        }
    };

    // Modify handleCreatePolicy to respect coverage limits
    const handleCreatePolicy = async () => {
        try {
            // Get max coverage amount based on membership tier
            const maxCoverage = getMaxInsuranceCoverage(membershipType);
            
            // Check if user is trying to exceed their coverage limit
            if (Number(policyForm.coverage_amount) > maxCoverage) {
                setError(`Your ${membershipType || 'non-member'} status has a maximum coverage limit of $${maxCoverage}`);
                return;
            }
            
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
        if (!selectedPolicy) {
            setError('Policy ID is required. Please select a valid policy.');
            return;
        }

        try {
            // Ensure policy ID is definitely set
            const policyId = selectedPolicy?.id;
            if (!policyId) {
                setError('Policy ID is required. Please select a valid policy.');
                return;
            }

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

            // Format the date properly
            const formattedDate = new Date(claimForm.incident_date).toISOString().split('T')[0];
            
            // Log for debugging
            console.log('Submitting claim with data:', {
                policy_id: policyId,
                incident_date: formattedDate,
                description: claimForm.description,
                claim_amount: Number(claimForm.claim_amount)
            });

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token missing. Please log in again.');
            }

            // Change approach: send JSON data instead of FormData
            // First, send the claim data as JSON
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/insurance/claims`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    policy_id: Number(policyId), // Ensure it's a number
                    incident_date: formattedDate,
                    description: claimForm.description,
                    claim_amount: Number(claimForm.claim_amount)
                })
            });

            const responseData = await response.json();
            console.log('Claim submission response:', responseData);

            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to submit claim');
            }

            
            if (selectedFiles && selectedFiles.length > 0) {
                console.log(`${selectedFiles.length} files would be uploaded in a separate request`);
            }

            toast.success('Claim submitted successfully!');
            await fetchPoliciesAndClaims();
            setOpenNewClaim(false);
            setClaimForm({ incident_date: '', description: '', claim_amount: '' });
            setSelectedPolicy(null);
            setSelectedFiles(null); // Clear selected files after submission
        } catch (err) {
            console.error('Error in handleSubmitClaim:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit claim');
            toast.error('Error submitting claim. Please try again.');
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

    // Add file change handler
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            // Basic validation example (max 5 files)
            if (event.target.files.length > 5) {
                toast.error('You can upload a maximum of 5 files.');
                // Clear the input if needed
                event.target.value = ''
                setSelectedFiles(null);
                return;
            }
            setSelectedFiles(event.target.files);
            
        }
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
            {/* Header copied from UserDashboard and adapted */}
            <AppBar position="fixed">
                <Toolbar>
                    <IconButton
                        edge="start" // Keep edge="start" from Dashboard
                        color="inherit"
                        onClick={() => navigate(-1)} // Use navigate(-1) for back
                        sx={{ mr: 2 }} // Use default dashboard spacing
                        aria-label="Back"
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
                        <SecurityIcon sx={{ mr: 1.5 }} /> {/* Use SecurityIcon */} 
                        <Typography variant="h6" component="div"> {/* Removed sx={{ flexGrow: 1 }} as Box has it */} 
                            Insurance Information
                        </Typography>
                    </Box>
                    {/* Optional: Logout button if desired, otherwise remove */}
                    <IconButton color="inherit" onClick={handleLogout} title="Logout">
                        <LogoutIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Toolbar /> {/* Spacer */}

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}
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

                    {membershipType !== null ? (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                                {membershipType.charAt(0).toUpperCase() + membershipType.slice(1)} Membership Benefits
                            </Typography>
                            <Typography variant="body2">
                                Your membership allows for {membershipType === 'basic' ? 'basic' : membershipType === 'premium' ? 'enhanced' : 'premium'} insurance coverage 
                                up to £{getMaxInsuranceCoverage(membershipType)}.
                            </Typography>
                        </Alert>
                    ) : (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                                Non-member limitations
                            </Typography>
                            <Typography variant="body2">
                                As a non-member, your insurance options are limited. Consider upgrading your membership for better coverage options.
                            </Typography>
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
                                                                <Typography color="primary" variant="h6" component="span" sx={{ lineHeight: 1 }}>
                                                                    £
                                                                </Typography>
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary="Coverage Amount"
                                                                secondary={`£${sanitizeNumber(policy.coverage_amount).toFixed(2)}`}
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
                                                            setTimeout(() => {
                                                                setOpenNewClaim(true);
                                                            }, 100);
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
                                                },
                                                overflow: 'hidden'
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
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <GavelIcon fontSize="small" />
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        Claim #{claim.id}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={claim.status.toUpperCase()}
                                                    color={getStatusColor(claim.status)}
                                                    size="small"
                                                    sx={{ 
                                                        fontWeight: 'bold', 
                                                        bgcolor: '#fff',
                                                        borderRadius: 1,
                                                        color: getStatusColor(claim.status) + '.main'
                                                    }}
                                                />
                                            </Box>
                                            
                                            <CardContent sx={{ flexGrow: 1, p: 0 }}>
                                                {/* Vehicle Information */}
                                                <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                                    <Box display="flex" alignItems="center" mb={1}>
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
                                                            <Typography variant="h6">
                                                                {claim.make} {claim.model}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Policy #{claim.policy_id} • {getPolicyTypeDetails(claim.coverage_type).label}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                
                                                {/* Claim Description */}
                                                <Box 
                                                    sx={{ 
                                                        m: 2, 
                                                        p: 2, 
                                                        bgcolor: 'background.default',
                                                        borderRadius: 1,
                                                        border: '1px solid rgba(0, 0, 0, 0.06)',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <Typography variant="overline" sx={{ 
                                                        position: 'absolute',
                                                        top: -10,
                                                        left: 10,
                                                        bgcolor: 'background.default',
                                                        px: 1
                                                    }}>
                                                        INCIDENT DETAILS
                                                    </Typography>
                                                    <Box display="flex" alignItems="flex-start" mb={1}>
                                                        <DescriptionIcon 
                                                            fontSize="small" 
                                                            sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} 
                                                        />
                                                        <Box sx={{ width: '100%' }}>
                                                            <Typography variant="body1" sx={{
                                                                maxHeight: '100px',
                                                                overflow: 'auto',
                                                                mb: 1
                                                            }}>
                                                                {claim.description}
                                                            </Typography>
                                                            <Chip 
                                                                icon={<EventIcon fontSize="small" />} 
                                                                label={`Incident date: ${format(new Date(claim.incident_date), 'MMM d, yyyy')}`}
                                                                variant="outlined"
                                                                size="small"
                                                                sx={{ mr: 1, mt: 1 }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                
                                                {/* Claim Details */}
                                                <Box sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    {/* Amount */}
                                                    <Box 
                                                        sx={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center',
                                                            p: 1.5,
                                                            borderRadius: 1,
                                                            bgcolor: 'primary.50',
                                                            border: '1px solid',
                                                            borderColor: 'primary.100'
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Typography color="primary" variant="h6" component="span" sx={{ lineHeight: 1, mr: 1 }}>
                                                                £
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">Claim Amount</Typography>
                                                        </Box>
                                                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                                                            £{sanitizeNumber(claim.claim_amount).toFixed(2)}
                                                        </Typography>
                                                    </Box>
                                                    
                                                    {/* Status Timeline */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, px: 1 }}>
                                                        <Box sx={{ 
                                                            width: '100%', 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between',
                                                            position: 'relative',
                                                            '&::after': {
                                                                content: '""',
                                                                position: 'absolute',
                                                                height: '2px',
                                                                backgroundColor: 'divider',
                                                                left: '10%',
                                                                right: '10%',
                                                                top: '50%',
                                                                zIndex: 0
                                                            }
                                                        }}>
                                                            {['pending', 'processing', 'approved', 'paid'].map((status, index) => {
                                                                // Determine if the circle should be active based on claim status
                                                                let isActive = false;
                                                                let circleColor = 'divider'; // Default gray
                                                                
                                                                if (claim.status === 'rejected') {
                                                                    // For rejected claims, show the progress up to and including 'approved' in red
                                                                    if (status === 'pending' || status === 'processing' || status === 'approved') {
                                                                        isActive = true;
                                                                        circleColor = 'error.main'; // Red color
                                                                    }
                                                                } else if (claim.status === 'pending') {
                                                                    // For pending claims, only the 'pending' circle should be active in orange
                                                                    if (status === 'pending') {
                                                                        isActive = true;
                                                                        circleColor = 'warning.main'; // Orange color
                                                                    }
                                                                } else if (claim.status === 'processing') {
                                                                    // For processing claims, 'pending' and 'processing' circles should be active in orange
                                                                    if (status === 'pending' || status === 'processing') {
                                                                        isActive = true;
                                                                        circleColor = 'warning.main'; // Orange color
                                                                    }
                                                                } else if (claim.status === 'approved') {
                                                                    // For approved claims, only circles up to and including "approved" should be green
                                                                    if (status === 'pending' || status === 'processing' || status === 'approved') {
                                                                        isActive = true;
                                                                        circleColor = 'success.main'; // Green color
                                                                    }
                                                                } else if (claim.status === 'paid') {
                                                                    // For paid claims, all circles should be active in green
                                                                    isActive = true;
                                                                    circleColor = 'success.main'; // Green color
                                                                }
                                                                
                                                                // Determine if this is the current status to highlight it
                                                                const isCurrent = claim.status === status;
                                                                
                                                                return (
                                                                    <Box key={status} sx={{ 
                                                                        zIndex: 1, 
                                                                        display: 'flex', 
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        position: 'relative'
                                                                    }}>
                                                                        <Box 
                                                                            sx={{ 
                                                                                width: 16, 
                                                                                height: 16, 
                                                                                borderRadius: '50%',
                                                                                bgcolor: isActive ? circleColor : 'divider',
                                                                                border: isCurrent ? '2px solid' : 'none',
                                                                                borderColor: isCurrent ? circleColor : 'transparent',
                                                                                zIndex: 2
                                                                            }}
                                                                        />
                                                                        <Typography 
                                                                            variant="caption" 
                                                                            sx={{ 
                                                                                mt: 0.5,
                                                                                fontWeight: isCurrent ? 'bold' : 'normal',
                                                                                color: isCurrent ? 'text.primary' : 'text.secondary'
                                                                            }}
                                                                        >
                                                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                                                        </Typography>
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                
                                                {/* Administrative Notes (if any) */}
                                                {claim.admin_notes && (
                                                    <Box sx={{ px: 2, pb: 2, pt: 1 }}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                            <strong>Admin Notes:</strong>
                                                        </Typography>
                                                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                                                            <Typography variant="body2">{claim.admin_notes}</Typography>
                                                        </Paper>
                                                    </Box>
                                                )}
                                            </CardContent>
                                            
                                            {/* Card Actions */}
                                            <Box sx={{ 
                                                p: 2, 
                                                borderTop: '1px solid rgba(0, 0, 0, 0.08)', 
                                                bgcolor: 'background.default',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Submitted on {format(new Date(claim.created_at || new Date()), 'MMM d, yyyy')}
                                                </Typography>
                                                <Button
                                                    variant="text"
                                                    size="small"
                                                    onClick={() => navigate('/dashboard/chat', { state: { claimId: claim.id }})}
                                                    sx={{ fontSize: '0.75rem' }}
                                                >
                                                    Discuss via chat
                                                </Button>
                                            </Box>
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
                        
                        {membershipType !== null ? (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2">
                                    {membershipType.charAt(0).toUpperCase() + membershipType.slice(1)} Membership Benefits
                                </Typography>
                                <Typography variant="body2">
                                    Your membership allows for {membershipType === 'basic' ? 'basic' : membershipType === 'premium' ? 'enhanced' : 'premium'} insurance coverage 
                                    up to £{getMaxInsuranceCoverage(membershipType)}.
                                </Typography>
                            </Alert>
                        ) : (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2">
                                    Non-member limitations
                                </Typography>
                                <Typography variant="body2">
                                    As a non-member, your insurance options are limited. Consider upgrading your membership for better coverage options.
                                </Typography>
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
                                    let amount = '100'; // Default to low for non-member
                                    
                                    // Set amounts based on coverage type
                                    if (type === 'basic') amount = '500';
                                    if (type === 'standard') amount = '1000';
                                    if (type === 'premium') amount = '2000';
                                    
                                    setPolicyForm({
                                        ...policyForm,
                                        coverage_type: type,
                                        coverage_amount: amount
                                    });
                                }}
                            >
                                {membershipType === null ? (
                                    // Only show Low for non-members
                                    <MenuItem value="low">Low Coverage - £100 Limit</MenuItem>
                                ) : (
                                    // Show standard options for members
                                    [
                                        <MenuItem key="basic" value="basic">Basic Coverage - £500 Limit</MenuItem>,
                                        <MenuItem key="standard" value="standard">Standard Coverage - £1000 Limit</MenuItem>,
                                        <MenuItem key="premium" value="premium">Premium Coverage - £2000 Limit</MenuItem>
                                    ]
                                )}
                            </Select>
                            <FormHelperText>
                                {policyForm.coverage_type === 'low' && 'Basic protection up to £100'}
                                {policyForm.coverage_type === 'basic' && 'Basic liability and collision coverage up to £500'}
                                {policyForm.coverage_type === 'standard' && 'Comprehensive coverage for most incidents up to £1000'}
                                {policyForm.coverage_type === 'premium' && 'Full protection with maximum benefits up to £2000'}
                            </FormHelperText>
                        </FormControl>
                        
                        <TextField
                            label="Coverage Amount"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={policyForm.coverage_amount}
                            disabled // Make amount read-only, derived from type
                            InputProps={{
                                startAdornment: <span style={{ marginRight: '8px' }}>£</span>, 
                            }}
                            helperText="The maximum coverage amount for claims (determined by type)"
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
                    onClose={() => {
                        setOpenNewClaim(false);
                        setError(null);
                    }}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: { borderRadius: 2 }
                    }}
                >
                    <DialogTitle 
                        sx={{ 
                            pb: 1, 
                            pt: 2, 
                            px: 3,
                            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5
                        }}
                    >
                        <ReportProblemIcon sx={{ color: 'error.main' }} />
                        <Typography variant="h5" component="div">File New Insurance Claim</Typography>
                    </DialogTitle>

                    {/* Multi-step form with improved UX */}
                    <DialogContent sx={{ p: 0 }}>
                        {error && (
                            <Alert severity="error" sx={{ m: 3, mb: 0 }}>
                                {error}
                            </Alert>
                        )}
                        
                        {/* Add a check to ensure we have a selected policy */}
                        {!selectedPolicy && policies.length > 0 ? (
                            <Box sx={{ m: 3, p: 2.5 }}>
                                <Typography variant="h6" gutterBottom>Select a Policy</Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Please select the policy you would like to file a claim for:
                                </Typography>
                                <Grid container spacing={2}>
                                    {policies.filter(p => p.status === 'active').map((policy) => (
                                        <Grid item xs={12} key={policy.id}>
                                            <Button 
                                                variant="outlined"
                                                fullWidth
                                                sx={{ 
                                                    p: 2, 
                                                    justifyContent: 'flex-start',
                                                    textAlign: 'left',
                                                    borderRadius: 2
                                                }}
                                                onClick={() => setSelectedPolicy(policy)}
                                            >
                                                <Box>
                                                    <Typography variant="subtitle1">
                                                        {policy.make} {policy.model} - Policy #{policy.id}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {getPolicyTypeDetails(policy.coverage_type).label} - £{sanitizeNumber(policy.coverage_amount).toFixed(2)}
                                                    </Typography>
                                                </Box>
                                            </Button>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        ) : (
                            <>
                                {selectedPolicy && (
                                    <Box sx={{ m: 3, p: 2.5, bgcolor: 'background.default', borderRadius: 1, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                                            <DirectionsCarIcon sx={{ color: 'primary.main' }} />
                                            <Typography variant="h6" fontWeight="medium">
                                                {selectedPolicy.make} {selectedPolicy.model}
                                            </Typography>
                                        </Box>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={4}>
                                                <Typography variant="body2" color="text.secondary">Policy #</Typography>
                                                <Typography variant="body1" fontWeight="medium">{selectedPolicy.id}</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Typography variant="body2" color="text.secondary">Coverage Type</Typography>
                                                <Typography variant="body1" fontWeight="medium">
                                                    {getPolicyTypeDetails(selectedPolicy.coverage_type).label}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Typography variant="body2" color="text.secondary">Coverage Amount</Typography>
                                                <Typography variant="body1" fontWeight="medium">
                                                    £{sanitizeNumber(selectedPolicy.coverage_amount).toFixed(2)}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color="text.secondary">Booking Period</Typography>
                                                <Typography variant="body1">
                                                    {selectedPolicy.booking_start ? format(new Date(selectedPolicy.booking_start), 'MMM d, yyyy') : '—'} to {selectedPolicy.booking_end ? format(new Date(selectedPolicy.booking_end), 'MMM d, yyyy') : '—'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </>
                        )}
                        
                        <Box sx={{ px: 3, py: 2 }}>
                            <Typography variant="subtitle1" color="text.primary" gutterBottom fontWeight="medium">
                                Incident Details
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Please provide detailed information about the incident that occurred during your rental period.
                                All fields marked with * are required.
                            </Typography>
                        
                            <form id="claim-form">
                                {/* Hidden input for policy ID */}
                                {selectedPolicy && (
                                    <input 
                                        type="hidden" 
                                        name="policy_id" 
                                        value={selectedPolicy.id} 
                                        data-testid="policy-id-input"
                                    />
                                )}
                                
                                <Grid container spacing={3}>
                                    {/* Date selection with improved UX */}
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
                                            Incident Date *
                                        </Typography>
                                        
                                        <TextField
                                            type="date"
                                            name="incident_date"
                                            fullWidth
                                            value={claimForm.incident_date}
                                            onChange={(e) => {
                                                setError(null);
                                                setClaimForm({ ...claimForm, incident_date: e.target.value });
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <Box component="span" mr={1}>
                                                        <EventIcon color="action" fontSize="small" />
                                                    </Box>
                                                ),
                                            }}
                                            required
                                            error={Boolean(error && error.includes('date'))}
                                            helperText={selectedPolicy ? 
                                                `Date must be within booking period: ${selectedPolicy.booking_start ? format(new Date(selectedPolicy.booking_start), 'MMM d, yyyy') : '—'} - ${selectedPolicy.booking_end ? format(new Date(selectedPolicy.booking_end), 'MMM d, yyyy') : '—'}` : 
                                                'When did the incident occur?'
                                            }
                                            inputProps={{
                                                min: selectedPolicy?.booking_start ? format(new Date(selectedPolicy.booking_start), 'yyyy-MM-dd') : '',
                                                max: selectedPolicy?.booking_end ? format(new Date(selectedPolicy.booking_end), 'yyyy-MM-dd') : '',
                                            }}
                                            variant="outlined"
                                            size="medium"
                                        />
                                    </Grid>
                                    
                                    {/* Claim amount with currency symbol */}
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
                                            Claim Amount *
                                        </Typography>
                                        
                                        <TextField
                                            type="number"
                                            name="claim_amount"
                                            fullWidth
                                            value={claimForm.claim_amount}
                                            onChange={(e) => {
                                                setError(null);
                                                setClaimForm({ ...claimForm, claim_amount: e.target.value });
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <Box component="span" mr={1}>
                                                        <AttachMoneyIcon color="action" fontSize="small" />
                                                    </Box>
                                                ),
                                            }}
                                            required
                                            error={Boolean(error && error.includes('amount'))}
                                            helperText={selectedPolicy ?
                                                `Maximum coverage: £${sanitizeNumber(selectedPolicy.coverage_amount).toFixed(2)}` :
                                                "Enter the amount you're claiming"
                                            }
                                            inputProps={{
                                                min: "1",
                                                step: "0.01",
                                                max: selectedPolicy?.coverage_amount || undefined
                                            }}
                                            variant="outlined"
                                            size="medium"
                                        />
                                    </Grid>
                                    
                                    {/* Incident description with character count */}
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
                                            Description *
                                        </Typography>
                                        
                                        <TextField
                                            name="description"
                                            multiline
                                            rows={4}
                                            fullWidth
                                            value={claimForm.description}
                                            onChange={(e) => {
                                                setError(null);
                                                setClaimForm({ ...claimForm, description: e.target.value });
                                            }}
                                            placeholder="Describe the incident in detail, including what happened, where it occurred, and any other relevant information."
                                            required
                                            error={Boolean(error && error.includes('description'))}
                                            helperText={`${claimForm.description.length}/10+ characters required. Please provide detailed information about what happened.`}
                                            InputProps={{
                                                startAdornment: (
                                                    <Box component="span" sx={{ position: 'absolute', top: 12, left: 12 }}>
                                                        <DescriptionIcon color="action" fontSize="small" />
                                                    </Box>
                                                ),
                                                sx: { pl: 5 }
                                            }}
                                            variant="outlined"
                                            inputProps={{
                                                minLength: 10
                                            }}
                                        />
                                    </Grid>
                                    
                                    {/* File upload section */}
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
                                            Supporting Documents (Optional)
                                        </Typography>
                                        
                                        <input
                                            type="file"
                                            id="file-upload"
                                            multiple
                                            style={{ display: 'none' }}
                                            accept="image/*,.pdf"
                                            onChange={handleFileChange}
                                        />
                                        
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 3,
                                                border: '1px dashed rgba(0, 0, 0, 0.23)',
                                                borderRadius: 1,
                                                bgcolor: 'background.default',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                }
                                            }}
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                        >
                                            <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                                <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                                                <Typography variant="body1" fontWeight="medium">
                                                    Drag and drop or click to upload
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Upload photos of the damage, invoices, police reports, or any other supporting documents
                                                </Typography>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<AddCircleOutlineIcon />}
                                                    sx={{ mt: 1 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        document.getElementById('file-upload')?.click();
                                                    }}
                                                >
                                                    Choose Files
                                                </Button>
                                            </Box>
                                        </Paper>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            Accepted formats: JPG, PNG, PDF. Maximum 5 files, 10MB each.
                                        </Typography>
                                        {/* Display selected file names */}
                                        {selectedFiles && selectedFiles.length > 0 && (
                                            <Box sx={{ mt: 2, textAlign: 'left' }}>
                                                <Typography variant="body2" fontWeight="medium">Selected Files:</Typography>
                                                <List dense sx={{ maxHeight: 100, overflow: 'auto' }}>
                                                    {Array.from(selectedFiles).map((file, index) => (
                                                        <ListItem key={index} disablePadding>
                                                            <ListItemIcon sx={{ minWidth: 24 }}>
                                                                <DescriptionIcon fontSize="small" />
                                                            </ListItemIcon>
                                                            <ListItemText 
                                                                primary={file.name} 
                                                                secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`} 
                                                                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                                                                secondaryTypographyProps={{ variant: 'caption' }}
                                                            />
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            </Box>
                                        )}
                                    </Grid>
                                </Grid>
                            </form>
                        </Box>
                        
                        {/* Information about what happens next */}
                        <Box sx={{ px: 3, pb: 3, pt: 1 }}>
                            <Paper
                                sx={{
                                    p: 2,
                                    bgcolor: 'info.50',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'info.200'
                                }}
                            >
                                <Typography variant="subtitle2" color="info.dark" gutterBottom>
                                    What happens after you submit a claim?
                                </Typography>
                                <Typography variant="body2" color="info.dark">
                                    1. Our admin team will review your claim within 1-2 business days (for a non-serious claim) and send a confirmation.
                                </Typography>
                                <Typography variant="body2" color="info.dark">
                                    2. If your accident is serious or life-threatening, please call 999 immediately first, then contact us
                                </Typography>
                                <Typography variant="body2" color="info.dark">
                                    3. Please note for all claims we aim to process within 24 hours, as our admin team tend to be busy with other claims so be patient.
                                </Typography>
                                <Typography variant="body2" color="info.dark">
                                    4. We'll contact you via phone and email to discuss your claim details if needed.
                                </Typography>
                                <Typography variant="body2" color="info.dark">
                                    5. You can always open a live chat to discuss your claim with our support team.
                                </Typography>
                            </Paper>
                        </Box>
                    </DialogContent>
                    
                    <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
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
                            disabled={!selectedPolicy}
                            startIcon={<GavelIcon />}
                            sx={{ borderRadius: 2, px: 3, fontSize: '1rem' }}
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