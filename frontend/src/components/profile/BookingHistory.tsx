import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    Paper
} from '@mui/material';
import { format } from 'date-fns';

interface Booking {
    id: number;
    car_id: number;
    start_date: string;
    end_date: string;
    total_price: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    car: {
        make: string;
        model: string;
        registration_number: string;
    };
}

const BookingHistory = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [error, setError] = useState('');

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
            setError('Failed to fetch booking history');
        }
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
            <Typography variant="h5" sx={{ mb: 3 }}>Booking History</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Car</TableCell>
                            <TableCell>Dates</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bookings.map((booking) => (
                            <TableRow key={booking.id}>
                                <TableCell>
                                    {booking.car.make} {booking.car.model}
                                    <Typography variant="caption" display="block" color="textSecondary">
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
                                        color={getStatusColor(booking.status) as any}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {booking.status === 'pending' && (
                                        <Button 
                                            variant="outlined" 
                                            color="error"
                                            size="small"
                                            onClick={() => {/* Add cancel booking handler */}}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default BookingHistory; 