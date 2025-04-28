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
    CircularProgress,
    Alert,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Paper,
    Divider,
    AppBar,
    Toolbar,
    IconButton,
    Switch,
    FormControl,
    RadioGroup,
    FormControlLabel as MuiFormControlLabel,
    FormGroup,
    Snackbar,
    Alert as MuiAlert
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Star as StarIcon,
    DirectionsCar as CarIcon,
    Security as SecurityIcon,
    Support as SupportIcon,
    LocalOffer as DiscountIcon,
    ArrowBack as ArrowBackIcon,
    CardMembership as CardMembershipIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Membership {
    id: number;
    type: 'none' | 'basic' | 'premium' | 'platinum';
    start_date: string;
    end_date: string | null;
    status: 'active' | 'expired' | 'cancelled';
    auto_renew: boolean;
    benefits: MembershipBenefit[];
}

interface MembershipBenefit {
    name: string;
    description: string;
    discount_percentage?: number;
    insurance_coverage?: number;
    priority_booking?: boolean;
    free_cancellations?: number;
}

interface MembershipTier {
    id: number;
    type: string;
    name: string;
    description: string;
    price: number;
    benefits: string[];
    is_active: boolean;
}

// Fallback membership level definitions in case API fails
const fallbackMembershipLevels = {
    none: {
        color: '#9e9e9e',
        price: 0.00,
        benefits: [
            'No additional benefits',
            'Standard booking',
            'No discount on rentals',
            'Standard customer support'
        ]
    },
    basic: {
        color: '#757575',
        price: 9.99,
        benefits: [
            'Basic insurance coverage',
            'Standard booking priority',
            '5% discount on rentals'
        ]
    },
    premium: {
        color: '#1976d2',
        price: 19.99,
        benefits: [
            'Enhanced insurance coverage',
            'Priority booking',
            '10% discount on rentals',
            '24/7 customer support'
        ]
    },
    platinum: {
        color: '#ffd700',
        price: 29.99,
        benefits: [
            'Premium insurance coverage',
            'VIP booking priority',
            '15% discount on rentals',
            'Dedicated customer support'
        ]
    }
};

