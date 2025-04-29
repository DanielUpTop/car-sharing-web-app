import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Button,
    IconButton,
    Grid,
    Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// Import interfaces if they exist in a shared types file
// For now, defining a basic Car interface here
interface Car {
    id: number;
    make: string;
    model: string;
    year: number;
    image_url: string;
    price_per_hour: number;
    daily_rate: number;
    type: string;
    seats: number;
    address: string;
    location: string;
    availability_status: string;
    required_membership?: string;
    // Add other relevant fields from your backend response
}

const CarDetailView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [car, setCar] = useState<Car | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCarDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cars/${id}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                const data: Car = await response.json();
                setCar(data);
            } catch (err) {
                console.error("Error fetching car details:", err);
                setError(err instanceof Error ? err.message : 'Failed to load car details.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCarDetails();
        } else {
            setError('Car ID not provided.');
            setLoading(false);
        }
    }, [id]);

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
                <ArrowBackIcon />
            </IconButton>
            <Paper elevation={3} sx={{ p: 3 }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && (
                    <Alert severity="error">Error loading car details: {error}</Alert>
                )}
                {!loading && !error && car && (
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ maxHeight: 400, overflow: 'hidden', borderRadius: 1, mb: 2 }}>
                                <img 
                                    src={car.image_url || '/images/default-car.png'} 
                                    alt={`${car.make} ${car.model}`} 
                                    style={{ width: '100%', height: 'auto', objectFit: 'cover' }} 
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h4" component="h1" gutterBottom>
                                {car.make} {car.model}
                            </Typography>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                {car.year}
                            </Typography>
                            {/* Example details - add more as needed */}
                             <Chip label={car.type} size="small" sx={{ mr: 1, mb: 1 }} />
                             <Chip label={`${car.seats} Seats`} size="small" sx={{ mr: 1, mb: 1 }} />
                             <Chip label={car.availability_status} size="small" color={car.availability_status === 'available' ? 'success' : 'default'} sx={{ mr: 1, mb: 1 }} />
                             {car.required_membership && car.required_membership !== 'basic' && car.required_membership !== 'none' && (
                                 <Chip label={`Requires ${car.required_membership}`} size="small" color="info" sx={{ mr: 1, mb: 1 }} />
                             )}
                            <Typography sx={{ mt: 2 }}>
                                Address: {car.address || car.location || 'N/A'}
                            </Typography>
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h5" component="div" color="primary">
                                    £{car.price_per_hour?.toFixed(2)}/hr
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    £{car.daily_rate?.toFixed(2)}/day
                                </Typography>
                            </Box>
                             {/* Add Booking Button/Logic Here */}
                             <Button 
                                 variant="contained" 
                                 sx={{ mt: 3 }}
                                 disabled={car.availability_status !== 'available'}
                                 // onClick={handleOpenBookingDialog} // TODO: Add booking dialog logic
                             >
                                 Book Now
                             </Button>
                        </Grid>
                    </Grid>
                )}
                {!loading && !car && !error && (
                     <Typography>Car not found.</Typography>
                )}
            </Paper>
        </Container>
    );
};

export default CarDetailView; 