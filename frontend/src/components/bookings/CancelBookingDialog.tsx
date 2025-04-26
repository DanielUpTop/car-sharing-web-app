import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
    Alert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { canCancelBooking, MembershipType } from '../../utils/membershipUtils';

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
    const [membershipType, setMembershipType] = useState<MembershipType>(null);
    const [cancellationsUsed, setCancellationsUsed] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMembershipInfo = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                // Fetch membership type
                const membershipResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (membershipResponse.status === 404) {
                    setMembershipType(null);
                } else if (membershipResponse.ok) {
                    const membershipData = await membershipResponse.json();
                    setMembershipType(membershipData.type as MembershipType);
                }
                
                // Fetch cancellations used this month
                const cancellationsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/cancellations/count`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (cancellationsResponse.ok) {
                    const cancellationsData = await cancellationsResponse.json();
                    setCancellationsUsed(cancellationsData.count || 0);
                }
            } catch (error) {
                console.error('Error fetching membership info:', error);
            }
        };
        
        fetchMembershipInfo();
    }, []);

    const freeCancel = canCancelBooking(membershipType, cancellationsUsed);

    const handleCancel = async () => {
        if (!bookingDetails?.id) return;
        
        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${bookingDetails.id}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reason: cancelReason,
                    freeCancel: freeCancel // Include whether this is a free cancellation based on membership
                })
            });
            
            if (response.ok) {
                onConfirm();
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to cancel booking');
            }
        } catch (err) {
            setError('An error occurred while trying to cancel the booking');
            console.error('Error cancelling booking:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

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
                <Box sx={{ mb: 2, mt: 1 }}>
                    {freeCancel ? (
                        <Alert severity="success">
                            Your {membershipType} membership includes free cancellations. 
                            No fee will be charged for this cancellation.
                        </Alert>
                    ) : (
                        <Alert severity="warning">
                            {membershipType 
                              ? `You've used all your free cancellations for this month with your ${membershipType} membership.`
                              : "Non-members don't have free cancellations."} 
                            A cancellation fee may apply.
                        </Alert>
                    )}
                </Box>
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
                    onClick={handleCancel}
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