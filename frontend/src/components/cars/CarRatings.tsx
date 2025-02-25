import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemText,
    Typography,
    Box,
    Rating,
    Divider,
    CircularProgress
} from '@mui/material';
import { format } from 'date-fns';

interface Rating {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    first_name: string;
    last_name: string;
}

interface CarRatingsProps {
    open: boolean;
    onClose: () => void;
    carId: number;
    carName: string;
}

const CarRatings = ({ open, onClose, carId, carName }: CarRatingsProps) => {
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            fetchRatings();
        }
    }, [open, carId]);

    const fetchRatings = async () => {
        try {
            const response = await fetch(`http://localhost:5001/api/ratings/car/${carId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch ratings');
            }

            setRatings(data.ratings);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch ratings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Reviews for {carName}
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Typography color="error">{error}</Typography>
                ) : ratings.length === 0 ? (
                    <Typography>No reviews yet</Typography>
                ) : (
                    <List>
                        {ratings.map((rating, index) => (
                            <React.Fragment key={rating.id}>
                                {index > 0 && <Divider />}
                                <ListItem alignItems="flex-start">
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Rating value={rating.rating} readOnly size="small" />
                                                <Typography variant="body2" color="text.secondary">
                                                    by {rating.first_name} {rating.last_name[0]}.
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                    color="text.primary"
                                                >
                                                    {rating.comment}
                                                </Typography>
                                                <Typography
                                                    component="span"
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                >
                                                    {format(new Date(rating.created_at), 'PPP')}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CarRatings; 