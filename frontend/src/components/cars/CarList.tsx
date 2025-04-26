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
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
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
    required_membership?: 'none' | 'basic' | 'premium' | 'platinum';
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

    // Add these imports and methods to the CarList component
    // Add state for user membership
    const [userMembership, setUserMembership] = useState<string | null>(null);
    const [membershipLoading, setMembershipLoading] = useState(true);

    // Add state for the membership dialog
    const [showMembershipDialog, setShowMembershipDialog] = useState(false);
    const [selectedCarForMembership, setSelectedCarForMembership] = useState<Car | null>(null);

    // Add useEffect to fetch user membership
    useEffect(() => {
        const fetchUserMembership = async () => {
            try {
                setMembershipLoading(true);
                const token = localStorage.getItem('token');
                
                if (!token) {
                    setMembershipLoading(false);
                    setUserMembership(null);
                    return;
                }

                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/memberships`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (response.status === 404) {
                    // User doesn't have a membership
                    setUserMembership(null);
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch membership data');
                }

                const data = await response.json();
                setUserMembership(data.type);
            } catch (err) {
                console.error('Error fetching membership:', err);
                setUserMembership(null);
            } finally {
                setMembershipLoading(false);
            }
        };

        fetchUserMembership();
    }, []);

    // Add method to check if user meets membership requirement
    const isMembershipSufficient = (requiredMembership?: string) => {
        if (!requiredMembership || requiredMembership === 'none') {
            return true;
        }

        if (!userMembership) {
            return false;
        }

        const membershipLevels = {
            'none': 0,
            'basic': 1,
            'premium': 2,
            'platinum': 3
        };

        const userLevel = membershipLevels[userMembership as keyof typeof membershipLevels];
        const requiredLevel = membershipLevels[requiredMembership as keyof typeof membershipLevels];
        
        return userLevel >= requiredLevel;
    };

    // Add method to get button text based on car
    const getBookButtonText = (car: Car) => {
        if (car.availability_status !== 'available') {
            return 'Not Available';
        }
        
        if (membershipLoading) {
            return 'Loading...';
        }
        
        if (!isMembershipSufficient(car.required_membership)) {
            return `Requires ${car.required_membership}`;
        }
        
        return 'Book Now';
    };

    useEffect(() => {
        fetchCars();
    }, []);

    useEffect(() => {
        filterCars();
    }, [cars, searchTerm, priceRange, selectedType, selectedAvailability]);

    const fetchCars = async () => {
        try {
            // Use the available endpoint which now returns all cars regardless of membership
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cars/available`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch cars');
            }
            
            console.log('Fetched cars data:', data); // Debug log
            
            // Process the cars data to ensure address is properly set
            const processedCars = data.map((car: Car) => {
                console.log(`Processing car ${car.make} ${car.model}:`, {
                    address: car.address,
                    location: car.location,
                    required_membership: car.required_membership
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

    const getMembershipColor = (membershipType: string) => {
        switch (membershipType) {
            case 'platinum': return '#FFD700'; // Gold
            case 'premium': return '#1976d2';  // Blue
            case 'basic': return '#2E7D32';    // Green
            default: return '#757575';         // Grey
        }
    };

    // Add this function to handle booking button click
    const handleBookButtonClick = (car: Car) => {
        if (isMembershipSufficient(car.required_membership)) {
            console.log('Button clicked');
            console.log('Car:', car);
            setSelectedCar(car);
            setBookingDialogOpen(true);
            console.log('Dialog should open');
        } else {
            // Show membership dialog instead of redirecting
            setSelectedCarForMembership(car);
            setShowMembershipDialog(true);
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
                                },
                                position: 'relative'
                            }}>
                                {car.required_membership && car.required_membership !== 'none' && (
                                    <Box 
                                        sx={{ 
                                            position: 'absolute', 
                                            top: 0, 
                                            right: 0, 
                                            backgroundColor: getMembershipColor(car.required_membership),
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderBottomLeftRadius: '8px',
                                            fontWeight: 'bold',
                                            fontSize: '0.75rem',
                                            zIndex: 2
                                        }}
                                    >
                                        {car.required_membership.toUpperCase()} ONLY
                                    </Box>
                                )}
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
                                            handleBookButtonClick(car);
                                        }}
                                        sx={{ 
                                            mt: 'auto',
                                            backgroundColor: car.availability_status === 'available' 
                                                ? (isMembershipSufficient(car.required_membership) ? 'primary.main' : 'warning.main')
                                                : 'grey.300'
                                        }}
                                    >
                                        {getBookButtonText(car)}
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
                        address: (selectedCar.address || selectedCar.location || 'No location set for this vehicle') as string,
                        required_membership: selectedCar.required_membership
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

            {showMembershipDialog && selectedCarForMembership && (
                <Dialog 
                    open={showMembershipDialog} 
                    onClose={() => setShowMembershipDialog(false)}
                    PaperProps={{
                        sx: { borderRadius: 2, maxWidth: 500 }
                    }}
                >
                    <DialogTitle sx={{ pt: 3, pb: 1 }}>
                        <Typography variant="h5" fontWeight="bold" color="warning.main">
                            Membership Required
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            This vehicle requires a {selectedCarForMembership.required_membership} membership.
                        </Alert>
                        <Typography variant="body1" paragraph>
                            To book the {selectedCarForMembership.make} {selectedCarForMembership.model}, you need to upgrade your membership to {selectedCarForMembership.required_membership} or higher.
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
                            {userMembership ? 
                                `Your current membership level (${userMembership}) doesn't meet the requirement.` : 
                                "You currently don't have an active membership."}
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={() => setShowMembershipDialog(false)} variant="outlined">
                            Close
                        </Button>
                        <Button 
                            onClick={() => {
                                setShowMembershipDialog(false);
                                navigate('/membership');
                            }} 
                            variant="contained" 
                            color="warning"
                            sx={{ fontWeight: 'bold' }}
                        >
                            Upgrade Membership
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
};

export default CarList; 