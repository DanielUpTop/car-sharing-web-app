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
    Snackbar
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import MuiAlert from '@mui/material/Alert';
import { sendBookingConfirmationEmail } from '../../services/emailService';

interface BookingDialogProps {
    open: boolean;
    onClose: () => void;
    car: {
        id: number;
        make: string;
        model: string;
        type: string;
        pricePerHour: number;
        image: string;
    };
}

const BookingDialog = ({ open, onClose, car }: BookingDialogProps) => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

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

    const handleSubmit = async () => {
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

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const formattedStartDate = formatDateForMySQL(startDate);
            const formattedEndDate = formatDateForMySQL(endDate);

            const bookingData = {
                car_id: car.id,
                start_date: formattedStartDate,
                end_date: formattedEndDate,
                total_price: Number(totalPrice.toFixed(2))
            };

            console.log('Attempting to create booking with data:', {
                ...bookingData,
                token: token.substring(0, 10) + '...'
            });

            const response = await fetch('http://localhost:5001/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();
            console.log('Server response:', data);
            
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to create booking');
            }

            setShowSuccess(true);
            setTimeout(() => {
                onClose();
                navigate('/dashboard/bookings');
            }, 2000);

        } catch (err) {
            console.error('Booking error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
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

                    <Box sx={{ 
                        mt: 4, 
                        p: 2, 
                        bgcolor: 'secondary.main', 
                        borderRadius: 1,
                        color: 'white'
                    }}>
                        <Typography variant="h6" gutterBottom>
                            Booking Summary
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>Hourly Rate:</Typography>
                            <Typography>£{Number(car.pricePerHour).toFixed(2)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>Total Hours:</Typography>
                            <Typography>
                                {startDate && endDate 
                                    ? `${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))} hours`
                                    : '-'
                                }
                            </Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            borderTop: '1px solid rgba(255,255,255,0.2)',
                            pt: 1,
                            mt: 1
                        }}>
                            <Typography variant="h6">Total Price:</Typography>
                            <Typography variant="h6">
                                £{calculateTotalPrice().toFixed(2)}
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
                    <Button 
                        onClick={onClose}
                        variant="outlined"
                        color="secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        color="secondary"
                        disabled={loading || !startDate || !endDate}
                        sx={{ minWidth: 150 }}
                    >
                        {loading ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar 
                open={showSuccess} 
                autoHideDuration={2000} 
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <MuiAlert 
                    elevation={6} 
                    variant="filled" 
                    severity="success"
                    sx={{ width: '100%' }}
                >
                    Booking confirmed successfully! Redirecting to My Bookings...
                </MuiAlert>
            </Snackbar>
        </>
    );
};

export default BookingDialog; 