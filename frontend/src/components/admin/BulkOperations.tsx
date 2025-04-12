import React, { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    ListItemText,
    OutlinedInput
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface BulkOperationsProps {
    selectedCars: number[];
    onOperationComplete: () => void;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({ selectedCars, onOperationComplete }) => {
    const [open, setOpen] = useState(false);
    const [operation, setOperation] = useState('');
    const [status, setStatus] = useState('');
    const { token } = useAuth();

    const handleSubmit = async () => {
        try {
            await axios.post(
                'http://localhost:5001/api/admin/cars/bulk',
                {
                    carIds: selectedCars,
                    operation,
                    status
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            onOperationComplete();
            setOpen(false);
        } catch (error) {
            console.error('Error performing bulk operation:', error);
        }
    };

    return (
        <>
            <Button
                variant="contained"
                color="primary"
                onClick={() => setOpen(true)}
                disabled={selectedCars.length === 0}
            >
                Bulk Operations ({selectedCars.length})
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Bulk Operations</DialogTitle>
                <DialogContent>
                    <Box sx={{ minWidth: 300, mt: 2 }}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Operation</InputLabel>
                            <Select
                                value={operation}
                                onChange={(e) => setOperation(e.target.value)}
                                label="Operation"
                            >
                                <MenuItem value="update_status">Update Status</MenuItem>
                                <MenuItem value="delete">Delete</MenuItem>
                            </Select>
                        </FormControl>

                        {operation === 'update_status' && (
                            <FormControl fullWidth>
                                <InputLabel>New Status</InputLabel>
                                <Select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    label="New Status"
                                >
                                    <MenuItem value="available">Available</MenuItem>
                                    <MenuItem value="maintenance">Maintenance</MenuItem>
                                    <MenuItem value="booked">Booked</MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default BulkOperations; 