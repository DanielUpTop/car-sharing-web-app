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
    StepLabel
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import MuiAlert from '@mui/material/Alert';
import { sendBookingConfirmationEmail } from '../../services/emailService';
import PaymentProvider from '../payments/PaymentProvider';

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
}

const steps = ['Select Dates', 'Review & Pay'];

const BookingDialog = ({ open, onClose, car }: BookingDialogProps) => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [clientSecret, setClientSecret] = useState<string>('');

    const calculateTotalPrice = () => {
        if (startDate && endDate) {
            const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
            return car.pricePerHour * hours;
        }
        return 0;
    };

    const formatDateForMySQL = (date: Date) => {
        const pad = (num: number) => num.toString().padStart(2, '0');
        
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());

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
                const token = localStorage.getItem('token');
                console.log('Creating payment intent...');
                setLoading(true);
                setError('');

                const totalAmount = calculateTotalPrice();
                console.log('Calculated total amount:', totalAmount);

                const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/create-payment-intent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        amount: totalAmount,
                        carId: car.id,
                        startDate: formatDateForMySQL(startDate),
                        endDate: formatDateForMySQL(endDate)
                    })
                });

                console.log('Payment intent response status:', response.status);
                
                if (response.status === 401) {
                    console.log('Authentication failed, redirecting to login...');
                    localStorage.removeItem('token');
                    onClose();
                    navigate('/login', { state: { from: window.location.pathname } });
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Payment intent creation failed:', errorData);
                    throw new Error(errorData.message || 'Failed to create payment intent');
                }

                const data = await response.json();
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
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            if (!startDate || !endDate) {
                throw new Error('Start and end dates are required');
            }

            const formattedStartDate = formatDateForMySQL(startDate);
            const formattedEndDate = formatDateForMySQL(endDate);

            const bookingData = {
                car_id: car.id,
                start_date: formattedStartDate,
                end_date: formattedEndDate,
                total_price: Number(calculateTotalPrice().toFixed(2)),
                payment_intent_id: paymentIntentId
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create booking');
            }

            setShowSuccess(true);
            setTimeout(() => {
                onClose();
                navigate('/dashboard/bookings');
            }, 2000);
        } catch (err) {
            console.error('Booking error:', err);
            setError(err instanceof Error ? err.message : 'Failed to create booking');
        }
    };

    const handlePaymentError = (error: string) => {
        setError(error);
        setActiveStep(0);
    };

    const renderCarDetails = () => (
        <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
                <strong>Car:</strong> {car.make} {car.model}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
                <strong>Pick-up Location:</strong> {car.address || 'No location set for this vehicle'}
            </Typography>
            {!car.address && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                    This vehicle's location has not been set. Please contact support for assistance.
                </Alert>
            )}
            {startDate && endDate && (
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    <strong>Total Price:</strong> £{calculateTotalPrice().toFixed(2)}
                </Typography>
            )}
        </Box>
    );

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <DateTimePicker
                                label="Start Date"
                                value={startDate}
                                onChange={(newValue) => setStartDate(newValue)}
                                minDate={new Date()}
                                format="PPP p"
                                ampm={false}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '&:hover fieldset': {
                                            borderColor: 'secondary.main',
                                        },
                                    },
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        variant: 'outlined',
                                        helperText: 'Select your pickup date and time'
                                    }
                                }}
                            />
                            <DateTimePicker
                                label="End Date"
                                value={endDate}
                                onChange={(newValue) => setEndDate(newValue)}
                                minDate={startDate || new Date()}
                                format="PPP p"
                                ampm={false}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '&:hover fieldset': {
                                            borderColor: 'secondary.main',
                                        },
                                    },
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        variant: 'outlined',
                                        helperText: 'Select your return date and time'
                                    }
                                }}
                            />
                        </Box>
                    </LocalizationProvider>
                );
            case 1:
                return clientSecret ? (
                    <PaymentProvider
                        clientSecret={clientSecret}
                        amount={calculateTotalPrice()}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                    />
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <Typography>Loading payment form...</Typography>
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white', py: 2 }}>
                    Book {car.make} {car.model}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}
                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    {renderCarDetails()}
                    {renderStepContent()}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    {activeStep > 0 && (
                        <Button onClick={handleBack} disabled={loading}>
                            Back
                        </Button>
                    )}
                    {activeStep === 0 && (
                        <Button
                            onClick={handleNext}
                            variant="contained"
                            color="primary"
                            disabled={loading || !startDate || !endDate}
                        >
                            Next
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
            <Snackbar
                open={showSuccess}
                autoHideDuration={6000}
                onClose={() => setShowSuccess(false)}
            >
                <MuiAlert elevation={6} variant="filled" severity="success">
                    Booking created successfully! Redirecting to your bookings...
                </MuiAlert>
            </Snackbar>
        </>
    );
};

export default BookingDialog; 