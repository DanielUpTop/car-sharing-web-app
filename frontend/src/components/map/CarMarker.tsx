import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
    Card,
    Typography,
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
} from '@mui/material';
import ElectricCarIcon from '@mui/icons-material/ElectricCar';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import StarRateIcon from '@mui/icons-material/StarRate';
import BookingDialog from '../bookings/BookingDialog';
import { useNavigate } from 'react-router-dom';

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
        year: number;
        seats: number;
        rating?: number;
        type: 'electric' | 'hybrid' | 'petrol';
        price_per_hour: number;
        location: [number, number];
        image: string;
        address: string;
        required_membership?: 'none' | 'basic' | 'premium' | 'platinum';
    };
}

const CarMarker: React.FC<CarMarkerProps> = ({ car }) => {
    const [openBooking, setOpenBooking] = React.useState(false);
    const navigate = useNavigate();
    const [userMembership, setUserMembership] = useState<string | null>(null);
    const [membershipLoading, setMembershipLoading] = useState(true);
    const [showMembershipMessage, setShowMembershipMessage] = useState(false);

    // Fetch user's membership on component mount
    useEffect(() => {
        const fetchMembership = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setUserMembership(null);
                    setMembershipLoading(false);
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
                    setUserMembership(null);
                } else if (response.ok) {
                    const data = await response.json();
                    setUserMembership(data ? data.type : null);
                }
            } catch (err) {
                console.error('Error fetching membership:', err);
                setUserMembership(null);
            } finally {
                setMembershipLoading(false);
            }
        };

        fetchMembership();
    }, []);

    const handleOpenBooking = () => {
        if (isMembershipSufficient()) {
            setOpenBooking(true);
        } else {
            // Show membership message instead of redirecting
            setShowMembershipMessage(true);
        }
    };

    const handleCloseBooking = () => {
        setOpenBooking(false);
    };

    const handleCloseMembershipMessage = () => {
        setShowMembershipMessage(false);
    };

    const navigateToMembership = () => {
        console.log('Navigating to membership page');
        handleCloseMembershipMessage(); // Close the dialog first
        // Navigate with a small delay to ensure UI updates properly
        setTimeout(() => {
            navigate('/dashboard/membership');
        }, 100);
    };

    // Check if user meets membership requirements
    const isMembershipSufficient = () => {
        if (!car.required_membership || car.required_membership === 'none') {
            return true;
        }

        const membershipLevels = {
            'none': 0,
            'basic': 1,
            'premium': 2,
            'platinum': 3
        };

        // For non-members, treat them as having basic-level access
        const membershipType = userMembership || 'basic';
        
        return membershipLevels[membershipType as keyof typeof membershipLevels] >= 
               membershipLevels[car.required_membership as keyof typeof membershipLevels];
    };

    // Get color for membership badge
    const getMembershipColor = (membershipType: string) => {
        switch (membershipType) {
            case 'platinum': return '#FFD700'; // Gold
            case 'premium': return '#1976d2';  // Blue
            case 'basic': return '#2E7D32';    // Green
            default: return '#757575';         // Grey
        }
    };

    // Get button text based on membership status
    const getButtonText = () => {
        if (membershipLoading) return 'Loading...';
        
        if (!isMembershipSufficient()) {
            return `Requires ${car.required_membership}`;
        }
        
        return 'Select car';
    };

    return (
        <>
            <Marker position={car.location} icon={carIcon}>
                <Popup className="car-popup">
                    <Paper elevation={0} sx={{ minWidth: 300, overflow: 'hidden', position: 'relative' }}>
                        {/* Add membership badge */}
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
                                {car.required_membership === 'basic' ? 'Basic and Non-Members' : 
                                 car.required_membership === 'premium' ? 'Premium' : 
                                 'Platinum'}
                            </Box>
                        )}
                        
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
                                label={car.type.charAt(0).toUpperCase() + car.type.slice(1)}
                                size="small"
                                variant="outlined"
                                sx={{ mr: 1, mb: 1 }}
                            />
                            <Chip
                                icon={<CalendarTodayIcon fontSize="small" />}
                                label={car.year}
                                size="small"
                                variant="outlined"
                                sx={{ mr: 1, mb: 1 }}
                            />
                            <Chip
                                icon={<AirlineSeatReclineNormalIcon fontSize="small" />}
                                label={`${car.seats} Seats`}
                                size="small"
                                variant="outlined"
                                sx={{ mr: 1, mb: 1 }}
                            />
                            {/* Add Rating Chip (only if rating exists and is a number) */}
                            {typeof car.rating === 'number' && car.rating > 0 && (
                                <Chip
                                    icon={<StarRateIcon fontSize="small" />}
                                    label={`${car.rating.toFixed(1)}`}
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    sx={{ mb: 1 }}
                                />
                            )}

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
                                <Tooltip title={!isMembershipSufficient() ? `Upgrade to ${car.required_membership} membership to book this car` : ""}>
                                    <span>
                                        <Button 
                                            variant="contained" 
                                            color={!isMembershipSufficient() ? "warning" : "primary"}
                                            onClick={handleOpenBooking}
                                            sx={{ 
                                                textTransform: 'none',
                                                fontWeight: 'bold',
                                                px: 3
                                            }}
                                        >
                                            {getButtonText()}
                                        </Button>
                                    </span>
                                </Tooltip>
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
                    image: car.image,
                    address: car.address,
                    required_membership: car.required_membership
                }}
                onBookingComplete={() => navigate('/dashboard/bookings')}
            />

            {/* Membership Requirement Dialog */}
            <Dialog 
                open={showMembershipMessage} 
                onClose={handleCloseMembershipMessage}
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
                        This vehicle requires a {car.required_membership} membership.
                    </Alert>
                    <Typography variant="body1" paragraph>
                        To book the {car.make} {car.model}, you need to upgrade your membership to {car.required_membership} or higher.
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
                        {userMembership ? 
                            `Your current membership level (${userMembership}) doesn't meet the requirement.` : 
                            "You currently don't have an active membership."}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={handleCloseMembershipMessage} variant="outlined">
                        Close
                    </Button>
                    <Button 
                        onClick={navigateToMembership} 
                        variant="contained" 
                        color="warning"
                        sx={{ fontWeight: 'bold' }}
                    >
                        View Bookings
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default CarMarker; 