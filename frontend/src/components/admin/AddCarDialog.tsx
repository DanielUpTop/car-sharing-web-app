import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    Box,
    CircularProgress
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { Car } from '../../types';

interface AddCarDialogProps {
    open: boolean;
    onClose: () => void;
    onCarAdded: () => void;
}

const initialCarData: Partial<Car> = {
    make: '',
    model: '',
    year: new Date().getFullYear(),
    registration_number: '',
    daily_rate: 0,
    price_per_hour: 0,
    type: 'petrol',
    seats: 5,
    availability_status: 'available'
};

const AddCarDialog: React.FC<AddCarDialogProps> = ({ open, onClose, onCarAdded }) => {
    const [carData, setCarData] = useState<Partial<Car>>(initialCarData);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const { token } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCarData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when field is modified
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        
        if (!carData.make) newErrors.make = 'Make is required';
        if (!carData.model) newErrors.model = 'Model is required';
        if (!carData.registration_number) newErrors.registration_number = 'Registration number is required';
        if (!carData.daily_rate || carData.daily_rate <= 0) newErrors.daily_rate = 'Valid daily rate is required';
        if (!carData.price_per_hour || carData.price_per_hour <= 0) newErrors.price_per_hour = 'Valid hourly rate is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);
        try {
            const response = await fetch('http://localhost:5001/api/admin/cars', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(carData)
            });

            if (!response.ok) {
                throw new Error('Failed to add car');
            }

            onCarAdded();
            onClose();
            setCarData(initialCarData);
        } catch (error) {
            console.error('Error adding car:', error);
            setErrors(prev => ({
                ...prev,
                submit: 'Failed to add car. Please try again.'
            }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Add New Car</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="make"
                                label="Make"
                                fullWidth
                                value={carData.make}
                                onChange={handleChange}
                                error={!!errors.make}
                                helperText={errors.make}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="model"
                                label="Model"
                                fullWidth
                                value={carData.model}
                                onChange={handleChange}
                                error={!!errors.model}
                                helperText={errors.model}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="year"
                                label="Year"
                                type="number"
                                fullWidth
                                value={carData.year}
                                onChange={handleChange}
                                error={!!errors.year}
                                helperText={errors.year}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="registration_number"
                                label="Registration Number"
                                fullWidth
                                value={carData.registration_number}
                                onChange={handleChange}
                                error={!!errors.registration_number}
                                helperText={errors.registration_number}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="daily_rate"
                                label="Daily Rate"
                                type="number"
                                fullWidth
                                value={carData.daily_rate}
                                onChange={handleChange}
                                error={!!errors.daily_rate}
                                helperText={errors.daily_rate}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="price_per_hour"
                                label="Hourly Rate"
                                type="number"
                                fullWidth
                                value={carData.price_per_hour}
                                onChange={handleChange}
                                error={!!errors.price_per_hour}
                                helperText={errors.price_per_hour}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                name="type"
                                label="Type"
                                fullWidth
                                value={carData.type}
                                onChange={handleChange}
                            >
                                <MenuItem value="electric">Electric</MenuItem>
                                <MenuItem value="hybrid">Hybrid</MenuItem>
                                <MenuItem value="petrol">Petrol</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="seats"
                                label="Number of Seats"
                                type="number"
                                fullWidth
                                value={carData.seats}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Add Car'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default AddCarDialog; 