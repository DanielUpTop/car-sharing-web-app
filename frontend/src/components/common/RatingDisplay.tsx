import React from 'react';
import { Box, Rating, Typography } from '@mui/material';

interface RatingDisplayProps {
    rating: number;
    totalRatings: number;
    size?: 'small' | 'medium' | 'large';
    showTotal?: boolean;
}

const RatingDisplay = ({ 
    rating, 
    totalRatings, 
    size = 'small',
    showTotal = true 
}: RatingDisplayProps) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating
                value={rating}
                precision={0.5}
                readOnly
                size={size}
            />
            {showTotal && (
                <Typography variant="body2" color="text.secondary">
                    ({totalRatings})
                </Typography>
            )}
        </Box>
    );
};

export default RatingDisplay; 