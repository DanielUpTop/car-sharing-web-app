import React from 'react';
import {
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Typography,
    Box,
    Button,
    Chip,
    Divider
} from '@mui/material';
import ElectricCarIcon from '@mui/icons-material/ElectricCar';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import StarRateIcon from '@mui/icons-material/StarRate';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

// Define the specific structure needed for the list item - MATCHING MapView mapping
export interface CarForListItem {
    id: number;
    make: string;
    model: string;
    year: number;
    seats: number;
    rating?: number;
    type: 'electric' | 'hybrid' | 'petrol';
    price_per_hour: number;
    daily_rate?: number;
    image: string;
    address: string;
    required_membership?: string;
}

interface CarListItemProps {
    car: CarForListItem;
    onSelect: (car: CarForListItem) => void;
    userMembership: string | null;
    membershipLoading: boolean;
    isMembershipSufficient: () => boolean;
}

const CarListItem: React.FC<CarListItemProps> = ({
    car,
    onSelect,
    userMembership,
    membershipLoading,
    isMembershipSufficient
}) => {

    // Button logic remains the same
    const getButtonText = () => {
        if (membershipLoading) return 'Loading...';
        if (!isMembershipSufficient()) {
            const requirement = car.required_membership ?
                                car.required_membership.charAt(0).toUpperCase() + car.required_membership.slice(1) :
                                'Basic';
            return `Requires ${requirement}`;
        }
        return 'Select car';
    };

    const determineButtonColor = (): "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning" => {
        if (isMembershipSufficient()) {
            return 'primary';
        }
        switch (car.required_membership) {
            case 'platinum':
                return 'warning';
            case 'premium':
                return 'info';
            default:
                return 'primary';
        }
    };

    const handleSelect = () => {
        onSelect(car); // Pass the car object
    };


    return (
        <>
            <ListItem alignItems="flex-start" sx={{ '&:hover': { bgcolor: 'action.hover' }, py: 2, px: 1.5 }}>
                <ListItemAvatar sx={{ mr: 2, alignSelf: 'center' }}>
                    <Avatar
                        variant="rounded"
                        src={car.image || '/images/default-car.png'}
                        alt={`${car.make} ${car.model}`}
                        sx={{ width: 100, height: 80, objectFit: 'cover' }}
                    />
                </ListItemAvatar>

                {/* Text Section: Flexible width */}
                <ListItemText
                    sx={{ flexGrow: 1, minWidth: 0, mt: 0 }} // Allow text to grow and shrink
                    primary={
                        // Allow Make/Model to wrap if needed
                        <Typography variant="h6" component="div" gutterBottom sx={{ fontWeight: 'medium' }}>
                            {car.make} {car.model}
                        </Typography>
                    }
                    secondary={
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}> 
                            {/* Allow Address to wrap */}
                            <Typography
                                sx={{ display: 'block', mb: 1, fontSize: '0.85rem' }}
                                component="span"
                                variant="body2"
                                color="text.secondary"
                            >
                                {car.address}
                            </Typography>
                            {/* Chips Box - Ensure wrapping and alignment */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
                                {car.required_membership && car.required_membership !== 'none' && (
                                    <Chip
                                        icon={<WorkspacePremiumIcon fontSize="small" />}
                                        label={car.required_membership.charAt(0).toUpperCase() + car.required_membership.slice(1)}
                                        size="small"
                                        color={car.required_membership === 'platinum' ? 'warning' : car.required_membership === 'premium' ? 'info' : 'success'}
                                        sx={{ fontWeight: 'bold', height: '22px' }}
                                    />
                                )}
                                <Chip
                                    icon={car.type === 'electric' ? <ElectricCarIcon fontSize="small" /> :
                                          car.type === 'hybrid' ? <LocalGasStationIcon fontSize="small" /> :
                                          <DirectionsCarIcon fontSize="small" />}
                                    label={car.type.charAt(0).toUpperCase() + car.type.slice(1)}
                                    size="small"
                                    variant="outlined"
                                     sx={{ height: '22px' }}
                                />
                                <Chip
                                    icon={<CalendarTodayIcon fontSize="small" />}
                                    label={car.year}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: '22px' }}
                                />
                                <Chip
                                    icon={<AirlineSeatReclineNormalIcon fontSize="small" />}
                                    label={`${car.seats} Seats`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: '22px' }}
                                />
                                {typeof car.rating === 'number' && car.rating > 0 && (
                                    <Chip
                                        icon={<StarRateIcon fontSize="small" />}
                                        label={`${car.rating.toFixed(1)}`}
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        sx={{ height: '22px' }}
                                    />
                                )}
                            </Box>
                        </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }} 
                />
                
                {/* Right Aligned Section: Adjust width? */}
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-end', 
                    justifyContent: 'space-between', 
                    width: '120px', // Slightly reduced fixed width for price/button area
                    flexShrink: 0, 
                    pl: 1 
                }}>
                     <Box sx={{ textAlign: 'right'}}> 
                         <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: -0.5 }}>
                            Starting at
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mb: car.daily_rate ? 0 : 1 }}>
                            £{car.price_per_hour.toFixed(2)}/hr
                        </Typography>
                        {car.daily_rate && (
                             <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                (£{car.daily_rate.toFixed(2)}/day)
                            </Typography>
                        )}
                    </Box>
                     <Button
                        variant="contained"
                        color={determineButtonColor()}
                        onClick={handleSelect}
                        disabled={membershipLoading}
                        size="small"
                        sx={{ 
                            mt: 1, 
                            textTransform: 'none', 
                            fontWeight: 'bold', 
                            borderRadius: '20px', 
                            px: 2,
                            width: '100%', // Take full width of container
                            maxWidth: '110px' // Reduced max width slightly
                        }}
                    >
                       {getButtonText()}
                    </Button>
                </Box>
            </ListItem>
            <Divider variant="inset" component="li" sx={{ ml: '134px' }} />
        </>
    );
};

export default CarListItem;