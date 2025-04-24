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
    IconButton
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

interface Membership {
    id: number;
    type: 'basic' | 'premium' | 'platinum';
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

const membershipLevels = {
    basic: {
        color: '#757575',
        price: 9.99,
        benefits: [
            'Basic insurance coverage',
            'Standard booking priority',
            '5% discount on rentals',
            '1 free cancellation per month'
        ]
    },
    premium: {
        color: '#1976d2',
        price: 19.99,
        benefits: [
            'Enhanced insurance coverage',
            'Priority booking',
            '10% discount on rentals',
            '3 free cancellations per month',
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
            'Unlimited free cancellations',
            'Dedicated customer support',
            'Free upgrades when available'
        ]
    }
};

const MembershipView = () => {
    const [membership, setMembership] = useState<Membership | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openUpgrade, setOpenUpgrade] = useState(false);
    const [selectedType, setSelectedType] = useState<'basic' | 'premium' | 'platinum'>('basic');
    const navigate = useNavigate();

    useEffect(() => {
        fetchMembership();
    }, []);

    const fetchMembership = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/membership`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 404) {
                setMembership(null);
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch membership data');
            }

            const data = await response.json();
            setMembership(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching membership:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/membership/upgrade`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type: selectedType })
            });

            if (!response.ok) {
                throw new Error('Failed to upgrade membership');
            }

            await fetchMembership();
            setOpenUpgrade(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upgrade membership');
            console.error('Error upgrading membership:', err);
        }
    };

    const getBenefitIcon = (benefit: string) => {
        if (benefit.includes('insurance')) return <SecurityIcon color="primary" />;
        if (benefit.includes('booking')) return <CarIcon color="primary" />;
        if (benefit.includes('discount')) return <DiscountIcon color="primary" />;
        if (benefit.includes('support')) return <SupportIcon color="primary" />;
        return <CheckCircleIcon color="primary" />;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    const getMembershipColor = (type: string) => {
        switch (type) {
            case 'basic': return 'primary';
            case 'premium': return 'secondary';
            case 'platinum': return 'warning';
            default: return 'default';
        }
    };

    return (
        <>
            <AppBar position="fixed" color="primary">
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
                        <CardMembershipIcon sx={{ mr: 2 }} />
                        <Typography variant="h6">Membership Management</Typography>
                    </Box>
                </Toolbar>
            </AppBar>
            <Toolbar />

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {membership && (
                    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <StarIcon sx={{ color: membershipLevels[membership.type].color, mr: 1, fontSize: 32 }} />
                            <Typography variant="h4">
                                {membership.type.charAt(0).toUpperCase() + membership.type.slice(1)} Membership
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Box display="flex" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                            <Chip
                                label={membership.status.toUpperCase()}
                                color={membership.status === 'active' ? 'success' : 'error'}
                                sx={{ fontWeight: 'bold', fontSize: '0.9rem', py: 2, px: 1 }}
                            />
                            <Chip
                                label={`Auto-renew: ${membership.auto_renew ? 'Enabled' : 'Disabled'}`}
                                color={membership.auto_renew ? 'info' : 'default'}
                                variant="outlined"
                            />
                        </Box>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>Membership Details</Typography>
                                        <List>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <CheckCircleIcon color="primary" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary="Start Date"
                                                    secondary={format(new Date(membership.start_date), 'PPP')}
                                                />
                                            </ListItem>
                                            {membership.end_date && (
                                                <ListItem>
                                                    <ListItemIcon>
                                                        <CheckCircleIcon color="primary" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary="End Date"
                                                        secondary={format(new Date(membership.end_date), 'PPP')}
                                                    />
                                                </ListItem>
                                            )}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>Current Benefits</Typography>
                                        <List>
                                            {membershipLevels[membership.type].benefits.map((benefit, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        {getBenefitIcon(benefit)}
                                                    </ListItemIcon>
                                                    <ListItemText primary={benefit} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Paper>
                )}

                <Typography variant="h4" gutterBottom sx={{ mt: 6, mb: 3, fontWeight: 'bold' }}>
                    Membership Plans
                </Typography>

                <Grid container spacing={3}>
                    {Object.entries(membershipLevels).map(([type, details]) => (
                        <Grid item xs={12} md={4} key={type}>
                            <Card 
                                sx={{ 
                                    height: '100%',
                                    border: membership?.type === type ? 3 : 0,
                                    borderColor: 'primary.main',
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                    '&:hover': { 
                                        transform: 'translateY(-10px)', 
                                        boxShadow: 6
                                    }
                                }}
                            >
                                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                                    <Box position="relative" mb={4}>
                                        <StarIcon 
                                            sx={{ 
                                                fontSize: 60, 
                                                color: details.color, 
                                                filter: type === 'platinum' ? 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.7))' : 'none'
                                            }} 
                                        />
                                        {membership?.type === type && (
                                            <Chip 
                                                label="CURRENT PLAN" 
                                                color="success" 
                                                size="small"
                                                sx={{ 
                                                    position: 'absolute', 
                                                    top: '-15px', 
                                                    right: '-15px',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.7rem'
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Typography 
                                        variant="h5" 
                                        component="h2" 
                                        fontWeight="bold"
                                        mb={2}
                                        color={type === 'platinum' ? 'warning.dark' : 'text.primary'}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Typography>
                                    <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
                                        £{details.price}
                                        <Typography component="span" variant="subtitle1" color="text.secondary">
                                            /month
                                        </Typography>
                                    </Typography>
                                    <Divider sx={{ my: 3 }} />
                                    <List sx={{ textAlign: 'left' }}>
                                        {details.benefits.map((benefit, index) => (
                                            <ListItem key={index} sx={{ py: 1 }}>
                                                <ListItemIcon>
                                                    {getBenefitIcon(benefit)}
                                                </ListItemIcon>
                                                <ListItemText primary={benefit} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'center', p: 3 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color={type === 'platinum' ? 'warning' : 'primary'}
                                        size="large"
                                        disabled={membership?.type === type}
                                        onClick={() => {
                                            setSelectedType(type as 'basic' | 'premium' | 'platinum');
                                            setOpenUpgrade(true);
                                        }}
                                        sx={{ 
                                            py: 1.5,
                                            fontWeight: 'bold',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        {membership?.type === type ? 'Current Plan' : 
                                        (!membership ? 'Choose Plan' : 'Upgrade')}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Dialog 
                    open={openUpgrade} 
                    onClose={() => setOpenUpgrade(false)}
                    PaperProps={{
                        sx: { borderRadius: 2, px: 1 }
                    }}
                >
                    <DialogTitle sx={{ pt: 3, px: 3, pb: 1 }}>
                        <Typography variant="h5" fontWeight="bold">
                            {!membership ? 'Subscribe to Membership' : 'Upgrade Membership'}
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <StarIcon sx={{ 
                                color: membershipLevels[selectedType].color, 
                                mr: 2, 
                                fontSize: 40,
                                filter: selectedType === 'platinum' ? 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.7))' : 'none'
                            }} />
                            <Typography variant="h6">
                                {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Membership
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 3 }} />
                        <Typography variant="body1" mb={3}>
                            {!membership 
                                ? `You are about to subscribe to our ${selectedType} membership plan.` 
                                : `You are about to upgrade from ${membership.type} to ${selectedType} membership.`}
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                            You will be charged £{membershipLevels[selectedType].price} monthly.
                        </Typography>
                        <Box mt={2}>
                            <Typography variant="body2" color="text.secondary">
                                *By confirming, you agree to our Terms of Service and authorize us to bill your account monthly until you cancel.
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ pb: 3, px: 3 }}>
                        <Button 
                            onClick={() => setOpenUpgrade(false)}
                            variant="outlined"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUpgrade} 
                            variant="contained" 
                            color={selectedType === 'platinum' ? 'warning' : 'primary'}
                            sx={{ fontWeight: 'bold', px: 3 }}
                        >
                            Confirm
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </>
    );
};

export default MembershipView; 