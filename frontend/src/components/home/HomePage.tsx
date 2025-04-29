import React from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    useTheme,
    AppBar,
    Toolbar,
    Fade,
    Slide
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SavingsIcon from '@mui/icons-material/Savings';
import SecurityIcon from '@mui/icons-material/Security';

const HomePage = () => {
    const navigate = useNavigate();
    const theme = useTheme();

    return (
        <Box sx={{ bgcolor: '#f8f9fa' }}>
            {/* Navigation Bar */}
            <AppBar 
                position="fixed" 
                sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}
            >
                <Toolbar>
                    <Typography 
                        variant="h5" 
                        component="div" 
                        sx={{ 
                            flexGrow: 1, 
                            fontWeight: 700,
                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        CarShare
                    </Typography>
                    <Button 
                        color="primary" 
                        onClick={() => navigate('/login')}
                        sx={{ 
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.08)' }
                        }}
                    >
                        Sign in
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={() => navigate('/register')}
                        sx={{ 
                            ml: 2,
                            px: 3,
                            fontWeight: 600,
                            borderRadius: 2,
                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #1976D2 30%, #21CBF3 90%)',
                            }
                        }}
                    >
                        Join now
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Hero Section */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1976D2 0%, #21CBF3 100%)',
                    color: 'white',
                    pt: { xs: 12, md: 20 },
                    pb: { xs: 10, md: 15 },
                    position: 'relative',
                    overflow: 'hidden',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '20%',
                        background: 'linear-gradient(to top, #f8f9fa 0%, transparent 100%)'
                    }
                }}
            >
                <Container maxWidth="lg">
                    <Fade in timeout={1000}>
                        <Grid container spacing={6} alignItems="center">
                            <Grid item xs={12} md={6}>
                                <Typography 
                                    variant="h1" 
                                    gutterBottom
                                    sx={{ 
                                        fontSize: { xs: '2.5rem', md: '3.5rem' },
                                        fontWeight: 700,
                                        lineHeight: 1.2
                                    }}
                                >
                                    Wheels when you want them™
                                </Typography>
                                <Typography 
                                    variant="h5" 
                                    paragraph
                                    sx={{ 
                                        opacity: 0.9,
                                        mb: 4,
                                        fontWeight: 300
                                    }}
                                >
                                    Book cars by the hour or day. Gas and insurance included.
                                </Typography>
                                <Button 
                                    variant="contained" 
                                    size="large"
                                    onClick={() => navigate('/register')}
                                    sx={{ 
                                        px: 4,
                                        py: 2,
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        bgcolor: '#fff',
                                        color: 'primary.main',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.9)',
                                        }
                                    }}
                                >
                                    Start Your Journey
                                </Button>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box 
                                    component="img"
                                    src="/CarSharingHomepage.jpg"
                                    alt="Luxury car rental"
                                    sx={{
                                        width: '120%',
                                        maxWidth: 700,
                                        height: 'auto',
                                        display: { xs: 'none', md: 'block' },
                                        
                                        filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))'
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Fade>
                </Container>
            </Box>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
                <Slide direction="up" in timeout={1000}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography 
                            variant="h2" 
                            align="center" 
                            gutterBottom
                            sx={(theme) => ({
                                fontWeight: 700,
                                fontSize: { xs: '2rem', md: '2.5rem' },
                                mb: 6,
                                backgroundColor: theme.palette.primary.main,
                                color: theme.palette.common.white,
                                padding: theme.spacing(1, 3),
                                borderRadius: 2,
                                display: 'inline-block'
                            })}
                        >
                            The smarter way to rent a car
                        </Typography>
                        <Grid container spacing={4}>
                            {[
                                {
                                    icon: <DirectionsCarIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
                                    title: 'Premium Cars',
                                    description: 'Access to a wide range of quality vehicles, from economy to luxury.'
                                },
                                {
                                    icon: <AccessTimeIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
                                    title: '24/7 Availability',
                                    description: 'Book and access cars whenever you need, day or night.'
                                },
                                {
                                    icon: <SecurityIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
                                    title: 'Full Insurance',
                                    description: "Drive with peace of mind knowing you're fully covered."
                                },
                                {
                                    icon: <SavingsIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
                                    title: 'Best Rates',
                                    description: 'Competitive pricing with no hidden fees or surprises.'
                                }
                            ].map((feature, index) => (
                                <Grid item xs={12} sm={6} md={3} key={index}>
                                    <Card 
                                        sx={{ 
                                            height: '100%',
                                            borderRadius: 3,
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ textAlign: 'center', p: 4 }}>
                                            {feature.icon}
                                            <Typography 
                                                variant="h6" 
                                                component="div" 
                                                sx={{ mt: 2, fontWeight: 600 }}
                                            >
                                                {feature.title}
                                            </Typography>
                                            <Typography 
                                                variant="body2" 
                                                color="text.secondary"
                                                sx={{ mt: 1 }}
                                            >
                                                {feature.description}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Slide>
            </Container>

            {/* CTA Section */}
            <Box 
                sx={{ 
                    bgcolor: '#1976D2',
                    py: { xs: 8, md: 12 },
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Container maxWidth="md">
                    <Box textAlign="center">
                        <Typography 
                            variant="h3" 
                            gutterBottom
                            sx={{ 
                                fontWeight: 700,
                                fontSize: { xs: '2rem', md: '2.75rem' }
                            }}
                        >
                            Ready to get started?
                        </Typography>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                mb: 4,
                                opacity: 0.9,
                                fontWeight: 300
                            }}
                        >
                            Join now and get your first month free!
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => navigate('/register')}
                            sx={{ 
                                px: 6,
                                py: 2,
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                bgcolor: 'white',
                                color: 'primary.main',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.9)',
                                }
                            }}
                        >
                            Sign Up Now
                        </Button>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
};

export default HomePage; 