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
            'Standard customer support',
            '£100 Insurance coverage'
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
    const [showCancelDialog, setShowCancelDialog] = useState(false);
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

            console.log('[fetchMembership] Fetching with token:', token ? 'Present' : 'Missing');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[fetchMembership] Response Status:', response.status);

            if (response.status === 404) {
                console.log('[fetchMembership] No active membership found (404).');
                setMembership(null);
                console.log('[fetchMembership] State set to null.');
                setLoading(false);
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[fetchMembership] Response not OK:', response.status, errorText);
                throw new Error(`Failed to fetch membership data: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('[fetchMembership] Data received:', data);
            setMembership(data);
            console.log('[fetchMembership] Membership state updated with received data.');
            setAutoRenew(data?.auto_renew || false);
        } catch (err) {
            console.error('[fetchMembership] Error caught:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while fetching membership');
        } finally {
            setLoading(false);
            console.log('[fetchMembership] Fetch complete (loading set to false).');
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
                const fallbackTiers = Object.entries(fallbackMembershipLevels).map(([type, data], index) => ({
                    id: index,
                    type: type,
                    name: type.charAt(0).toUpperCase() + type.slice(1),
                    description: `Description for ${type}`,
                    price: data.price,
                    benefits: data.benefits,
                    is_active: true
                }));
                setMembershipTiers(fallbackTiers);
                return;
            }

            const data = await response.json();
            const activeTiers = data.filter((tier: MembershipTier) => tier.is_active);
            setMembershipTiers(activeTiers);
        } catch (err) {
            console.error('Error fetching membership tiers:', err);
            const fallbackTiers = Object.entries(fallbackMembershipLevels).map(([type, data], index) => ({
                id: index,
                type: type,
                name: type.charAt(0).toUpperCase() + type.slice(1),
                description: `Description for ${type}`,
                price: data.price,
                benefits: data.benefits,
                is_active: true
            }));
            setMembershipTiers(fallbackTiers);
        }
    };

    const handleCancelMembership = async () => {
        setError(null);
        console.log("Attempting to cancel membership...");

        if (!membership || !membership.id) {
            setError('No active membership found to cancel');
            console.error('No active membership found to cancel');
            setShowCancelDialog(false);
            return;
        }

        try {
            const endDateFormatted = membership.end_date
                ? format(new Date(membership.end_date), 'PPP')
                : 'your scheduled end date';
            console.log(`End date for message: ${endDateFormatted}`);

            const url = `${import.meta.env.VITE_API_URL}/api/memberships/${membership.id}`;
            console.log(`Making cancellation request to: ${url}`);

            const token = localStorage.getItem('token');
            if (!token) {
                 throw new Error('Authentication token not found. Please log in again.');
            }

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Cancellation response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Cancellation error response:', errorText);
                throw new Error(errorText || 'Failed to cancel membership');
            }

            const message = `Your membership has been cancelled and will not renew. Benefits remain until ${endDateFormatted}.`;
            console.log('Setting snackbar message:', message);
            toast.success(message);
            console.log('Snackbar/Toast should be visible now');

            setShowCancelDialog(false);
            await fetchMembership();

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to process cancellation';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error("Membership cancellation error:", err);
            setShowCancelDialog(false);
        }
    };

    const handleUpgrade = async () => {
        setError(null);
        console.log(`Attempting to purchase/upgrade to ${selectedType} membership...`);

        if (!selectedType) {
            setError('No membership type selected for purchase.');
            console.error('handleUpgrade called without selectedType');
            setShowUpgradeDialog(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }

            let userId = null;
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

            const url = `${import.meta.env.VITE_API_URL}/api/memberships/upgrade`;
            console.log(`Making purchase/upgrade request to: ${url}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    membershipType: selectedType,
                })
            });

            console.log('Purchase/Upgrade response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Purchase/Upgrade error response:', errorText);
                throw new Error(errorText || `Failed to purchase ${selectedType} membership`);
            }

            const message = `You have successfully purchased a ${selectedType} membership!`;
            toast.success(message);

            setShowUpgradeDialog(false);
            await fetchMembership();
            console.log('[handleUpgrade] fetchMembership completed.');

        } catch (err) {
             const errorMessage = err instanceof Error ? err.message : 'Failed to process membership change';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error("Membership change error:", err);
            setShowUpgradeDialog(false);
        }
    };

    const handleAutoRenewToggle = async (checked: boolean) => {
        if (!membership) return;

        setUpdatingRenewal(true);
        try {
            const url = `${import.meta.env.VITE_API_URL}/api/memberships/${membership.id}/autorenew`;
            console.log(`Making auto-renew request to: ${url}`);
            console.log('Auto-renew data:', { auto_renew: checked });

            const token = localStorage.getItem('token');
             if (!token) {
                 throw new Error('Authentication token not found.');
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    auto_renew: checked
                })
            });

            console.log('Auto-renew response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Auto-renew error response:', errorText);
                throw new Error(errorText || 'Failed to update auto-renew setting');
            }

            setMembership({ ...membership, auto_renew: checked });
            setAutoRenew(checked);
            toast.success(`Auto-renewal ${checked ? 'enabled' : 'disabled'} successfully`);
        } catch (error) {
            console.error('Error updating auto-renew:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update auto-renewal setting');
        } finally {
            setUpdatingRenewal(false);
        }
    };

    const getBenefitIcon = (benefit: string) => {
        const lowerBenefit = benefit.toLowerCase();
        if (lowerBenefit.includes('discount')) return <DiscountIcon />;
        if (lowerBenefit.includes('insurance')) return <SecurityIcon />;
        if (lowerBenefit.includes('booking')) return <CarIcon />;
        if (lowerBenefit.includes('support')) return <SupportIcon />;
        return <CheckCircleIcon />;
    };

    const getMembershipColor = (type: string) => {
        switch (type) {
            case 'premium':
                return '#1976d2';
            case 'platinum':
                return '#ffd700';
            case 'basic':
                 return '#757575';
            case 'none':
                 return '#9e9e9e';
            default:
                return '#757575';
        }
    };

    const getMembershipPrice = (type: string): number => {
        const tier = membershipTiers.find(t => t.type === type);
        if (tier) return tier.price;

        return fallbackMembershipLevels[type as keyof typeof fallbackMembershipLevels]?.price ?? 0;
    };

    const getMembershipBenefits = (type: string): string[] => {
        const tier = membershipTiers.find(t => t.type === type);
        if (tier) {
             return tier.benefits;
        }

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
        <>
            <AppBar position="static" color="primary" elevation={1} sx={{ mb: 4 }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" aria-label="back" onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <CardMembershipIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Membership
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 4 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 4 }}>
                        {error}
                    </Alert>
                )}

                <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: 'black' }}>
                    Your Membership
                </Typography>

                {membership?.status === 'cancelled' && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Your {membership.type} membership has been cancelled and will not renew.
                        Your benefits remain active until {membership.end_date ? format(new Date(membership.end_date), 'PPP') : 'the end date'}.
                    </Alert>
                )}

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
                    <Paper sx={{ p: 3, borderRadius: 2, mb: 5, borderLeft: 6, borderColor: getMembershipColor(membership?.type) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <CardMembershipIcon sx={{ color: getMembershipColor(membership?.type), fontSize: 32 }} />
                            <Typography variant="h5" sx={{ ml: 2, fontWeight: 'bold' }}>
                                {membership?.type.charAt(0).toUpperCase() + membership?.type.slice(1)} Membership
                            </Typography>
                            <Chip
                                label={membership?.status}
                                color={
                                    membership?.status === 'active' ? 'success' :
                                    membership?.status === 'expired' ? 'warning' : 'error'
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
                                    <strong>Start Date:</strong> {membership?.start_date ? format(new Date(membership.start_date), 'PPP') : 'N/A'}
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    <strong>End Date:</strong> {membership?.end_date ? format(new Date(membership.end_date), 'PPP') : 'N/A'}
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    <strong>Status:</strong> {membership?.status?.charAt(0).toUpperCase() + membership?.status?.slice(1)}
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    <strong>Auto-renew:</strong> {membership?.auto_renew ? 'Enabled' : 'Disabled'}
                                </Typography>

                                <Box sx={{ mt: 2 }}>
                                    {membership?.status === 'active' && (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => setShowCancelDialog(true)}
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
                                    {membership?.type && getMembershipBenefits(membership.type).map((benefit, index) => (
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

                        {membership?.status === 'active' && (
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
                                    checked={!!membership?.auto_renew}
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
                                id: -1,
                                type: 'none',
                                name: 'Non-Member',
                                description: '',
                                price: 0.00,
                                benefits: fallbackMembershipLevels.none.benefits,
                                is_active: true
                            },
                            ...membershipTiers.filter(tier => tier.type !== 'none')
                        ] :
                        Object.keys(fallbackMembershipLevels).map((type, index) => ({
                            id: index,
                            type: type,
                            name: type === 'none' ? 'Non-Member' : type.charAt(0).toUpperCase() + type.slice(1),
                            description: '',
                            price: fallbackMembershipLevels[type as keyof typeof fallbackMembershipLevels].price,
                            benefits: fallbackMembershipLevels[type as keyof typeof fallbackMembershipLevels].benefits,
                            is_active: true
                        }))
                    )
                        .sort((a, b) => a.price - b.price)
                        .map((tier) => (
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
                                     {tier.description && tier.type !== 'none' && (
                                         <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '3em' }}>
                                            {tier.description}
                                        </Typography>
                                     )}

                                    <Divider sx={{ my: 2 }} />

                                    <List dense>
                                         {getMembershipBenefits(tier.type).map((benefit, index) => (
                                            <ListItem key={index} sx={{ py: 0.5 }}>
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    {getBenefitIcon(benefit)}
                                                </ListItemIcon>
                                                <ListItemText primary={benefit}/>
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button
                                        fullWidth
                                        variant={tier.type === membership?.type && membership?.status !== 'expired' ? "outlined" : "contained"}
                                        color={"primary"}
                                        disabled={
                                            (tier.type === membership?.type && membership?.status === 'active') ||
                                            (tier.type === 'none' && (membership?.status === 'cancelled' || !membership))
                                        }
                                        onClick={() => {
                                            if (tier.type === 'none') {
                                                if (membership?.status === 'active') {
                                                    setShowCancelDialog(true);
                                                }
                                            } else {
                                                setSelectedType(tier.type as 'basic' | 'premium' | 'platinum');
                                                setShowUpgradeDialog(true);
                                            }
                                        }}
                                    >
                                         {tier.type === 'none' && !membership
                                            ? 'Current Status'
                                            : tier.type === 'none' && membership?.status === 'cancelled'
                                            ? 'Cancelled'
                                            : tier.type === 'none' && membership?.status === 'active'
                                            ? 'Cancel Membership'
                                            : tier.type === membership?.type && membership?.status === 'active'
                                            ? 'Current Plan'
                                            : tier.type === membership?.type && membership?.status === 'cancelled'
                                            ? 'Reactivate'
                                            : membership
                                            ? 'Switch Plan'
                                            : 'Select Plan'}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Dialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 'bold' }}>
                        {`Select ${selectedType ? (selectedType.charAt(0).toUpperCase() + selectedType.slice(1)) : ''} Membership`}
                    </DialogTitle>
                    <DialogContent dividers>
                         <Typography variant="body1" paragraph>
                             You're about to purchase a {selectedType} membership.
                        </Typography>
                        <Typography variant="body1" paragraph>
                            Your membership will begin immediately upon payment and will renew monthly.
                        </Typography>
                        <Typography variant="h6" color="primary" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
                            Price: £{selectedType ? getMembershipPrice(selectedType).toFixed(2) : '0.00'}/month
                         </Typography>
                    </DialogContent>
                     <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setShowUpgradeDialog(false)} variant="outlined">
                            Cancel
                        </Button>
                        <Button
                             onClick={handleUpgrade}
                            variant="contained"
                            color="primary"
                            sx={{ fontWeight: 'medium' }}
                         >
                            Confirm Purchase
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 'bold' }}>Cancel Membership</DialogTitle>
                    <DialogContent dividers>
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
                            <Typography variant="body1" paragraph>
                                No active membership to cancel.
                             </Typography>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                         <Button onClick={() => setShowCancelDialog(false)} variant="outlined">
                            Back
                        </Button>
                        <Button
                            onClick={handleCancelMembership}
                            variant="contained"
                            color="error"
                            disabled={!membership}
                            sx={{ fontWeight: 'medium' }}
                        >
                            Confirm Cancellation
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </>
    );
};

export default MembershipView; 