import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

interface MaintenanceRecord {
    id: number;
    car_id: number;
    maintenance_type: string;
    description: string;
    scheduled_date: string;
    completed_date: string | null;
    status: 'scheduled' | 'in_progress' | 'completed';
    cost: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    carId: number;
    onSubmit: (data: Omit<MaintenanceRecord, 'id'>) => void;
}

const CarMaintenance = ({ open, onClose, carId, onSubmit }: Props) => {
    const [formData, setFormData] = useState({
        maintenance_type: '',
        description: '',
        scheduled_date: new Date(),
        status: 'scheduled' as const,
        cost: 0
    });

    const handleSubmit = () => {
        onSubmit({
            car_id: carId,
            maintenance_type: formData.maintenance_type,
            description: formData.description,
            scheduled_date: formData.scheduled_date.toISOString().split('T')[0],
            completed_date: null,
            status: formData.status,
            cost: formData.cost
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Maintenance Type</InputLabel>
                        <Select
                            value={formData.maintenance_type}
                            label="Maintenance Type"
                            onChange={(e) => setFormData({
                                ...formData,
                                maintenance_type: e.target.value
                            })}
                        >
                            <MenuItem value="routine">Routine Service</MenuItem>
                            <MenuItem value="repair">Repair</MenuItem>
                            <MenuItem value="inspection">Inspection</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({
                            ...formData,
                            description: e.target.value
                        })}
                    />

                    <DatePicker
                        label="Scheduled Date"
                        value={formData.scheduled_date}
                        onChange={(newValue) => setFormData({
                            ...formData,
                            scheduled_date: newValue || new Date()
                        })}
                    />

                    <TextField
                        fullWidth
                        type="number"
                        label="Estimated Cost"
                        value={formData.cost}
                        onChange={(e) => setFormData({
                            ...formData,
                            cost: parseFloat(e.target.value)
                        })}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">
                    Schedule
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CarMaintenance; 