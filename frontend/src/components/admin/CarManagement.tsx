import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Paper,
    IconButton,
    Tooltip,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridValueGetter,
    GridRenderCellParams,
    GridValueFormatter,
} from '@mui/x-data-grid';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface Car {
    id: number;
    make: string;
    model: string;
    year: number;
    registration_number: string;
    price_per_hour: number;
    type: string;
    image_url: string;
    address: string;
    created_at: string;
}

interface CarFormData {
    make: string;
    model: string;
    year: number;
    registration_number: string;
    price_per_hour: number;
    type: string;
    image_url: string;
    address: string;
}

const initialFormData: CarFormData = {
    make: '',
    model: '',
    year: new Date().getFullYear(),
    registration_number: '',
    price_per_hour: 0,
    type: 'sedan',
    image_url: '',
    address: '',
};

const CarManagement = () => {
    const { token } = useAuth();
    const [cars, setCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState<CarFormData>(initialFormData);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    useEffect(() => {
        if (token) {
            fetchCars();
        }
    }, [token]);

    const fetchCars = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/admin/cars', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch cars');
            }

            const data = await response.json();
            setCars(data);
        } catch (error) {
            console.error('Error fetching cars:', error);
            showSnackbar('Failed to load cars', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (car?: Car) => {
        if (car) {
            setFormData({
                make: car.make,
                model: car.model,
                year: car.year,
                registration_number: car.registration_number,
                price_per_hour: car.price_per_hour,
                type: car.type || 'sedan',
                image_url: car.image_url || '',
                address: car.address || '',
            });
            setEditingId(car.id);
        } else {
            setFormData(initialFormData);
            setEditingId(null);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData(initialFormData);
        setEditingId(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'year' || name === 'daily_rate' ? Number(value) : value,
        }));
    };

    const handleSubmit = async () => {
        try {
            const url = `http://localhost:5001/api/admin/cars${editingId ? `/${editingId}` : ''}`;
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to save car');
            }

            showSnackbar(`Car ${editingId ? 'updated' : 'added'} successfully`, 'success');
            handleCloseDialog();
            fetchCars();
        } catch (error) {
            console.error('Error saving car:', error);
            showSnackbar(`Failed to ${editingId ? 'update' : 'add'} car`, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this car?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/api/admin/cars/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete car');
            }

            showSnackbar('Car deleted successfully', 'success');
            fetchCars();
        } catch (error) {
            console.error('Error deleting car:', error);
            showSnackbar('Failed to delete car', 'error');
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const columns: GridColDef[] = [
        { field: 'make', headerName: 'Make', flex: 1 },
        { field: 'model', headerName: 'Model', flex: 1 },
        { field: 'year', headerName: 'Year', width: 100 },
        { field: 'type', headerName: 'Type', width: 120 },
        { field: 'registration_number', headerName: 'Registration', width: 130 },
        {
            field: 'price_per_hour',
            headerName: 'Price/Hour',
            width: 120,
            valueFormatter: (params) => {
                const value = params.value ?? 0;
                return `£${Number(value).toFixed(2)}`;
            },
        },
        { field: 'address', headerName: 'Location', width: 250 },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            renderCell: (params: GridRenderCellParams<Car>) => (
                <Box>
                    <Tooltip title="Edit">
                        <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(params.row)}
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton
                            size="small"
                            onClick={() => handleDelete(params.row.id)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Car Management</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add New Car
                </Button>
            </Box>

            <Paper sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={cars}
                    columns={columns}
                    loading={loading}
                    pageSizeOptions={[10, 25, 50, 100]}
                    disableRowSelectionOnClick
                />
            </Paper>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit Car' : 'Add New Car'}</DialogTitle>
                <DialogContent>
                    <Box display="grid" gap={2} mt={2}>
                        <TextField
                            name="make"
                            label="Make"
                            value={formData.make}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            name="model"
                            label="Model"
                            value={formData.model}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            name="year"
                            label="Year"
                            type="number"
                            value={formData.year}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            name="type"
                            label="Type"
                            value={formData.type}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            name="registration_number"
                            label="Registration Number"
                            value={formData.registration_number}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            name="price_per_hour"
                            label="Price per Hour"
                            type="number"
                            value={formData.price_per_hour}
                            onChange={handleInputChange}
                            fullWidth
                            InputProps={{
                                startAdornment: '£',
                            }}
                        />
                        <TextField
                            name="image_url"
                            label="Image URL"
                            value={formData.image_url}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            name="address"
                            label="Pick-up Location"
                            value={formData.address}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            placeholder="Enter the full address where the car is stationed"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingId ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default CarManagement; 