import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Paper
} from '@mui/material';
import RatingDialog from '../ratings/RatingDialog';
import { format } from 'date-fns';

interface Booking {
    id: number;
    car_id: number;
    start_date: string;
    end_date: string;
    total_price: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    rating?: number;
    car: {
        make: string;
        model: string;
        registration_number: string;
    };
}

const BookingHistory = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [ratingDialogOpen, setRatingDialogOpen] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/bookings/history', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const handleRateClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setRatingDialogOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'success';
            case 'pending': return 'warning';
            case 'cancelled': return 'error';
            case 'completed': return 'info';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Car Details</TableCell>
                            <TableCell>Booking Period</TableCell>
                            <TableCell>Total Price</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bookings.map((booking) => (
                            <TableRow key={booking.id}>
                                <TableCell>
                                    {booking.car.make} {booking.car.model}
                                    <Typography variant="caption" display="block">
                                        {booking.car.registration_number}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(booking.start_date), 'PPP')} -
                                    <br />
                                    {format(new Date(booking.end_date), 'PPP')}
                                </TableCell>
                                <TableCell>£{booking.total_price}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={booking.status} 
                                        color={getStatusColor(booking.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {booking.status === 'completed' && !booking.rating && (
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            size="small"
                                            onClick={() => handleRateClick(booking)}
                                        >
                                            Rate
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedBooking && (
                <RatingDialog
                    open={ratingDialogOpen}
                    onClose={() => setRatingDialogOpen(false)}
                    bookingId={selectedBooking.id}
                    carId={selectedBooking.car_id}
                />
            )}
        </Box>
    );
};

export default BookingHistory; 