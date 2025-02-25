import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Card,
    CardMedia,
    CardContent,
    Typography,
    Button,
    Box,
    CircularProgress,
    AppBar,
    Toolbar,
    IconButton,
    Paper,
    Chip,
    Rating
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BookingDialog from '../bookings/BookingDialog';
import RatingDisplay from '../common/RatingDisplay';
import CarRatings from './CarRatings';

interface Car {
    id: number;
    make: string;
    model: string;
    year: number;
    registration_number: string;
    daily_rate: number;
    location: string;
    availability_status: string;
    image_url: string;
    average_rating: number;
    total_ratings: number;
}

const CarList = () => {
    const [cars, setCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [selectedCar, setSelectedCar] = useState<Car | null>(null);
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
    const [ratingsDialogOpen, setRatingsDialogOpen] = useState(false);
    const [selectedCarForRatings, setSelectedCarForRatings] = useState<Car | null>(null);

    useEffect(() => {
        fetchCars();
    }, []);

    const fetchCars = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/cars');
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch cars');
            }
            
            setCars(data);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    return (
        <>
            <AppBar position="fixed" sx={{ backgroundColor: '#1976d2' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate('/dashboard')}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Available Cars
                    </Typography>
                </Toolbar>
            </AppBar>
            <Toolbar />

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3, mb: 4, backgroundColor: '#f8f9fa' }}>
                    <Typography variant="h4" gutterBottom color="primary">
                        Our Fleet
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Choose from our selection of quality vehicles available for rent.
                    </Typography>
                </Paper>

                <Grid container spacing={4}>
                    {cars.map((car) => (
                        <Grid item xs={12} sm={6} md={4} key={car.id}>
                            <Card sx={{ 
                                height: '100%', 
                                display: 'flex', 
                                flexDirection: 'column',
                                transition: '0.3s',
                                '&:hover': {
                                    transform: 'translateY(-5px)',
                                    boxShadow: 6
                                }
                            }}>
                                <CardMedia
                                    component="img"
                                    height="200"
                                    image={car.image_url || 'https://via.placeholder.com/300x200?text=Car+Image'}
                                    alt={`${car.make} ${car.model}`}
                                    sx={{ objectFit: 'cover' }}
                                />
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h5" gutterBottom>
                                        {car.make} {car.model}
                                    </Typography>
                                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                        {car.year}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <LocationOnIcon sx={{ color: 'text.secondary', mr: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {car.location}
                                        </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <AttachMoneyIcon sx={{ color: 'primary.main', mr: 1 }} />
                                        <Typography variant="h6" color="primary">
                                            £{car.daily_rate}/day
                                        </Typography>
                                    </Box>

                                    <Box 
                                        sx={{ mb: 2, cursor: 'pointer' }} 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedCarForRatings(car);
                                            setRatingsDialogOpen(true);
                                        }}
                                    >
                                        <RatingDisplay 
                                            rating={car.average_rating} 
                                            totalRatings={car.total_ratings}
                                        />
                                    </Box>

                                    <Chip 
                                        label={car.availability_status}
                                        color={car.availability_status === 'available' ? 'success' : 'error'}
                                        sx={{ mb: 2 }}
                                    />
                                </CardContent>
                                <Box sx={{ p: 2, pt: 0 }}>
                                    <Button 
                                        variant="contained" 
                                        fullWidth 
                                        disabled={car.availability_status !== 'available'}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('Button clicked');
                                            console.log('Car:', car);
                                            setSelectedCar(car);
                                            setBookingDialogOpen(true);
                                            console.log('Dialog should open');
                                        }}
                                        sx={{ 
                                            mt: 'auto',
                                            backgroundColor: car.availability_status === 'available' ? 'primary.main' : 'grey.300'
                                        }}
                                    >
                                        {car.availability_status === 'available' ? 'Book Now' : 'Not Available'}
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {selectedCar && (
                <BookingDialog
                    open={bookingDialogOpen}
                    onClose={() => {
                        setBookingDialogOpen(false);
                        setSelectedCar(null);
                    }}
                    car={selectedCar}
                />
            )}

            {selectedCarForRatings && (
                <CarRatings
                    open={ratingsDialogOpen}
                    onClose={() => {
                        setRatingsDialogOpen(false);
                        setSelectedCarForRatings(null);
                    }}
                    carId={selectedCarForRatings.id}
                    carName={`${selectedCarForRatings.make} ${selectedCarForRatings.model}`}
                />
            )}
        </>
    );
};

export default CarList; 