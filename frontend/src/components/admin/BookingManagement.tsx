import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    IconButton,
    Tooltip,
    Snackbar,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableRow,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridValueGetterParams
} from '@mui/x-data-grid';
import {
    Visibility as ViewIcon,
    Cancel as CancelIcon,
    CheckCircle as ApproveIcon,
    Pending as PendingIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface Booking {
    id: number;
    user_id: number;
    car_id: number;
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
    car: {
        make: string;
        model: string;
        registration_number: string;
    };
    start_date: string;
    end_date: string;
    total_price: string | number;
    status: string;
    created_at: string;
}

interface BookingDetails extends Booking {
    payment_status?: string;
    notes?: string;
}

const BookingManagement = () => {
    const { token } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const columns: GridColDef[] = [
        {
            field: 'user',
            headerName: 'Customer',
            width: 200,
            renderCell: (params) => {
                const user = params.row?.user;
                return user ? `${user.first_name} ${user.last_name}` : '';
            }
        },
        {
            field: 'car',
            headerName: 'Car',
            width: 200,
            renderCell: (params) => {
                const car = params.row?.car;
                return car ? `${car.make} ${car.model} (${car.registration_number})` : '';
            }
        },
        {
            field: 'start_date',
            headerName: 'Start Date',
            width: 180,
            renderCell: (params) => {
                try {
                    return params.value ? format(new Date(params.value), 'PPP p') : '';
                } catch (error) {
                    return '';
                }
            }
        },
        {
            field: 'end_date',
            headerName: 'End Date',
            width: 180,
            renderCell: (params) => {
                try {
                    return params.value ? format(new Date(params.value), 'PPP p') : '';
                } catch (error) {
                    return '';
                }
            }
        },
        {
            field: 'total_price',
            headerName: 'Total Price',
            width: 130,
            renderCell: (params) => {
                const price = params.value || 0;
                return `£${Number(price).toFixed(2)}`;
            }
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            renderCell: (params) => {
                const status = params.value?.toString() || '';
                return (
                    <Chip
                        label={status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                        color={
                            status === 'confirmed' ? 'success' :
                            status === 'pending' ? 'warning' :
                            status === 'cancelled' ? 'error' : 'default'
                        }
                        size="small"
                    />
                );
            }
        },
        {
            field: 'created_at',
            headerName: 'Booked On',
            width: 180,
            renderCell: (params) => {
                try {
                    return params.value ? format(new Date(params.value), 'PPP p') : '';
                } catch (error) {
                    return '';
                }
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 100,
            renderCell: (params) => (
                <Tooltip title="View Details">
                    <IconButton 
                        size="small" 
                        onClick={() => params.row?.id && handleViewDetails(params.row.id)}
                    >
                        <ViewIcon />
                    </IconButton>
                </Tooltip>
            )
        }
    ];

    const fetchBookings = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/admin/bookings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }

            const data = await response.json();
            console.log('Fetched bookings:', data);
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setSnackbar({
                open: true,
                message: 'Failed to load bookings',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (bookingId: number) => {
        try {
            const response = await fetch(`http://localhost:5001/api/admin/bookings/${bookingId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch booking details');
            }

            const data = await response.json();
            setSelectedBooking(data);
            setOpenDialog(true);
        } catch (error) {
            console.error('Error fetching booking details:', error);
            setSnackbar({
                open: true,
                message: 'Failed to load booking details',
                severity: 'error'
            });
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedBooking(null);
    };

    const handleStatusChange = async (bookingId: number, newStatus: string) => {
        try {
            const response = await fetch(`http://localhost:5001/api/admin/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update booking status');
            }

            // Update the bookings list
            await fetchBookings();
            
            setSnackbar({
                open: true,
                message: 'Booking status updated successfully',
                severity: 'success'
            });
            
            handleCloseDialog();
        } catch (error) {
            console.error('Error updating booking status:', error);
            setSnackbar({
                open: true,
                message: 'Failed to update booking status',
                severity: 'error'
            });
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [token]);

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Typography variant="h4" gutterBottom>
                Booking Management
            </Typography>
            
            <DataGrid
                rows={bookings}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10]}
                disableSelectionOnClick
                autoHeight
                loading={loading}
                sx={{
                    backgroundColor: 'white',
                    '& .MuiDataGrid-cell': {
                        borderBottom: '1px solid #f0f0f0'
                    }
                }}
            />

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Booking Details
                </DialogTitle>
                <DialogContent>
                    {selectedBooking && (
                        <Box sx={{ mt: 2 }}>
                            <Paper sx={{ p: 2 }}>
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" sx={{ fontWeight: 'bold', width: '200px' }}>
                                                Customer Name
                                            </TableCell>
                                            <TableCell>
                                                {`${selectedBooking.user.first_name} ${selectedBooking.user.last_name}`}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                                Customer Email
                                            </TableCell>
                                            <TableCell>
                                                {selectedBooking.user.email}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                                Car Details
                                            </TableCell>
                                            <TableCell>
                                                {`${selectedBooking.car.make} ${selectedBooking.car.model} (${selectedBooking.car.registration_number})`}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                                Booking Period
                                            </TableCell>
                                            <TableCell>
                                                {`${format(new Date(selectedBooking.start_date), 'PPP p')} - ${format(new Date(selectedBooking.end_date), 'PPP p')}`}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                                Total Price
                                            </TableCell>
                                            <TableCell>
                                                {`£${Number(selectedBooking.total_price).toFixed(2)}`}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                                Current Status
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                                                    color={
                                                        selectedBooking.status === 'confirmed' ? 'success' :
                                                        selectedBooking.status === 'pending' ? 'warning' :
                                                        selectedBooking.status === 'cancelled' ? 'error' : 'default'
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                                Booked On
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(selectedBooking.created_at), 'PPP p')}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Box>
                        {selectedBooking && selectedBooking.status === 'pending' && (
                            <>
                                <Button
                                    startIcon={<ApproveIcon />}
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleStatusChange(selectedBooking.id, 'confirmed')}
                                    sx={{ mr: 1 }}
                                >
                                    Approve
                                </Button>
                                <Button
                                    startIcon={<CancelIcon />}
                                    variant="contained"
                                    color="error"
                                    onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </Box>
                    <Button onClick={handleCloseDialog} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default BookingManagement; 