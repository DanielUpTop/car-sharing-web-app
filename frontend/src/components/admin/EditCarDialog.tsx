import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    CircularProgress,
    Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { Car } from '../../types';

interface EditCarDialogProps {
    open: boolean;
    onClose: () => void;
    car: Car;
    onCarUpdated: () => void;
}

const EditCarDialog: React.FC<EditCarDialogProps> = ({ 
    open, 
    onClose, 
    car, 
    onCarUpdated 
}) => {
    const [carData, setCarData] = useState<Car>(car);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const { token } = useAuth();

    useEffect(() => {
        setCarData(car);
    }, [car]);

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
            const response = await fetch(`http://localhost:5001/api/admin/cars/${car.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(carData)
            });

            if (!response.ok) {
                throw new Error('Failed to update car');
            }

            onCarUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating car:', error);
            setErrors(prev => ({
                ...prev,
                submit: 'Failed to update car. Please try again.'
            }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Car</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {errors.submit && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errors.submit}
                        </Alert>
                    )}
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
                                select
                                name="availability_status"
                                label="Status"
                                fullWidth
                                value={carData.availability_status}
                                onChange={handleChange}
                            >
                                <MenuItem value="available">Available</MenuItem>
                                <MenuItem value="booked">Booked</MenuItem>
                                <MenuItem value="maintenance">Maintenance</MenuItem>
                            </TextField>
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
                        {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default EditCarDialog; 