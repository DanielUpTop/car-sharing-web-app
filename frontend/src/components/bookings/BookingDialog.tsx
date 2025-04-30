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
    CircularProgress
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
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch membership data');
            }

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
    const calculateTotalPrice = () => {
        if (membership && discountPercentage > 0 && discountedPrice > 0) {
            return discountedPrice;
        }
        return originalPrice;
    };

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
        if (activeStep === 0) {
            console.log('Starting booking process...');
            if (!checkAuthentication()) {
                return;
            }

            if (!startDate || !endDate) {
                setError('Please select both start and end dates');
                return;
            }

            if (endDate < startDate) {
                setError('End date cannot be before start date');
                return;
            }

            // Check if user has the required membership level
            if (!isMembershipSufficient()) {
                setError(`You need ${car.required_membership} membership or higher to book this car. Please upgrade your membership to continue.`);
                return;
            }

            const totalPrice = calculateTotalPrice();
            if (totalPrice <= 0) {
                setError('Invalid price calculation');
                return;
            }

            // Create payment intent
            try {
                console.log('Creating payment intent...');
                setLoading(true);
                setError('');

                console.log('Sending payment intent request with amount:', totalPrice);

                // Use our API middleware with error handling
                const response = await api.post('/api/payments/create-payment-intent', {
                        amount: totalPrice,
                        carId: car.id.toString(),
                        startDate: formatDateForMySQL(startDate),
                        endDate: formatDateForMySQL(endDate)
                });

                console.log('Payment intent response status:', response.status);
                
                const data = response.data;
                console.log('Payment intent created successfully');
                setClientSecret(data.clientSecret);
                if (data.bookingId) {
                    setBookingId(data.bookingId); 
                    console.log('Stored bookingId:', data.bookingId);
                } else {
                    console.error('Booking ID not received from backend!');
                    setError('Failed to get booking ID from server.');
                    return; 
                }
                setActiveStep(1);
            } catch (err) {
                console.error('Payment intent creation error:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize payment');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
        setError('');
    };

    const handlePaymentSuccess = async (paymentIntentId: string) => {
        console.log('BookingDialog: handlePaymentSuccess triggered! Intent ID:', paymentIntentId, 'Booking ID:', bookingId);
        setLoading(false);
        setError('');
        setShowSuccess(true);
        setSnackbarMessage('Booking Successful! Redirecting to My Bookings...');
        setSnackbarOpen(true);

        setTimeout(() => {
            onBookingComplete(car.id);
            onClose();
            navigate('/dashboard/bookings');
        }, 3000);
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
                        
                        {/* Temporarily commented out for debugging admin login issue */}
                        {clientSecret && (
                            <Box sx={{ mt: 3 }}>
                                <PaymentProvider
                                    clientSecret={clientSecret}
                                    onSuccess={handlePaymentSuccess}
                                    onError={(error: any) => setError(error?.message || 'Payment failed')}
                                    amount={calculateTotalPrice()}
                                />
                            </Box>
                        )}
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <StyledDialog 
                open={open} 
                onClose={onClose} 
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
                        onClick={onClose}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    {activeStep > 0 && (
                        <Button 
                            onClick={handleBack}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                        >
                            Back
                        </Button>
                    )}
                    {activeStep === 0 && (
                        <Tooltip
                            title={!isMembershipSufficient() ? 
                                `You need ${car.required_membership} membership to book this car` : 
                                (!startDate || !endDate ? "Please select dates" : "")}
                            placement="top"
                            arrow
                        >
                            <span>
                        <Button
                            onClick={handleNext}
                            variant="contained"
                                    disabled={loading || !startDate || !endDate || !isMembershipSufficient()}
                            sx={{ 
                                borderRadius: 2,
                                minWidth: 100
                            }}
                        >
                            {loading ? 'Processing...' : 'Next'}
                        </Button>
                            </span>
                        </Tooltip>
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