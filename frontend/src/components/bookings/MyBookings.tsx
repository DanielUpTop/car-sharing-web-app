import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Chip,
    CircularProgress,
    Alert,
    AppBar,
    Toolbar,
    IconButton,
    Button
} from '@mui/material';
import { format } from 'date-fns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import CancelBookingDialog from './CancelBookingDialog';
import RatingDialog from './RatingDialog';

interface Booking {
    id: number;
    car_id: number;
    start_date: string;
    end_date: string;
    total_price: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    make: string;
    model: string;
    registration_number: string;
    rated?: boolean;
}

const MyBookings = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
    const [selectedBookingForRating, setSelectedBookingForRating] = useState<Booking | null>(null);
    const [ratingLoading, setRatingLoading] = useState(false);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5001/api/bookings/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to fetch bookings');
                }

                const formattedBookings = data.map((booking: any) => ({
                    ...booking,
                    total_price: Number(booking.total_price)
                }));

                setBookings(formattedBookings);
            } catch (err) {
                console.error('Error fetching bookings:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    const getStatusColor = (status: string): "success" | "warning" | "error" | "info" | "default" => {
        switch (status) {
            case 'confirmed': return 'success';
            case 'pending': return 'warning';
            case 'cancelled': return 'error';
            case 'completed': return 'info';
            default: return 'default';
        }
    };

    const handleCancelBooking = async (bookingId: number) => {
        try {
            setCancelLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5001/api/bookings/${bookingId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to cancel booking');
            }

            setBookings(bookings.map(booking => 
                booking.id === bookingId 
                    ? { ...booking, status: 'cancelled' }
                    : booking
            ));

            setCancelDialogOpen(false);
            setSelectedBooking(null);
        } catch (err) {
            console.error('Error canceling booking:', err);
            setError(err instanceof Error ? err.message : 'Failed to cancel booking');
        } finally {
            setCancelLoading(false);
        }
    };

    const handleCancelClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setCancelDialogOpen(true);
    };

    const handleRatingSubmit = async (rating: number, comment: string) => {
        if (!selectedBookingForRating) return;

        try {
            setRatingLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    booking_id: selectedBookingForRating.id,
                    car_id: selectedBookingForRating.car_id,
                    rating,
                    comment
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit rating');
            }

            setBookings(bookings.map(booking =>
                booking.id === selectedBookingForRating.id
                    ? { ...booking, rated: true }
                    : booking
            ));

            setRatingDialogOpen(false);
            setSelectedBookingForRating(null);
        } catch (err) {
            console.error('Error submitting rating:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit rating');
        } finally {
            setRatingLoading(false);
        }
    };

    const handleOpenRatingDialog = (booking: Booking) => {
        setSelectedBookingForRating(booking);
        setRatingDialogOpen(true);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <AppBar position="fixed" sx={{ backgroundColor: '#1976d2' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate('/dashboard')}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        My Bookings
                    </Typography>
                </Toolbar>
            </AppBar>
            <Toolbar />

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3, mb: 4, backgroundColor: '#f8f9fa' }}>
                    <Typography variant="h4" gutterBottom color="secondary">
                        My Booking History
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        View and manage your car bookings.
                    </Typography>
                </Paper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {bookings.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#fff' }}>
                        <Typography variant="h6" color="text.secondary">
                            No bookings found
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                            Start by browsing our available cars and make your first booking!
                        </Typography>
                    </Paper>
                ) : (
                    <TableContainer component={Paper} sx={{ 
                        mt: 2, 
                        boxShadow: 3,
                        '& .MuiTableCell-head': {
                            backgroundColor: '#f5f5f5',
                            fontWeight: 'bold'
                        }
                    }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Car Details</TableCell>
                                    <TableCell>Booking Period</TableCell>
                                    <TableCell>Total Price</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bookings.map((booking) => (
                                    <TableRow 
                                        key={booking.id}
                                        sx={{ '&:hover': { backgroundColor: '#fafafa' } }}
                                    >
                                        <TableCell>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                                {booking.make} {booking.model}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Reg: {booking.registration_number}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                From: {format(new Date(booking.start_date), 'PPP p')}
                                            </Typography>
                                            <Typography variant="body2">
                                                To: {format(new Date(booking.end_date), 'PPP p')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="h6" color="primary">
                                                £{Number(booking.total_price).toFixed(2)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <Chip 
                                                    label={booking.status.toUpperCase()} 
                                                    color={getStatusColor(booking.status)}
                                                    sx={{ fontWeight: 'medium', minWidth: 100 }}
                                                />
                                                {booking.status === 'pending' && (
                                                    <Button
                                                        variant="outlined"
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleCancelClick(booking)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                                {booking.status === 'completed' && !booking.rated && (
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        size="small"
                                                        onClick={() => handleOpenRatingDialog(booking)}
                                                    >
                                                        Rate Car
                                                    </Button>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Container>
            <CancelBookingDialog
                open={cancelDialogOpen}
                onClose={() => {
                    setCancelDialogOpen(false);
                    setSelectedBooking(null);
                }}
                onConfirm={() => selectedBooking && handleCancelBooking(selectedBooking.id)}
                loading={cancelLoading}
                bookingDetails={selectedBooking}
            />
            <RatingDialog
                open={ratingDialogOpen}
                onClose={() => {
                    setRatingDialogOpen(false);
                    setSelectedBookingForRating(null);
                }}
                onSubmit={handleRatingSubmit}
                loading={ratingLoading}
                carDetails={selectedBookingForRating ? {
                    make: selectedBookingForRating.make,
                    model: selectedBookingForRating.model
                } : null}
            />
        </>
    );
};

export default MyBookings; 