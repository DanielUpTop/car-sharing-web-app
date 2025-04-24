import React, { useState } from 'react';
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
    styled
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimeValidationError } from '@mui/x-date-pickers';
import { differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import MuiAlert from '@mui/material/Alert';
import PaymentProvider from '../payments/PaymentProvider';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

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
}

interface BookingDialogProps {
    open: boolean;
    onClose: () => void;
    car: Car;
    onBookingComplete: () => void;
}

const steps = ['Select Dates', 'Review & Pay'];

const BookingDialog = ({ open, onClose, car, onBookingComplete }: BookingDialogProps) => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [clientSecret, setClientSecret] = useState<string>('');
    const { user } = useAuth();

    const calculateTotalPrice = () => {
        if (startDate && endDate) {
            const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
            const rawPrice = car.pricePerHour * hours;
            // Format to 2 decimal places and convert back to number to ensure clean decimal
            const price = parseFloat(rawPrice.toFixed(2));
            console.log('Price calculation:', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                hours,
                pricePerHour: car.pricePerHour,
                rawPrice,
                formattedPrice: price
            });
            return price;
        }
        return 0;
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
        console.log('[handlePaymentSuccess] Payment confirmed by Stripe. PaymentIntent ID:', paymentIntentId);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('[handlePaymentSuccess] No token found after payment success.');
                throw new Error('No authentication token found');
            }
            console.log('[handlePaymentSuccess] Token found.');

            if (!startDate || !endDate) {
                console.error('[handlePaymentSuccess] Missing start/end dates.');
                throw new Error('Start and end dates are required');
            }
            console.log('[handlePaymentSuccess] Dates verified.');

            const formattedStartDate = formatDateForMySQL(startDate);
            const formattedEndDate = formatDateForMySQL(endDate);
            const finalPrice = Number(calculateTotalPrice().toFixed(2));

            const bookingData = {
                car_id: car.id,
                start_date: formattedStartDate,
                end_date: formattedEndDate,
                total_price: finalPrice,
                payment_intent_id: paymentIntentId
            };
            console.log('[handlePaymentSuccess] Preparing to POST booking data:', bookingData);

            // Use api middleware instead of fetch to prevent redirection issues
            const response = await api.post('/api/bookings', bookingData);
            console.log('[handlePaymentSuccess] POST /api/bookings response status:', response.status);

            const bookingResponse = response.data;
            console.log('[handlePaymentSuccess] Booking created successfully:', bookingResponse);

            // Remove email sending code - emails should only be sent after admin approval
            // The admin will handle sending confirmation emails after they approve the booking

            // Proceed even if email fails
            setShowSuccess(true);
            console.log('[handlePaymentSuccess] Set showSuccess=true. Calling onBookingComplete...');
            onBookingComplete(); // <-- Navigate first
            console.log('[handlePaymentSuccess] Called onBookingComplete. Closing dialog...');
            onClose(); // <-- Close dialog after navigation attempt

        } catch (err) {
            console.error('[handlePaymentSuccess] START CATCH BLOCK. Error caught:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to finalize booking after payment';
            console.log('[handlePaymentSuccess] Setting error state:', errorMessage);
            setError(errorMessage);
            
            // Don't redirect to login even for auth errors - just show the error
            console.error('[handlePaymentSuccess] Error during booking save:', errorMessage);
            
             console.log('[handlePaymentSuccess] END CATCH BLOCK.');
        }
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                            Select your booking dates for {car.make} {car.model}
                        </Typography>
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
                                <Typography variant="h6" sx={{ color: 'primary.contrastText' }}>
                                    Total Price: £{calculateTotalPrice().toFixed(2)}
                                </Typography>
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
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Vehicle
                                    </Typography>
                                    <Typography variant="body1">
                                        {car.make} {car.model}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Start Date
                                    </Typography>
                                    <Typography variant="body1">
                                        {startDate?.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        End Date
                                    </Typography>
                                    <Typography variant="body1">
                                        {endDate?.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Total Price
                                    </Typography>
                                    <Typography variant="h6" color="primary.main">
                                        £{calculateTotalPrice().toFixed(2)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
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
                        <Alert severity="error" sx={{ mt: 2, borderRadius: 1 }}>
                            {error}
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
                        <Button
                            onClick={handleNext}
                            variant="contained"
                            disabled={loading || !startDate || !endDate}
                            sx={{ 
                                borderRadius: 2,
                                minWidth: 100
                            }}
                        >
                            {loading ? 'Processing...' : 'Next'}
                        </Button>
                    )}
                </DialogActions>
            </StyledDialog>
            <Snackbar
                open={showSuccess}
                autoHideDuration={2000}
                onClose={() => setShowSuccess(false)}
            >
                <MuiAlert severity="success" elevation={6} variant="filled">
                    Booking created successfully!
                </MuiAlert>
            </Snackbar>
        </>
    );
};

export default BookingDialog;