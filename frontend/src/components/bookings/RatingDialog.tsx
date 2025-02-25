import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Rating,
    TextField,
    CircularProgress
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

interface RatingDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
    loading: boolean;
    carDetails: {
        make: string;
        model: string;
    } | null;
}

const RatingDialog = ({ open, onClose, onSubmit, loading, carDetails }: RatingDialogProps) => {
    const [rating, setRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [hover, setHover] = useState(-1);

    const labels: { [index: string]: string } = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent',
    };

    const handleSubmit = () => {
        if (rating !== null) {
            onSubmit(rating, comment);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                Rate Your Experience
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                {carDetails && (
                    <Typography variant="h6" gutterBottom>
                        {carDetails.make} {carDetails.model}
                    </Typography>
                )}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'column',
                        my: 2
                    }}
                >
                    <Rating
                        size="large"
                        value={rating}
                        onChange={(_, newValue) => {
                            setRating(newValue);
                        }}
                        onChangeActive={(_, newHover) => {
                            setHover(newHover);
                        }}
                        emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
                    />
                    {rating !== null && (
                        <Typography variant="body1" sx={{ mt: 1 }}>
                            {labels[hover !== -1 ? hover : rating]}
                        </Typography>
                    )}
                </Box>
                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    label="Comments (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={loading}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={loading || rating === null}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                    {loading ? 'Submitting...' : 'Submit Rating'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RatingDialog; 