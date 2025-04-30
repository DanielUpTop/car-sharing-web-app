import React, { useEffect, useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

const PaymentCompletion = () => {
    const stripe = useStripe();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!stripe) {
            return;
        }

        // Retrieve the "payment_intent_client_secret" query parameter
        const clientSecret = new URLSearchParams(window.location.search).get(
            'payment_intent_client_secret'
        );

        if (!clientSecret) {
            setStatus('error');
            setMessage('No payment information found');
            return;
        }

        stripe.retrievePaymentIntent(clientSecret)
            .then(({ paymentIntent }) => {
                if (!paymentIntent) {
                    setStatus('error');
                    setMessage('No payment information found');
                    return;
                }

                switch (paymentIntent.status) {
                    case 'succeeded':
                        setStatus('success');
                        setMessage('Payment successful! Redirecting to your bookings...');
                        // Redirect to membership page after 2 seconds
                        setTimeout(() => {
                            navigate('/dashboard/membership');
                        }, 2000);
                        break;
                    case 'processing':
                        setStatus('processing');
                        setMessage('Your payment is processing.');
                        break;
                    case 'requires_payment_method':
                        setStatus('error');
                        setMessage('Your payment was not successful, please try again.');
                        break;
                    default:
                        setStatus('error');
                        setMessage('Something went wrong.');
                        break;
                }
            })
            .catch((error) => {
                setStatus('error');
                setMessage('An error occurred while checking payment status.');
                console.error('Payment verification error:', error);
            });
    }, [stripe, navigate]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                p: 3
            }}
        >
            {status === 'processing' && <CircularProgress sx={{ mb: 2 }} />}
            <Typography
                variant="h5"
                color={
                    status === 'success'
                        ? 'success.main'
                        : status === 'error'
                            ? 'error.main'
                            : 'text.primary'
                }
                gutterBottom
            >
                {status === 'success' ? '✓ ' : status === 'error' ? '✕ ' : ''}{message}
            </Typography>
        </Box>
    );
};

export default PaymentCompletion; 