import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Alert,
    Snackbar,
    Stepper,
    Step,
    StepLabel,
    Paper,
    styled,
    Grid,
    Divider,
    Chip,
    Tooltip,
    TextField,
    CircularProgress,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormControl,
    FormLabel
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimeValidationError } from '@mui/x-date-pickers';
import { differenceInDays, format, differenceInHours } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import MuiAlert from '@mui/material/Alert';
import PaymentProvider from '../payments/PaymentProvider';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { ArrowUpward } from '@mui/icons-material';
import { CheckCircleOutline } from '@mui/icons-material';

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    }
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(3),
}));

const StyledDateTimePicker = styled(DateTimePicker)(({ theme }) => ({
    width: '100%',
    '& .MuiOutlinedInput-root': {
        borderRadius: 8,
    }
}));

const StyledStepper = styled(Stepper)(({ theme }) => ({
    padding: theme.spacing(3, 0, 4),
}));

interface Car {
    id: number;
    make: string;
    model: string;
    type: string;
    pricePerHour: number;
    image: string;
    address: string;
    required_membership?: 'none' | 'basic' | 'premium' | 'platinum';
}

interface BookingDialogProps {
    car: Car;
    open: boolean;
    onClose: () => void;
    onBookingComplete: (bookedCarId: number) => void;
}

const steps = ['Select Dates', 'Review & Pay'];

