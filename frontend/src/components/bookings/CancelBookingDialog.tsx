import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

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
}

interface CancelBookingDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
    bookingDetails: Booking | null;
}

const CancelBookingDialog = ({ 
    open, 
    onClose, 
    onConfirm, 
    loading,
    bookingDetails 
}: CancelBookingDialogProps) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
                Cancel Booking
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                <Box display="flex" alignItems="center" mb={2}>
                    <WarningIcon color="error" sx={{ fontSize: 40, mr: 2 }} />
                    <Typography variant="h6">
                        Are you sure you want to cancel this booking?
                    </Typography>
                </Box>
                {bookingDetails && (
                    <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="body1" gutterBottom>
                            Car: {bookingDetails.make} {bookingDetails.model}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Start Date: {new Date(bookingDetails.start_date).toLocaleDateString()}
                        </Typography>
                    </Box>
                )}
                <Typography color="error" sx={{ mt: 2 }}>
                    This action cannot be undone.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    disabled={loading}
                >
                    Keep Booking
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="error"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                    {loading ? 'Cancelling...' : 'Cancel Booking'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CancelBookingDialog; 