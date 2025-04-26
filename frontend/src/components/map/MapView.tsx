import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
    Box,
    TextField,
    InputAdornment,
    Paper,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Container,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import CarMarker from './CarMarker';

// Add custom styles to match Zipcar
import './MapView.css';

// MapCenter component to programmatically change the map center
const MapCenter = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 15);
    }, [center, map]);
    return null;
};

interface Car {
    id: number;
    make: string;
    model: string;
    type: 'electric' | 'hybrid' | 'petrol';
    price_per_hour: string | number;
    daily_rate: number;
    image_url: string;
    availability_status: 'available' | 'booked' | 'maintenance';
    latitude: number;
    longitude: number;
    address: string;
    location: string;
    required_membership?: 'none' | 'basic' | 'premium' | 'platinum';
}

interface GeocodingResult {
    display_name: string;
    lat: string;
    lon: string;
    place_id: number;
}

const MapView = () => {
    const [cars, setCars] = useState<Car[]>([]);
    const [searchLocation, setSearchLocation] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([51.5074, -0.1278]); // London as default
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCars = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cars/available`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const availableCars = data
                    .filter((car: Car) => car.availability_status === 'available')
                    .map((car: Car) => ({
                        ...car,
                        location: [car.latitude, car.longitude] as [number, number],
                        image: car.image_url,
                        pricePerHour: car.price_per_hour,
                        address: car.address || car.location || 'No location set for this vehicle'
                    }));
                setCars(availableCars);
            } catch (error) {
                console.error('Error fetching cars:', error);
            }
        };
        fetchCars();
    }, []);

    // Search for locations when typing
    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (searchLocation.trim().length < 3) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                // Using OpenStreetMap's Nominatim API for geocoding
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocation)}&limit=5&countrycodes=gb`
                );
                if (!response.ok) {
                    throw new Error('Geocoding API error');
                }
                const data: GeocodingResult[] = await response.json();
                setSearchResults(data);
                setShowResults(true);
            } catch (error) {
                console.error('Error searching for locations:', error);
                setSearchResults([]);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchLocation]);

    // Handle selecting a location from search results
    const handleLocationSelect = (result: GeocodingResult) => {
        const newCenter: [number, number] = [
            parseFloat(result.lat),
            parseFloat(result.lon)
        ];
        
        setMapCenter(newCenter);
        setSearchLocation(result.display_name);
        setShowResults(false);
        
        // Find the nearest car to this location
        findNearestCar(newCenter);
    };

    // Find and highlight the nearest car to the selected location
    const findNearestCar = (location: [number, number]) => {
        if (cars.length === 0) return;

        let nearestCar = cars[0];
        let shortestDistance = calculateDistance(
            location[0], location[1], 
            cars[0].latitude, cars[0].longitude
        );

        cars.forEach(car => {
            const distance = calculateDistance(
                location[0], location[1], 
                car.latitude, car.longitude
            );
            
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestCar = car;
            }
        });

        // Highlight the nearest car by updating the map center
        setMapCenter([nearestCar.latitude, nearestCar.longitude]);
        
        // Log the nearest car for debugging
        console.log('Nearest car:', nearestCar.make, nearestCar.model, 'Distance:', shortestDistance.toFixed(2), 'km');
    };

    // Calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    return (
        <>
            <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        sx={{ color: 'white', mr: 2 }}
                        onClick={() => navigate('/dashboard')}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ color: 'white' }}>
                        Available Cars
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    {/* Search Bar */}
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
                        <TextField
                            fullWidth
                            placeholder="Enter location to find nearby cars"
                            value={searchLocation}
                            onChange={(e) => setSearchLocation(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowResults(true)}
                            variant="outlined"
                            size="small"
                            className="map-search-field"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: loading && (
                                    <InputAdornment position="end">
                                        <CircularProgress size={20} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        
                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <Paper 
                                elevation={3} 
                                sx={{ 
                                    position: 'absolute', 
                                    top: '100%', 
                                    left: 0, 
                                    right: 0, 
                                    zIndex: 2,
                                    mt: 1,
                                    mx: 2,
                                    maxHeight: 300,
                                    overflow: 'auto'
                                }}
                            >
                                <List>
                                    {searchResults.map((result, index) => (
                                        <React.Fragment key={result.place_id}>
                                            <ListItem 
                                                button 
                                                onClick={() => handleLocationSelect(result)}
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <LocationOnIcon color="primary" />
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={result.display_name.split(',')[0]}
                                                    secondary={result.display_name.split(',').slice(1).join(',')}
                                                    primaryTypographyProps={{
                                                        fontWeight: 'medium'
                                                    }}
                                                    secondaryTypographyProps={{
                                                        noWrap: true,
                                                        fontSize: 12
                                                    }}
                                                />
                                            </ListItem>
                                            {index < searchResults.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </Paper>
                        )}
                    </Box>

                    {/* Map Container */}
                    <Box sx={{ height: '600px', width: '100%' }} onClick={() => setShowResults(false)}>
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            
                            <MapCenter center={mapCenter} />
                            
                            {cars.map((car) => (
                                <CarMarker 
                                    key={car.id} 
                                    car={{
                                        id: car.id,
                                        make: car.make,
                                        model: car.model,
                                        type: car.type,
                                        price_per_hour: Number(car.price_per_hour),
                                        location: [car.latitude, car.longitude],
                                        image: car.image_url,
                                        address: car.address,
                                        required_membership: car.required_membership
                                    }}
                                />
                            ))}
                        </MapContainer>
                    </Box>
                </Paper>
            </Container>
        </>
    );
};

export default MapView; 