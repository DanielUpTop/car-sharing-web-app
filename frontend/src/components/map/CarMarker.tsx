import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
    Card,
    Typography,
    Box,
    Button,
    Chip,
    Divider,
    Paper
} from '@mui/material';
import ElectricCarIcon from '@mui/icons-material/ElectricCar';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BookingDialog from '../bookings/BookingDialog';

// Create a custom marker icon with your brand color
const carIcon = L.divIcon({
    className: 'custom-car-marker',
    html: `<div style="
        background-color: #1976d2;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    "><svg viewBox="0 0 24 24" style="width: 20px; height: 20px;">
        <path fill="white" d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
    </svg></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

interface CarMarkerProps {
    car: {
        id: number;
        make: string;
        model: string;
        type: 'electric' | 'hybrid' | 'petrol';
        price_per_hour: number;
        location: [number, number];
        image: string;
    };
}

const CarMarker: React.FC<CarMarkerProps> = ({ car }) => {
    const [openBooking, setOpenBooking] = React.useState(false);

    const handleOpenBooking = () => {
        setOpenBooking(true);
    };

    const handleCloseBooking = () => {
        setOpenBooking(false);
    };

    return (
        <>
            <Marker position={car.location} icon={carIcon}>
                <Popup className="car-popup">
                    <Paper elevation={0} sx={{ minWidth: 300, overflow: 'hidden' }}>
                        <Box sx={{ 
                            p: 0,
                            borderRadius: '8px 8px 0 0',
                            overflow: 'hidden'
                        }}>
                            <img 
                                src={car.image} 
                                alt={`${car.make} ${car.model}`}
                                style={{ 
                                    width: '100%', 
                                    height: 200, 
                                    objectFit: 'cover'
                                }}
                            />
                        </Box>
                        
                        <Box sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                {car.make} {car.model}
                            </Typography>
                            
                            <Chip
                                icon={car.type === 'electric' ? <ElectricCarIcon /> : 
                                     car.type === 'hybrid' ? <LocalGasStationIcon /> : 
                                     <DirectionsCarIcon />}
                                label={car.type}
                                size="small"
                                color="primary"
                                sx={{ mb: 2 }}
                            />

                            <Divider sx={{ my: 2 }} />
                            
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center'
                            }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Starting at
                                    </Typography>
                                    <Typography variant="h6" color="primary">
                                        £{Number(car.price_per_hour).toFixed(2)}/hr
                                    </Typography>
                                </Box>
                                <Button 
                                    variant="contained" 
                                    color="primary"
                                    onClick={handleOpenBooking}
                                    sx={{ 
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                        px: 3
                                    }}
                                >
                                    Select car
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </Popup>
            </Marker>

            <BookingDialog
                open={openBooking}
                onClose={handleCloseBooking}
                car={{
                    id: car.id,
                    make: car.make,
                    model: car.model,
                    type: car.type,
                    pricePerHour: Number(car.price_per_hour),
                    image: car.image
                }}
            />
        </>
    );
};

export default CarMarker; 