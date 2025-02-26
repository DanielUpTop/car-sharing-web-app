import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Box,
    TextField,
    InputAdornment,
    Paper,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Container
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import CarMarker from './CarMarker';

// Add custom styles to match Zipcar
import './MapView.css';

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
}

const MapView = () => {
    const [cars, setCars] = useState<Car[]>([]);
    const [searchLocation, setSearchLocation] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCars = async () => {
            try {
                const response = await fetch('http://localhost:5001/api/cars/available');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const availableCars = data
                    .filter((car: Car) => car.availability_status === 'available')
                    .map((car: Car) => ({
                        ...car,
                        location: [car.latitude, car.longitude],
                        image: car.image_url,
                        pricePerHour: car.price_per_hour
                    }));
                setCars(availableCars);
            } catch (error) {
                console.error('Error fetching cars:', error);
            }
        };
        fetchCars();
    }, []);

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
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <TextField
                            fullWidth
                            placeholder="Enter location to find nearby cars"
                            value={searchLocation}
                            onChange={(e) => setSearchLocation(e.target.value)}
                            variant="outlined"
                            size="small"
                            className="map-search-field"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    {/* Map Container */}
                    <Box sx={{ height: '600px', width: '100%' }}>
                        <MapContainer
                            center={[51.5074, -0.1278]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            
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
                                        image: car.image_url
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