const MembershipView = () => {
    const [membership, setMembership] = useState<Membership | null>(null);
    const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [selectedType, setSelectedType] = useState<'basic' | 'premium' | 'platinum' | null>(null);
    const [autoRenew, setAutoRenew] = useState(false);
    const [updatingRenewal, setUpdatingRenewal] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchMembership();
        fetchMembershipTiers();
    }, []);

    const fetchMembership = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 404) {
                console.log('No active membership found');
                setMembership(null);
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch membership data');
            }

            const data = await response.json();
            setMembership(data);
            setAutoRenew(data?.auto_renew || false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching membership:', err);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchMembershipTiers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/membership-tiers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.ok) {
                console.error('Failed to fetch membership tiers, using fallback data');
                return;
            }
            
            const data = await response.json();
            // Only include active tiers
            const activeTiers = data.filter((tier: MembershipTier) => tier.is_active);
            setMembershipTiers(activeTiers);
        } catch (err) {
            console.error('Error fetching membership tiers:', err);
        }
    };

    const handleUpgrade = async () => {
        setError(null);
        
        try {
            if (membership && selectedType === null) {
                // This means the user wants to cancel their membership
                console.log("Cancelling membership...");
                
                if (!membership || !membership.id) {
                    throw new Error('No active membership found to cancel');
                }
                
                // Store end date for later use, before any API calls
                const endDateFormatted = membership.end_date 
                    ? format(new Date(membership.end_date), 'MMMM d, yyyy')
                    : 'your due date';
                console.log(`End date for message: ${endDateFormatted}`);
                
                // Use DELETE for cancellation, matching the backend route
                const url = `${import.meta.env.VITE_API_URL}/api/memberships/${membership.id}`;
                console.log(`Making cancellation request to: ${url}`);
                
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                console.log('Cancellation response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Cancellation error response:', errorText);
                    throw new Error(errorText || 'Failed to cancel membership');
                }
                
                // Set the snackbar message and show it
                const message = `Your membership has been cancelled and will not be renewed. You will still have access to its benefits until ${endDateFormatted}.`;
                console.log('Setting snackbar message:', message);
                setSnackbarMessage(message);
                setSnackbarOpen(true);
                console.log('Snackbar should be visible now');
                
                // Close dialog and refresh membership data
                setShowUpgradeDialog(false);
                await fetchMembership();
            } else if (selectedType) {
                // User is purchasing a new membership
                console.log(`Purchasing ${selectedType} membership...`);
                
                // Get token
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Authentication token not found. Please log in again.');
                }
                
                // Extract user information from localStorage if available
                let userId;
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const userData = JSON.parse(userStr);
                        userId = userData.id;
                    } catch (e) {
                        console.error('Error parsing user data from localStorage', e);
                    }
                }
                
                if (!userId) {
                    throw new Error('User ID not found. Please log in again.');
                }
                
                // Make the request to purchase the membership
                const url = `${import.meta.env.VITE_API_URL}/api/memberships`;
                console.log(`Making membership purchase request to: ${url}`);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId: userId,
                        membershipType: selectedType,
                        auto_renew: true
                    })
                });
                
                console.log('Purchase response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Purchase error response:', errorText);
                    throw new Error(errorText || 'Failed to purchase membership');
                }
                
                // Set success message
                const message = `You have successfully purchased a ${selectedType} membership!`;
                setSnackbarMessage(message);
                setSnackbarOpen(true);
                
                // Close dialog and refresh membership data
                setShowUpgradeDialog(false);
                await fetchMembership();
            }
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process membership change');
            console.error("Membership change error:", err);
        }
    };

    const handleAutoRenewToggle = async (checked: boolean) => {
        if (!membership) return;
        
        setUpdatingRenewal(true);
        try {
            // Use the new dedicated PUT endpoint for updating auto-renew status
            const url = `${import.meta.env.VITE_API_URL}/api/memberships/${membership.id}/autorenew`; // Changed endpoint
            console.log(`Making auto-renew request to: ${url}`);
            console.log('Auto-renew data:', { auto_renew: checked });
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    auto_renew: checked // Only send auto_renew status
                })
            });

            console.log('Auto-renew response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Auto-renew error response:', errorText);
                throw new Error(errorText || 'Failed to update auto-renew setting');
            }

            // Update local state
            setMembership({ ...membership, auto_renew: checked });
            setAutoRenew(checked);
            toast.success(`Auto-renewal ${checked ? 'enabled' : 'disabled'} successfully`);
        } catch (error) {
            console.error('Error updating auto-renew:', error);
            toast.error('Failed to update auto-renewal setting');
        } finally {
            setUpdatingRenewal(false);
        }
    };

    const getBenefitIcon = (benefit: string) => {
        if (benefit.toLowerCase().includes('discount')) return <DiscountIcon />;
        if (benefit.toLowerCase().includes('insurance')) return <SecurityIcon />;
        if (benefit.toLowerCase().includes('booking')) return <CarIcon />;
        if (benefit.toLowerCase().includes('support')) return <SupportIcon />;
        return <CheckCircleIcon />;
    };

    const getMembershipColor = (type: string) => {
        switch (type) {
            case 'premium':
                return '#1976d2';
            case 'platinum':
                return '#ffd700';
            case 'none':
                return '#9e9e9e';
            default:
                return '#757575';
        }
    };
    
    const getMembershipPrice = (type: string): number => {
        const tier = membershipTiers.find(t => t.type === type);
        if (tier) return tier.price;
        
        // Fallback to hardcoded prices if tier not found
        return fallbackMembershipLevels[type as keyof typeof fallbackMembershipLevels]?.price || 0;
    };
    
    const getMembershipBenefits = (type: string): string[] => {
        const tier = membershipTiers.find(t => t.type === type);
        if (tier) return tier.benefits;
        
        // Fallback to hardcoded benefits if tier not found
        return fallbackMembershipLevels[type as keyof typeof fallbackMembershipLevels]?.benefits || [];
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={5}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: '#f7f9fc', minHeight: '100vh' }}>
            {/* Header style from HelpCenter */}
            <AppBar position="fixed">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate('/dashboard')}
                        sx={{ mr: 2 }}
                        aria-label="Back"
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
                        <CardMembershipIcon sx={{ mr: 1.5 }} />
                        <Typography variant="h6" component="div">
                            Membership
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>
            <Toolbar /> {/* Spacer */}

            <Container maxWidth="lg" sx={{ py: 4 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 4 }}>
                        {error}
                    </Alert>
                )}

                <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: 'black' }}>
                    Your Membership
                </Typography>

                {!membership ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                            You're currently a non-member
                        </Typography>
                        <Typography variant="body1" color="textSecondary" paragraph>
                            All users start as non-members. Select a membership plan below to enjoy exclusive benefits.
                        </Typography>
                    </Box>
                ) : (
                    <Paper sx={{ p: 3, borderRadius: 2, mb: 5, borderLeft: 6, borderColor: getMembershipColor(membership.type) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <CardMembershipIcon sx={{ color: getMembershipColor(membership.type), fontSize: 32 }} />
                            <Typography variant="h5" sx={{ ml: 2, fontWeight: 'bold' }}>
                                {membership.type.charAt(0).toUpperCase() + membership.type.slice(1)} Membership
                            </Typography>
                            <Chip 
                                label={membership.status}
                                color={
                                    membership.status === 'active' ? 'success' : 
                                    membership.status === 'expired' ? 'warning' : 'error'
                                }
                                size="small"
                                sx={{ ml: 2 }}
                            />
                        </Box>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Membership Details
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    <strong>Start Date:</strong> {format(new Date(membership.start_date), 'PPP')}
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    <strong>End Date:</strong> {membership.end_date ? format(new Date(membership.end_date), 'PPP') : 'N/A'}
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    <strong>Status:</strong> {membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    <strong>Auto-renew:</strong> {membership.auto_renew ? 'Enabled' : 'Disabled'}
                                </Typography>
                                
                                <Box sx={{ mt: 2 }}>
                                    {membership.status === 'active' && (
                            <Button
                                            variant="outlined"
                                color="error"
                                onClick={() => {
                                    setSelectedType(null);
                                    setShowUpgradeDialog(true);
                                }}
                            >
                                Cancel Membership
                            </Button>
                                    )}
                                            </Box>
                                        </Grid>
                                
                                        <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Your Benefits
                                </Typography>
                                <List dense>
                                    {getMembershipBenefits(membership.type).map((benefit, index) => (
                                        <ListItem key={index} sx={{ py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                {getBenefitIcon(benefit)}
                                            </ListItemIcon>
                                            <ListItemText primary={benefit} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Grid>
                        </Grid>
                        
                        {membership.status === 'active' && (
                            <Box 
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    mt: 3,
                                    pt: 2,
                                    borderTop: '1px solid rgba(0,0,0,0.1)'
                                }}
                            >
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body1" fontWeight="medium">Auto-Renew</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Your membership will automatically renew when it expires
                                    </Typography>
                                </Box>
                                <Switch
                                    checked={!!membership.auto_renew}
                                    onChange={(_, checked) => handleAutoRenewToggle(checked)}
                                    disabled={updatingRenewal}
                                    color="primary"
                                />
                            </Box>
                        )}
                    </Paper>
                )}

                <Typography variant="h4" gutterBottom sx={{ mt: 6, mb: 3, fontWeight: 'bold', color: 'black' }}>
                    Membership Plans
                </Typography>

                <Grid container spacing={3}>
                    {(membershipTiers.length > 0 ? 
                        [
                            {
                                type: 'none',
                                name: 'Non-Member',
                                price: 0.00,
                                benefits: [
                                    'No additional benefits',
                                    'Standard booking',
                                    'No discount on rentals',
                                    'Standard customer support'
                                ],
                                is_active: true
                            },
                            ...membershipTiers
                        ] : 
                        Object.keys(fallbackMembershipLevels).map(type => ({
                            type,
                            name: type === 'none' ? 'Non-Member' : type.charAt(0).toUpperCase() + type.slice(1),
                            price: fallbackMembershipLevels[type as keyof typeof fallbackMembershipLevels].price,
                            benefits: fallbackMembershipLevels[type as keyof typeof fallbackMembershipLevels].benefits,
                            is_active: true
                        }))
                    ).map((tier) => (
                        <Grid item xs={12} md={3} key={tier.type}>
                            <Card 
                                sx={{ 
                                    height: '100%',
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    borderTop: 5, 
                                    borderColor: getMembershipColor(tier.type),
                                    opacity: tier.type === 'none' ? 0.9 : 1
                                }}
                                elevation={tier.type === membership?.type ? 4 : 1}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        {tier.name}
                                    </Typography>
                                    
                                    <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
                                        {tier.type === 'none' ? 'FREE' : `£${tier.price.toFixed(2)}`}
                                        {tier.type !== 'none' && <Typography variant="caption" sx={{ ml: 1 }}>/month</Typography>}
                                    </Typography>
                                    
                                    {tier.type === 'none' && (
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                            Default for new users
                                        </Typography>
                                    )}
                                    
                                    <Divider sx={{ my: 2 }} />
                                    
                                    <List dense>
                                        {tier.benefits.map((benefit, index) => (
                                            <ListItem key={index} sx={{ py: 0.5 }}>
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    {getBenefitIcon(benefit)}
                                                </ListItemIcon>
                                                <ListItemText primary={benefit} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                                
                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button
                                        fullWidth
                                        variant={tier.type === membership?.type ? "outlined" : "contained"}
                                        color="primary"
                                        disabled={(tier.type === membership?.type && membership.status === 'active') || 
                                                (tier.type === 'none' && !membership)}
                                        onClick={() => {
                                            setSelectedType(tier.type === 'none' ? null : tier.type as 'basic' | 'premium' | 'platinum');
                                            setShowUpgradeDialog(true);
                                        }}
                                    >
                                        {tier.type === 'none' && !membership
                                            ? 'Current Status'
                                            : tier.type === membership?.type && membership.status === 'active' 
                                            ? 'Current Plan' 
                                            : tier.type === membership?.type && membership.status === 'cancelled'
                                            ? 'Reactivate'
                                            : tier.type === 'none'
                                            ? 'Cancel Membership'
                                            : membership 
                                            ? 'Switch Plan' 
                                            : 'Select Plan'}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Dialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)}>
                    <DialogTitle>
                        {membership ? 'Cancel Membership' : `Select ${selectedType ? (selectedType.charAt(0).toUpperCase() + selectedType.slice(1)) : ''} Membership`}
                    </DialogTitle>
                    
                    <DialogContent>
                        {membership ? (
                            <>
                                <Typography variant="body1" paragraph>
                                    Are you sure you want to cancel your {membership?.type} membership?
                                </Typography>
                                
                                <Typography variant="body1" paragraph>
                                    You will still have access to membership benefits until the end of your current period, but your membership will not renew.
                                </Typography>
                            </>
                        ) : (
                            <>
                                <Typography variant="body1" paragraph>
                                    You're about to purchase a {selectedType} membership. 
                                </Typography>
                                
                                <Typography variant="body1" paragraph>
                                    Your membership will begin immediately upon payment and will renew monthly.
                                </Typography>
                                
                                <Typography variant="h6" color="primary" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
                                    Price: £{selectedType ? getMembershipPrice(selectedType).toFixed(2) : '0.00'}/month
                                </Typography>
                            </>
                        )}
                    </DialogContent>
                    
                    <DialogActions>
                        <Button onClick={() => setShowUpgradeDialog(false)}>
                            Back
                        </Button>
                        <Button 
                            onClick={handleUpgrade} 
                            variant="contained" 
                            color={membership ? "error" : "primary"}
                        >
                            {membership ? 'Cancel Membership' : 'Purchase Membership'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={10000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <MuiAlert 
                    elevation={6} 
                    variant="filled" 
                    severity="success"
                    onClose={() => setSnackbarOpen(false)}
                    sx={{ 
                        width: '100%',
                        maxWidth: '600px',
                        bgcolor: '#ff4444',
                        '.MuiAlert-message': {
                            fontSize: '1rem'
                        }
                    }}
                >
                    {snackbarMessage}
                </MuiAlert>
            </Snackbar>
        </Box>
    );
};

export default MembershipView; 