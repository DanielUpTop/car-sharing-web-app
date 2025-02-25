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

interface BookingDialogProps {
    open: boolean;
    onClose: () => void;
    car: {
        id: number;
        make: string;
        model: string;
        daily_rate: number;
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
            const days = differenceInDays(endDate, startDate) + 1;
            return Number(car.daily_rate) * days;
        }
        return 0;
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

        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // Format dates to MySQL datetime format
            const formatDateForMySQL = (date: Date) => {
                return date.toISOString().slice(0, 19).replace('T', ' ');
            };

            const bookingData = {
                car_id: car.id,
                start_date: formatDateForMySQL(startDate),
                end_date: formatDateForMySQL(endDate),
                total_price: calculateTotalPrice()
            };

            console.log('Booking data being sent:', bookingData);

            const response = await fetch('http://localhost:5001/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to create booking');
            }

            setShowSuccess(true);
            setTimeout(() => {
                onClose();
                navigate('/bookings');
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
                            <Typography>Daily Rate:</Typography>
                            <Typography>£{Number(car.daily_rate).toFixed(2)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>Total Days:</Typography>
                            <Typography>
                                {startDate && endDate 
                                    ? `${differenceInDays(endDate, startDate) + 1} days`
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