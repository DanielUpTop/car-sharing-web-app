import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    CircularProgress,
    Paper,
    Grid,
    AppBar,
    Toolbar,
    IconButton,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Rewards icon
import StarIcon from '@mui/icons-material/Star'; // Icon for reward tiers

// Interface for the user profile data (ensure it matches backend response)
interface UserProfile {
    first_name: string;
    last_name: string;
    email: string;
    reward_points: number;
    // Add other fields if needed
}

const RewardsPage = () => {
    console.log('[RewardsPage] Component rendering');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        console.log('[RewardsPage] useEffect running');
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        console.log('[RewardsPage] fetchUserProfile started');
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login'); // Redirect if not logged in
                return;
            }
            console.log('[RewardsPage] Fetching from /api/users/profile...');
            const response = await fetch('http://localhost:5001/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('[RewardsPage] Fetch response status:', response.status);
            if (response.status === 403) {
                 console.log('[RewardsPage] Fetch response 403, logging out');
                 localStorage.removeItem('token');
                 navigate('/login');
                 return;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }
            const data: UserProfile = await response.json();
            console.log('[RewardsPage] Fetch successful, data:', data);
            setUserProfile(data);
        } catch (err) {
            console.error('[RewardsPage] Error fetching user profile:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while loading rewards data.');
        } finally {
            console.log('[RewardsPage] fetchUserProfile finally block');
            setIsLoading(false);
        }
    };

    const rewardPoints = userProfile?.reward_points ?? 0;

    // Define reward tiers
    const rewardTiers = [
        { points: 1, discount: 5, description: '£5 off your next booking' },
        { points: 20, discount: 15, description: '£15 off your next booking' },
        { points: 30, discount: 20, description: '£20 off your next booking' },
    ];

    // Determine overall loading state, considering only data fetch
    const showLoadingSpinner = isLoading;

    console.log('[RewardsPage] Before return:', { isLoading, error, userProfile });
    return (
        <>
            <AppBar position="fixed">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate('/dashboard')} // Navigate back to the main dashboard
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        My Rewards
                    </Typography>
                </Toolbar>
            </AppBar>
            <Toolbar /> {/* Spacer for the fixed AppBar */}

            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                {showLoadingSpinner ? ( // Use combined loading state
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Typography color="error" textAlign="center">{error}</Typography>
                ) : userProfile ? (
                    <Grid container spacing={3}>
                        {/* Current Points Card */}
                        <Grid item xs={12}>
                            <Card sx={{ bgcolor: '#fff3e0', textAlign: 'center', p: 3 }}>
                                <EmojiEventsIcon sx={{ fontSize: 60, color: '#ff9800' }} />
                                <Typography variant="h4" component="p" fontWeight="bold" color="#ff9800" mt={1}>
                                    {rewardPoints}
                                </Typography>
                                <Typography variant="h6" component="div" gutterBottom>
                                    Your Reward Points
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Earn 1 point for every confirmed booking.
                                </Typography>
                            </Card>
                        </Grid>

                        {/* Available Rewards Section */}
                        <Grid item xs={12}>
                            <Paper elevation={2} sx={{ p: 3 }}>
                                <Typography variant="h5" gutterBottom mb={2}>
                                    Available Rewards
                                </Typography>
                                <List>
                                    {rewardTiers.map((tier) => (
                                        <ListItem 
                                            key={tier.points} 
                                            sx={{ 
                                                mb: 1, 
                                                border: '1px solid', 
                                                borderColor: rewardPoints >= tier.points ? 'success.main' : 'grey.300',
                                                borderRadius: 1,
                                                opacity: rewardPoints >= tier.points ? 1 : 0.6
                                            }}
                                        >
                                            <ListItemIcon>
                                                <StarIcon sx={{ color: rewardPoints >= tier.points ? 'success.main' : 'grey.500' }}/>
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary={`${tier.points} Points: ${tier.description}`}
                                                secondary={rewardPoints >= tier.points ? 'Unlocked!' : `Need ${tier.points - rewardPoints} more points`}
                                            />
                                            {/* Potential future button to redeem directly? For now, just display */}
                                        </ListItem>
                                    ))}
                                </List>
                                <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>
                                     You can apply your unlocked rewards during the booking checkout process.
                                 </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                ) : (
                    <Typography textAlign="center">Could not load user rewards information.</Typography>
                )}
            </Container>
        </>
    );
};

export default RewardsPage; 