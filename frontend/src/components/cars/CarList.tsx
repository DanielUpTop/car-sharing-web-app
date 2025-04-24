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
    Rating,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Slider,
    Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SearchIcon from '@mui/icons-material/Search';
import BookingDialog from '../bookings/BookingDialog';
import RatingDisplay from '../common/RatingDisplay';
import CarRatings from './CarRatings';

interface Car {
    id: number;
    make: string;
    model: string;
    type: string;
    pricePerHour: number;
    image: string;
    daily_rate: number;
    availability_status: 'available' | 'booked' | 'maintenance';
    average_rating?: number;
    total_ratings?: number;
    location?: string;
    address?: string;
}

const CarList = () => {
    const [cars, setCars] = useState<Car[]>([]);
    const [filteredCars, setFilteredCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [selectedCar, setSelectedCar] = useState<Car | null>(null);
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
    const [ratingsDialogOpen, setRatingsDialogOpen] = useState(false);
    const [selectedCarForRatings, setSelectedCarForRatings] = useState<Car | null>(null);
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedAvailability, setSelectedAvailability] = useState<string>('all');

    useEffect(() => {
        fetchCars();
    }, []);

    useEffect(() => {
        filterCars();
    }, [cars, searchTerm, priceRange, selectedType, selectedAvailability]);

    const fetchCars = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/cars');
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch cars');
            }
            
            console.log('Fetched cars data:', data); // Debug log
            
            // Process the cars data to ensure address is properly set
            const processedCars = data.map((car: Car) => {
                console.log(`Processing car ${car.make} ${car.model}:`, {
                    address: car.address,
                    location: car.location
                }); // Debug log
                return {
                    ...car,
                    address: car.address || car.location
                };
            });
            
            console.log('Processed cars:', processedCars); // Debug log
            setCars(processedCars);
            setFilteredCars(processedCars);
        } catch (error) {
            console.error('Error fetching cars:', error);
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const filterCars = () => {
        let filtered = [...cars];

        // Search by make or model
        if (searchTerm) {
            filtered = filtered.filter(car => 
                car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                car.model.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by price range
        filtered = filtered.filter(car => {
            const price = car.type === 'hourly' ? car.pricePerHour : car.daily_rate;
            return price >= priceRange[0] && price <= priceRange[1];
        });

        // Filter by type
        if (selectedType !== 'all') {
            filtered = filtered.filter(car => car.type === selectedType);
        }

        // Filter by availability
        if (selectedAvailability !== 'all') {
            filtered = filtered.filter(car => car.availability_status === selectedAvailability);
        }

        setFilteredCars(filtered);
    };

    const handlePriceRangeChange = (event: Event, newValue: number | number[]) => {
        setPriceRange(newValue as [number, number]);
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
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        Choose from our selection of quality vehicles available for rent.
                    </Typography>

                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search by make or model..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box>
                            <Typography gutterBottom>Price Range</Typography>
                            <Slider
                                value={priceRange}
                                onChange={handlePriceRangeChange}
                                valueLabelDisplay="auto"
                                min={0}
                                max={100}
                                step={5}
                            />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2">£{priceRange[0]}</Typography>
                                <Typography variant="body2">£{priceRange[1]}</Typography>
                            </Box>
                        </Box>

                        <Box display="flex" gap={2}>
                            <FormControl fullWidth>
                                <InputLabel>Car Type</InputLabel>
                                <Select
                                    value={selectedType}
                                    label="Car Type"
                                    onChange={(e) => setSelectedType(e.target.value)}
                                >
                                    <MenuItem value="all">All Types</MenuItem>
                                    <MenuItem value="hourly">Hourly</MenuItem>
                                    <MenuItem value="daily">Daily</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>Availability</InputLabel>
                                <Select
                                    value={selectedAvailability}
                                    label="Availability"
                                    onChange={(e) => setSelectedAvailability(e.target.value)}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="available">Available</MenuItem>
                                    <MenuItem value="booked">Booked</MenuItem>
                                    <MenuItem value="maintenance">Maintenance</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Stack>
                </Paper>

                <Grid container spacing={4}>
                    {filteredCars.map((car) => (
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
                                    image={car.image || 'https://via.placeholder.com/300x200?text=Car+Image'}
                                    alt={`${car.make} ${car.model}`}
                                    sx={{ objectFit: 'cover' }}
                                />
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h5" gutterBottom>
                                        {car.make} {car.model}
                                    </Typography>
                                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                        {car.type}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <LocationOnIcon sx={{ color: 'text.secondary', mr: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {car.address || car.location || 'Location will be provided upon booking'}
                                        </Typography>
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {car.type === 'hourly' ? `£${car.pricePerHour}/hour` : `£${car.daily_rate}/day`}
                                    </Typography>

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
                                            rating={car.average_rating || 0}
                                            totalRatings={car.total_ratings || 0}
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
                        setSelectedCar(null);
                        setBookingDialogOpen(false);
                    }}
                    car={{
                        id: selectedCar.id,
                        make: selectedCar.make,
                        model: selectedCar.model,
                        type: selectedCar.type,
                        pricePerHour: selectedCar.pricePerHour,
                        image: selectedCar.image,
                        address: (selectedCar.address || selectedCar.location || 'No location set for this vehicle') as string
                    }}
                    onBookingComplete={() => navigate('/dashboard/bookings')}
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