import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import { format } from 'date-fns';

interface Payment {
    id: string;
    amount: number;
    status: 'succeeded' | 'pending' | 'failed' | 'refunded';
    created_at: string;
    booking_id: number;
    car_details: {
        make: string;
        model: string;
    };
    payment_intent_id: string;
}

const PaymentHistory: React.FC = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/history`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch payment history');
                }

                const data = await response.json();
                setPayments(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load payment history');
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'succeeded':
                return 'success';
            case 'pending':
                return 'warning';
            case 'failed':
                return 'error';
            case 'refunded':
                return 'info';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Payment History
            </Typography>
            
            {payments.length === 0 ? (
                <Alert severity="info">No payment history found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Car</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Payment ID</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>
                                        {format(new Date(payment.created_at), 'PPP')}
                                    </TableCell>
                                    <TableCell>
                                        {payment.car_details.make} {payment.car_details.model}
                                    </TableCell>
                                    <TableCell>
                                        £{(payment.amount / 100).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={payment.status.toUpperCase()}
                                            color={getStatusColor(payment.status) as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="textSecondary">
                                            {payment.payment_intent_id.slice(-8)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default PaymentHistory; 