const BookingDialog: React.FC<BookingDialogProps> = ({ car, open, onClose, onBookingComplete }) => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [clientSecret, setClientSecret] = useState<string>('');
    const { user } = useAuth();
    const [membership, setMembership] = useState<any>(null);
    const [membershipLoading, setMembershipLoading] = useState(true);
    const [originalPrice, setOriginalPrice] = useState<number>(0);
    const [discountedPrice, setDiscountedPrice] = useState<number>(0);
    const [discountPercentage, setDiscountPercentage] = useState<number>(0);
    const [totalPrice, setTotalPrice] = useState<number>(0);
    const [bookingId, setBookingId] = useState<number | null>(null);
    const [userRewardPoints, setUserRewardPoints] = useState<number>(0);
    const [selectedRewardPoints, setSelectedRewardPoints] = useState<number>(0);

    // Define reward tiers locally or import from a shared location
    const rewardTiers = [
        { points: 1, discount: 5, description: '£5 off' }, // Reverted test change
        { points: 20, discount: 15, description: '£15 off' },
        { points: 30, discount: 20, description: '£20 off' },
    ];

    // State for Snackbar
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        if (user) {
            fetchMembership();
        } else {
            setMembershipLoading(false);
        }
    }, [user]);

    const fetchUserPoints = async () => {
        if (!user) return 0;
        try {
            const token = localStorage.getItem('token');
            if (!token) return 0;
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                console.error('Failed to fetch user points');
                return 0;
            }
            const data = await response.json();
            const points = data?.reward_points ?? 0;
            setUserRewardPoints(points);
            return points;
        } catch (err) {
            console.error('Error fetching user points:', err);
            return 0;
        }
    };

    const fetchMembership = async () => {
        try {
            setMembershipLoading(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
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
                // User doesn't have a membership
                setMembership(null);
                setDiscountPercentage(0);
            } else if (!response.ok) {
                throw new Error('Failed to fetch membership data');
            } else {
                const data = await response.json();
                setMembership(data);
                
                // Check if data is null before accessing type
                if (data && data.type) {
                    // Set discount percentage based on membership type
                    switch (data.type) {
                        case 'basic':
                            setDiscountPercentage(5);
                            break;
                        case 'premium':
                            setDiscountPercentage(10);
                            break;
                        case 'platinum':
                            setDiscountPercentage(15);
                            break;
                        default:
                            setDiscountPercentage(0);
                    }
                } else {
                    // No membership or type found, ensure discount is 0
                    setDiscountPercentage(0);
                }
            }
        } catch (err) {
            console.error('Error fetching membership:', err);
            setMembership(null);
            setDiscountPercentage(0);
        } finally {
            setMembershipLoading(false);
        }
    };

    // Calculate prices whenever dates or membership changes
    useEffect(() => {
        if (startDate && endDate) {
            const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
            const rawPrice = car.pricePerHour * hours;
            // Format to 2 decimal places and convert back to number to ensure clean decimal
            const price = parseFloat(rawPrice.toFixed(2));
            
            // Store the original price
            setOriginalPrice(price);
            
            // Apply membership discount if applicable
            if (membership && discountPercentage > 0) {
                const discounted = parseFloat((price * (1 - discountPercentage / 100)).toFixed(2));
                setDiscountedPrice(discounted);
                
                console.log('Price calculation with membership discount:', {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    hours,
                    pricePerHour: car.pricePerHour,
                    rawPrice,
                    originalPrice: price,
                    membershipType: membership.type,
                    discountPercentage,
                    discountedPrice: discounted
                });
            } else {
            console.log('Price calculation:', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                hours,
                pricePerHour: car.pricePerHour,
                rawPrice,
                formattedPrice: price
            });
                
                // No discount
                setDiscountedPrice(0);
            }
        } else {
            setOriginalPrice(0);
            setDiscountedPrice(0);
        }
    }, [startDate, endDate, membership, discountPercentage, car.pricePerHour]);

    // Pure function that doesn't set state - just calculates the final price
    const calculateTotalPrice = useCallback((ignoreReward = false) => {
        if (!car || !startDate || !endDate) return 0;

        const durationHours = differenceInHours(endDate, startDate);
        let calculatedPrice = 0;

        if (durationHours > 0 && durationHours <= 24) {
             calculatedPrice = durationHours * car.pricePerHour;
        } else if (durationHours > 24) {
             calculatedPrice = Math.ceil(durationHours / 24) * car.pricePerHour;
        }

        // Apply membership discount
        let priceAfterMembership = calculatedPrice;
        if (membership && discountPercentage > 0) {
            priceAfterMembership = calculatedPrice * (1 - discountPercentage / 100);
        }

        // Apply selected reward discount (unless ignored)
        let finalPrice = priceAfterMembership;
        if (!ignoreReward && selectedRewardPoints > 0) {
            let rewardDiscount = 0;
            if (selectedRewardPoints === 1) rewardDiscount = 5;
            else if (selectedRewardPoints === 20) rewardDiscount = 15;
            else if (selectedRewardPoints === 30) rewardDiscount = 20;
            // Ensure price doesn't go below zero
            finalPrice = Math.max(0, priceAfterMembership - rewardDiscount);
        }

        return parseFloat(finalPrice.toFixed(2));
    }, [car, startDate, endDate, membership, discountPercentage, selectedRewardPoints]);

    const formatDateForMySQL = (date: Date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return null;
        }
        // Format as YYYY-MM-DD HH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const checkAuthentication = () => {
        const token = localStorage.getItem('token');
        console.log('Checking authentication, token:', token ? 'exists' : 'missing');
        if (!token) {
            setError('Please log in to make a booking');
            onClose();
            navigate('/login', { state: { from: window.location.pathname } });
            return false;
        }
        return true;
    };

    const handleNext = async () => {
        console.log(`[BookingDialog] handleNext called, current step: ${activeStep}`);
        if (activeStep === 0) { // Moving from Step 0 (Select Dates) to Step 1 (Review & Pay)
            // Validate dates first
            if (!startDate || !endDate) {
                setError('Please select both start and end dates');
                return;
            }
            if (endDate < startDate) {
                setError('End date cannot be before start date');
                return;
            }
            if (!isMembershipSufficient()) {
                setError(`You need ${car.required_membership} membership or higher to book this car. Please upgrade your membership to continue.`);
                return;
            }
            setError(''); // Clear previous errors

            // Fetch points when moving to the review step
            console.log('[BookingDialog] Fetching user points before moving to step 1...');
            setLoading(true); // Show loading indicator while fetching points
            try {
                await fetchUserPoints();
                console.log('[BookingDialog] Points fetch initiated, advancing to step 1 shortly.');
                setTimeout(() => setActiveStep(1), 50);
            } catch (err) {
                console.error('[BookingDialog] Error fetching points in handleNext:', err);
                setError('Could not load reward points. Please try again.');
            } finally {
                setLoading(false);
            }

            // --- REMOVED Payment Intent creation from here ---

        } else if (activeStep === 1) {
            // This case might not be needed if step 1 directly handles payment intent
            console.log('[BookingDialog] Next clicked on step 1 - should trigger payment intent via dedicated button.');
            // If there was a separate button for "Next" on step 1, it would call handlePayment here.
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
        setClientSecret('');
        setError('');
    };

    const handlePayment = async () => {
        if (!startDate || !endDate || !car) {
            setError('Please select valid dates and ensure car data is available.');
            return;
        }
        if (endDate <= startDate) {
            setError('End date must be after start date.');
            return;
        }

        setLoading(true);
        setError('');
        setClientSecret('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found.');
            }

            const bookingDetails = {
                carId: car.id,
                startDate: format(startDate, "yyyy-MM-dd HH:mm:ss"),
                endDate: format(endDate, "yyyy-MM-dd HH:mm:ss"),
                amount: calculateTotalPrice(true),
                appliedRewardPoints: selectedRewardPoints
            };

            console.log('Sending to create-payment-intent:', bookingDetails);

            // Request payment intent from backend
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(bookingDetails),
            });

            const paymentData = await response.json();

            if (!response.ok) {
                throw new Error(paymentData.error || 'Failed to initialize payment');
            }

            console.log('Payment intent created:', paymentData);
            setClientSecret(paymentData.clientSecret);
            setBookingId(paymentData.bookingId);
            setOriginalPrice(paymentData.originalAmount || calculateTotalPrice(true));
            setDiscountedPrice(paymentData.discountedAmount || calculateTotalPrice());
            setTotalPrice(paymentData.discountedAmount || calculateTotalPrice());

        } catch (err: any) {
            console.error('Booking/Payment Error:', err);
            setError(err.message || 'Failed to process booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = (paymentIntentId: string) => {
        console.log('Payment successful! Intent ID:', paymentIntentId);
        setShowSuccess(true);
        setActiveStep(steps.length);
        if (onBookingComplete) {
            onBookingComplete(car.id);
        }
        // Navigate to bookings page after success
        navigate('/dashboard/bookings');
        
        setTimeout(() => {
            handleClose();
        }, 1000); // Reduced delay slightly
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setActiveStep(0);
            setStartDate(null);
            setEndDate(null);
            setError('');
            setLoading(false);
            setShowSuccess(false);
            setClientSecret('');
            setBookingId(null);
            setOriginalPrice(0);
            setDiscountedPrice(0);
            setTotalPrice(0);
            setUserRewardPoints(0);
            setSelectedRewardPoints(0);
        }, 300);
    };

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
        // which means they can book basic cars but not premium/platinum
        const membershipType = membership ? membership.type : 'basic';
        const requiredType = car.required_membership as keyof typeof membershipLevels;
        
        // Ensure requiredType is a valid key before accessing
        if (!(requiredType in membershipLevels)) {
            console.warn(`Invalid required_membership value: ${requiredType}`);
            return false; // Or handle as appropriate, maybe allow booking?
        }
        
        return membershipLevels[membershipType as keyof typeof membershipLevels] >= membershipLevels[requiredType];
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                            Select your booking dates for {car.make} {car.model}
                        </Typography>
                        
                        {car.required_membership && car.required_membership !== 'none' && (
                            <Alert 
                                severity={isMembershipSufficient() ? "info" : "warning"} 
                                sx={{ 
                                    mb: 3,
                                    borderLeft: !isMembershipSufficient() ? '4px solid #f44336' : undefined,
                                    backgroundColor: !isMembershipSufficient() ? 'rgba(244, 67, 54, 0.1)' : undefined
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    {isMembershipSufficient() 
                                        ? `This car requires ${car.required_membership} membership which you have.` 
                                        : `This car is reserved for members with ${car.required_membership} membership or higher.`
                                    }
                                </Typography>
                                {!isMembershipSufficient() && (
                                    <>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            You'll need to upgrade your membership before you can book this vehicle.
                                        </Typography>
                                        <Button 
                                            variant="contained" 
                                            color="error" 
                                            size="small"
                                            onClick={() => navigate('/membership')}
                                            sx={{ mt: 1, fontWeight: 'bold' }}
                                            startIcon={<ArrowUpward />}
                                        >
                                            Upgrade Membership
                                        </Button>
                                    </>
                                )}
                            </Alert>
                        )}

                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: 3,
                                mb: 4 
                            }}>
                                <StyledDateTimePicker
                                    label="Start Date"
                                    value={startDate}
                                    onChange={(value) => {
                                        if (value instanceof Date && !isNaN(value.getTime())) {
                                            setStartDate(value);
                                            setError('');
                                        }
                                    }}
                                    onError={(error: DateTimeValidationError) => {
                                        if (error) {
                                            setError('Please enter a valid date and time');
                                        }
                                    }}
                                    minDateTime={new Date()}
                                    format="dd/MM/yyyy HH:mm"
                                    ampm={false}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            variant: 'outlined'
                                        },
                                        actionBar: {
                                            actions: ['clear', 'accept']
                                        },
                                        popper: {
                                            sx: {
                                                zIndex: 9999
                                            }
                                        }
                                    }}
                                />
                                <StyledDateTimePicker
                                    label="End Date"
                                    value={endDate}
                                    onChange={(value) => {
                                        if (value instanceof Date && !isNaN(value.getTime())) {
                                            setEndDate(value);
                                            setError('');
                                        }
                                    }}
                                    onError={(error: DateTimeValidationError) => {
                                        if (error) {
                                            setError('Please enter a valid date and time');
                                        }
                                    }}
                                    minDateTime={startDate || new Date()}
                                    format="dd/MM/yyyy HH:mm"
                                    ampm={false}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            variant: 'outlined'
                                        },
                                        actionBar: {
                                            actions: ['clear', 'accept']
                                        },
                                        popper: {
                                            sx: {
                                                zIndex: 9999
                                            }
                                        }
                                    }}
                                />
                            </Box>
                        </LocalizationProvider>
                        {startDate && endDate && (
                            <Paper 
                                elevation={0} 
                                sx={{ 
                                    p: 2, 
                                    mt: 2, 
                                    backgroundColor: 'primary.light',
                                    borderRadius: 2
                                }}
                            >
                                {membership && discountPercentage > 0 ? (
                                    <>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <Typography variant="body2" sx={{ color: 'primary.contrastText', mr: 1 }}>
                                                Original Price:
                                            </Typography>
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    textDecoration: 'line-through',
                                                    color: 'primary.contrastText',
                                                    opacity: 0.7
                                                }}
                                            >
                                                £{originalPrice.toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="h6" sx={{ color: 'primary.contrastText' }}>
                                                Total Price: £{calculateTotalPrice().toFixed(2)}
                                            </Typography>
                                            <Chip 
                                                label={`${discountPercentage}% off`}
                                                color="success"
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: 'primary.contrastText', mt: 1, display: 'block' }}>
                                            {membership.type.charAt(0).toUpperCase() + membership.type.slice(1)} membership discount applied
                                        </Typography>
                                    </>
                                ) : (
                                <Typography variant="h6" sx={{ color: 'primary.contrastText' }}>
                                    Total Price: £{calculateTotalPrice().toFixed(2)}
                                </Typography>
                                )}
                            </Paper>
                        )}
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                            Booking Summary
                        </Typography>
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 3, 
                                backgroundColor: 'grey.50',
                                borderRadius: 2
                            }}
                        >
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                        {car.make} {car.model}
                                    </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {car.address}
                                </Typography>
                                </Box>
                            
                            <Box sx={{ mb: 2 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="textSecondary">
                                        Start Date
                                    </Typography>
                                    <Typography variant="body1">
                                            {format(startDate!, 'PP')}
                                        </Typography>
                                        <Typography variant="body2">
                                            {format(startDate!, 'p')}
                                    </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="textSecondary">
                                        End Date
                                    </Typography>
                                    <Typography variant="body1">
                                            {format(endDate!, 'PP')}
                                        </Typography>
                                        <Typography variant="body2">
                                            {format(endDate!, 'p')}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="body2" color="textSecondary">
                                    Duration
                                </Typography>
                                <Typography variant="body1">
                                    {Math.ceil((endDate!.getTime() - startDate!.getTime()) / (1000 * 60 * 60))} hours
                                </Typography>
                            </Box>
                            
                            <Divider sx={{ mb: 2 }} />
                            
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="textSecondary">
                                    Hourly Rate
                                </Typography>
                                <Typography variant="body1">
                                    £{car.pricePerHour.toFixed(2)}
                                </Typography>
                            </Box>
                            
                            {membership && discountPercentage > 0 && (
                                <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                        Membership Discount Applied
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Original Price
                                    </Typography>
                                    <Typography 
                                        variant="body1" 
                                        sx={{ 
                                            textDecoration: 'line-through',
                                            color: 'text.secondary'
                                        }}
                                    >
                                        £{originalPrice.toFixed(2)}
                                    </Typography>
                                    
                                    <Box 
                                        sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            mt: 1
                                        }}
                                    >
                                        <Chip 
                                            label={`${discountPercentage}% ${membership.type} discount`}
                                            color="success"
                                            size="small"
                                            sx={{ mr: 1, fontWeight: 'bold' }}
                                        />
                                        <Typography 
                                            variant="body2" 
                                            color="success.dark"
                                            fontWeight="bold"
                                        >
                                            You save £{(originalPrice - calculateTotalPrice()).toFixed(2)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                            
                            <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                                <Typography variant="body2" color="primary.contrastText">
                                    Total Price
                                </Typography>
                                <Typography 
                                    variant="h5" 
                                    color="primary.contrastText" 
                                    fontWeight="bold"
                                >
                                    £{calculateTotalPrice().toFixed(2)}
                                    {membership && discountPercentage > 0 && (
                                        <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                                            (with {membership.type} discount)
                                        </Typography>
                                    )}
                                </Typography>
                            </Box>
                        </Paper>
                        
                        <FormControl component="fieldset" sx={{ mt: 2, mb: 2, width: '100%' }}>
                            <FormLabel component="legend">Apply Reward Points (Current: {userRewardPoints})</FormLabel>
                            <RadioGroup
                                aria-label="reward-points"
                                name="reward-points-group"
                                value={selectedRewardPoints}
                                onChange={(e) => setSelectedRewardPoints(Number(e.target.value))}
                            >
                                <FormControlLabel value={0} control={<Radio size="small" />} label="Do not apply points" />
                                {rewardTiers.map((tier) => (
                                    <FormControlLabel 
                                        key={tier.points}
                                        value={tier.points}
                                        control={<Radio size="small" />} 
                                        label={`${tier.points} Points: ${tier.description}`}
                                        disabled={userRewardPoints < tier.points}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                            <Typography variant="body2" color="primary.contrastText">
                                Total Price
                            </Typography>
                            <Typography 
                                variant="h5" 
                                color="primary.contrastText" 
                                fontWeight="bold"
                            >
                                £{calculateTotalPrice().toFixed(2)}
                                {selectedRewardPoints > 0 && (
                                    <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                                        (with reward applied)
                                    </Typography>
                                )}
                            </Typography>
                        </Box>
                        
                        {clientSecret ? (
                            <Box sx={{ mt: 3 }}>
                                <PaymentProvider
                                    clientSecret={clientSecret}
                                    onSuccess={handlePaymentSuccess}
                                    onError={(errorMsg: string) => setError(errorMsg || 'Payment failed')}
                                    amount={calculateTotalPrice()}
                                />
                            </Box>
                        ) : (
                           null
                        )}
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    </Box>
                );
            default:
                return null;
        }
    };

    const renderSuccessStep = () => (
        <Box sx={{ textAlign: 'center', p: 4 }}>
            <CheckCircleOutline color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>Booking Successful!</Typography>
            <Typography>Your payment has been processed and your booking is confirmed.</Typography>
            <Typography sx={{ mt: 1 }}>Redirecting you shortly...</Typography>
            <CircularProgress sx={{ mt: 2 }} />
        </Box>
    );

    return (
        <>
            <StyledDialog 
                open={open} 
                onClose={handleClose}
                maxWidth="sm" 
                fullWidth
                sx={{ zIndex: 1300 }}
            >
                <StyledDialogTitle>
                    Book {car.make} {car.model}
                </StyledDialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <StyledStepper activeStep={activeStep}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </StyledStepper>
                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ 
                                mt: 2, 
                                mb: 2,
                                ...(error.includes('membership') && {
                                    padding: 2,
                                    border: '1px solid #f44336',
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    '& .MuiAlert-message': {
                                        marginBottom: 1
                                    }
                                })
                            }}
                        >
                            {error}
                            {error.includes('membership') && (
                                <Button 
                                    variant="contained" 
                                    color="primary"
                                    onClick={() => navigate('/membership')}
                                    sx={{ 
                                        mt: 1,
                                        fontWeight: 'bold',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                        '&:hover': {
                                            boxShadow: '0 6px 8px rgba(0,0,0,0.15)',
                                        }
                                    }}
                                >
                                    Upgrade Membership
                                </Button>
                            )}
                        </Alert>
                    )}
                    {renderStepContent()}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button 
                        onClick={handleClose} 
                        variant="outlined"
                        sx={{ borderRadius: 2, mr: 'auto' }}
                    >
                        Cancel
                    </Button>
                    {activeStep === 1 && !clientSecret && (
                         <Button onClick={handleBack} sx={{ borderRadius: 2 }}>Back</Button>
                    )} 
                    {!clientSecret && activeStep < steps.length && (
                         <Button 
                             variant="contained" 
                             onClick={activeStep === 0 ? handleNext : handlePayment}
                             disabled={loading || (activeStep === 0 && (!startDate || !endDate || endDate <= startDate || !isMembershipSufficient()))} 
                             sx={{ borderRadius: 2 }} 
                         > 
                             {loading ? <CircularProgress size={24} /> : (activeStep === 0 ? 'Next' : 'Proceed to Payment')} 
                         </Button> 
                    )} 
                </DialogActions>
            </StyledDialog>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
};

export default BookingDialog;