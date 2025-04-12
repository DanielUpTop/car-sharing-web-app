import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Rating,
    TextField,
    Box
} from '@mui/material';

interface RatingDialogProps {
    open: boolean;
    onClose: () => void;
    bookingId: number;
    carId: number;
}

const RatingDialog = ({ open, onClose, bookingId, carId }: RatingDialogProps) => {
    const [rating, setRating] = useState<number | null>(0);
    const [comment, setComment] = useState('');

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    booking_id: bookingId,
                    car_id: carId,
                    rating,
                    comment
                })
            });

            if (response.ok) {
                onClose();
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
                    <Rating
                        value={rating}
                        onChange={(_, newValue) => setRating(newValue)}
                        size="large"
                    />
                    <TextField
                        multiline
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        label="Your Review"
                        fullWidth
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">
                    Submit Rating
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RatingDialog; 