import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip
} from '@mui/material';

interface BookingDetailsProps {
    open: boolean;
    onClose: () => void;
    booking: {
        id: number;
        user_email: string;
        car_make: string;
        car_model: string;
        start_date: string;
        end_date: string;
        status: string;
        total_price: number;
    };
    onStatusChange: (bookingId: number, newStatus: string) => void;
}

const BookingDetails = ({ open, onClose, booking, onStatusChange }: BookingDetailsProps) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Booking Details #{booking.id}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">Customer Email</Typography>
                    <Typography>{booking.user_email}</Typography>

                    <Typography variant="subtitle1" sx={{ mt: 2 }}>Vehicle</Typography>
                    <Typography>{`${booking.car_make} ${booking.car_model}`}</Typography>

                    <Typography variant="subtitle1" sx={{ mt: 2 }}>Booking Period</Typography>
                    <Typography>
                        From: {new Date(booking.start_date).toLocaleString()}
                    </Typography>
                    <Typography>
                        To: {new Date(booking.end_date).toLocaleString()}
                    </Typography>

                    <Typography variant="subtitle1" sx={{ mt: 2 }}>Status</Typography>
                    <Chip 
                        label={booking.status}
                        color={
                            booking.status === 'confirmed' ? 'success' :
                            booking.status === 'pending' ? 'warning' :
                            booking.status === 'cancelled' ? 'error' : 'default'
                        }
                    />

                    <Typography variant="subtitle1" sx={{ mt: 2 }}>Total Price</Typography>
                    <Typography>£{booking.total_price.toFixed(2)}</Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                {booking.status === 'pending' && (
                    <>
                        <Button 
                            onClick={() => onStatusChange(booking.id, 'confirmed')}
                            color="success"
                        >
                            Confirm
                        </Button>
                        <Button 
                            onClick={() => onStatusChange(booking.id, 'cancelled')}
                            color="error"
                        >
                            Cancel
                        </Button>
                    </>
                )}
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default BookingDetails; 