import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Visibility } from '@mui/icons-material';

interface Booking {
    id: number;
    user_id: number;
    car_id: number;
    start_date: string;
    end_date: string;
    status: string;
    total_price: number;
}

const BookingManagement = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('http://localhost:5001/api/admin/bookings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Full response data:', JSON.stringify(data, null, 2));

            if (!Array.isArray(data)) {
                throw new Error('Expected array of bookings but got: ' + typeof data);
            }

            const validatedData = data.map((booking: any, index: number) => ({
                id: booking.id || index,
                user_id: booking.user_id || 'N/A',
                car_id: booking.car_id || 'N/A',
                start_date: booking.start_date || new Date().toISOString(),
                end_date: booking.end_date || new Date().toISOString(),
                status: booking.status || 'unknown',
                total_price: parseFloat(booking.total_price) || 0,
                user: {
                    first_name: booking.first_name || 'N/A',
                    last_name: booking.last_name || 'N/A',
                    email: booking.email || 'N/A',
                },
                car: {
                    make: booking.make || 'N/A',
                    model: booking.model || 'N/A',
                    registration_number: booking.registration_number || 'N/A',
                },
            }));

            console.log('Validated data:', validatedData);
            setBookings(validatedData);
        } catch (error) {
            console.error('Error in fetchBookings:', error);
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'user',
            headerName: 'Customer',
            width: 200,
            valueGetter: (params) => {
                const user = params.row.user;
                return user ? `${user.first_name} ${user.last_name}` : 'N/A';
            },
        },
        {
            field: 'car',
            headerName: 'Car',
            width: 200,
            valueGetter: (params) => {
                const car = params.row.car;
                return car ? `${car.make} ${car.model} (${car.registration_number})` : 'N/A';
            },
        },
        {
            field: 'start_date',
            headerName: 'Start Date',
            width: 200,
            valueFormatter: (params) => {
                try {
                    return new Date(params.value).toLocaleString();
                } catch (e) {
                    return 'Invalid Date';
                }
            },
        },
        {
            field: 'end_date',
            headerName: 'End Date',
            width: 200,
            valueFormatter: (params) => {
                try {
                    return new Date(params.value).toLocaleString();
                } catch (e) {
                    return 'Invalid Date';
                }
            },
        },
        {
            field: 'total_price',
            headerName: 'Total Price',
            width: 130,
            valueFormatter: (params) => {
                return `£${Number(params.value || 0).toFixed(2)}`;
            },
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={params.value === 'confirmed' ? 'success' : 'default'}
                    size="small"
                />
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 130,
            renderCell: (params) => (
                <IconButton
                    size="small"
                    onClick={() => {
                        console.log('View booking:', params.row);
                    }}
                >
                    <Visibility />
                </IconButton>
            ),
        },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Booking Management
            </Typography>
            
            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Typography>
            )}
            
            <Box sx={{ height: 400, width: '100%' }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress />
                    </Box>
                ) : (
                    <DataGrid
                        rows={bookings}
                        columns={columns}
                        pageSize={5}
                        rowsPerPageOptions={[5, 10, 20]}
                        checkboxSelection
                        disableSelectionOnClick
                        autoHeight
                        getRowId={(row) => row.id}
                    />
                )}
            </Box>
        </Box>
    );
};

export default BookingManagement; 