import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
    Box,
    CircularProgress,
    AppBar,
    Toolbar,
    IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Booking {
    id: number;
    car_id: number;
    start_date: string;
    end_date: string;
    status: string;
    total_price: number;
    make: string;
    model: string;
}

const getStatusColor = (status: string): "success" | "warning" | "error" | "info" | "default" => {
    switch (status.toLowerCase()) {
        case 'confirmed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'cancelled':
            return 'error';
        case 'completed':
            return 'info';
        default:
            return 'default';
    }
};

const formatPrice = (price: number): string => {
    return `£${Number(price).toFixed(2)}`;
};

const Bookings = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/bookings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }

            const data = await response.json();
            setBookings(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    return (
        <>
            <AppBar position="fixed">
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

            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Paper sx={{ p: 2 }}>
                    {bookings.length === 0 ? (
                        <Typography variant="h6" textAlign="center" py={4}>
                            No bookings found
                        </Typography>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Car</TableCell>
                                    <TableCell>Start Date</TableCell>
                                    <TableCell>End Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Total Price</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bookings.map((booking) => (
                                    <TableRow key={booking.id}>
                                        <TableCell>{booking.make} {booking.model}</TableCell>
                                        <TableCell>{format(new Date(booking.start_date), 'PP')}</TableCell>
                                        <TableCell>{format(new Date(booking.end_date), 'PP')}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={booking.status}
                                                color={getStatusColor(booking.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">{formatPrice(booking.total_price)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Paper>
            </Container>
        </>
    );
};

export default Bookings; 