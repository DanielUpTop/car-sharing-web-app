import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardMedia,
    CardContent,
    Typography,
    IconButton,
    Rating
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';

interface Car {
    id: number;
    make: string;
    model: string;
    year: number;
    price_per_hour: number;
    image_url: string;
    rating: number;
}

const FavoritesList = () => {
    const [favorites, setFavorites] = useState<Car[]>([]);

    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/favorites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setFavorites(data);
        } catch (error) {
            console.error('Error fetching favorites:', error);
        }
    };

    const removeFavorite = async (carId: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:5001/api/favorites/${carId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setFavorites(favorites.filter(car => car.id !== carId));
        } catch (error) {
            console.error('Error removing favorite:', error);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>My Favorite Cars</Typography>
            <Grid container spacing={3}>
                {favorites.map((car) => (
                    <Grid item xs={12} sm={6} md={4} key={car.id}>
                        <Card>
                            <CardMedia
                                component="img"
                                height="140"
                                image={car.image_url}
                                alt={`${car.make} ${car.model}`}
                            />
                            <CardContent>
                                <Typography variant="h6">
                                    {car.make} {car.model} ({car.year})
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Rating value={car.rating} readOnly size="small" />
                                    <Typography variant="body2" sx={{ ml: 1 }}>
                                        {car.rating.toFixed(1)}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    £{car.price_per_hour}/hour
                                </Typography>
                                <IconButton 
                                    color="error"
                                    onClick={() => removeFavorite(car.id)}
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                >
                                    <FavoriteIcon />
                                </IconButton>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default FavoritesList; 