import React from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    AppBar,
    Toolbar,
    IconButton,
    Grid,
    Card,
    CardContent,
    CardActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HelpIcon from '@mui/icons-material/Help';
import ChatIcon from '@mui/icons-material/Chat';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import SecurityIcon from '@mui/icons-material/Security';

const Dashboard = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <>
            <AppBar position="fixed">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Car Sharing Dashboard
                    </Typography>
                    <IconButton color="inherit" onClick={handleLogout}>
                        <LogoutIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Toolbar />

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                        }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                                <DirectionsCarIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">
                                    Available Cars
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Browse our selection of available cars for rent.
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                                <Button 
                                    onClick={() => navigate('/dashboard/cars')}
                                    variant="contained" 
                                    color="primary"
                                    size="large"
                                >
                                    Browse Cars
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                        }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                                <BookOnlineIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">
                                    My Bookings
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    View and manage your current car bookings.
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                                <Button 
                                    onClick={() => navigate('/dashboard/bookings')}
                                    variant="contained" 
                                    color="primary"
                                    size="large"
                                >
                                    View Bookings
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                        }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                                <PersonIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">
                                    My Profile
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    View and manage your personal information
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                                <Button 
                                    onClick={() => navigate('/dashboard/profile')}
                                    variant="contained" 
                                    color="primary"
                                    size="large"
                                >
                                    View Profile
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                        }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                                <DashboardIcon sx={{ fontSize: 60, color: 'info.main', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">
                                    User Dashboard
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    View your booking statistics and analytics
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                                <Button 
                                    onClick={() => navigate('/dashboard/stats')}
                                    variant="contained" 
                                    color="info"
                                    size="large"
                                >
                                    View Dashboard
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                        }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                                <HelpIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">
                                    Help Center
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Get help, view FAQs, and manage support tickets
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                                <Button 
                                    onClick={() => navigate('/dashboard/help')}
                                    variant="contained" 
                                    color="primary"
                                    size="large"
                                >
                                    View Help Center
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                        }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                                <CardMembershipIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">
                                    Membership
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    View and manage your membership plans and benefits
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                                <Button 
                                    onClick={() => navigate('/dashboard/membership')}
                                    variant="contained" 
                                    color="primary"
                                    size="large"
                                >
                                    View Membership
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                        }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                                <SecurityIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">
                                    Insurance
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Manage your insurance policies and claims
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                                <Button 
                                    onClick={() => navigate('/dashboard/insurance')}
                                    variant="contained" 
                                    color="primary"
                                    size="large"
                                >
                                    View Insurance
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                        }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                                <ChatIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">
                                    Live Chat
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Chat with our support team in real-time
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                                <Button 
                                    onClick={() => navigate('/dashboard/chat')}
                                    variant="contained" 
                                    color="primary"
                                    size="large"
                                >
                                    Start Chat
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </>
    );
};

export default Dashboard; 