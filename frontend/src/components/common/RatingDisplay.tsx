import React from 'react';
import { Box, Rating, Typography } from '@mui/material';

interface RatingDisplayProps {
    rating?: number;
    totalRatings?: number;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({ rating = 0, totalRatings = 0 }) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Rating 
                value={rating} 
                precision={0.5} 
                readOnly 
                size="small"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
            </Typography>
        </Box>
    );
};

export default RatingDisplay; 