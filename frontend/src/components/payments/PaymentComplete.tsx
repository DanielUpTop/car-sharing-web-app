import React, { useEffect, useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

const PaymentComplete: React.FC = () => {
    const stripe = useStripe();
    const navigate = useNavigate();
    const [message, setMessage] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!stripe) {
            return;
        }

        // Retrieve the "payment_intent_client_secret" query parameter from the URL
        const clientSecret = new URLSearchParams(window.location.search).get(
            'payment_intent_client_secret'
        );

        if (!clientSecret) {
            setMessage('No payment intent client secret found');
            setLoading(false);
            return;
        }

        stripe
            .retrievePaymentIntent(clientSecret)
            .then(({ paymentIntent }) => {
                if (!paymentIntent) {
                    setMessage('No payment intent found');
                    return;
                }

                switch (paymentIntent.status) {
                    case 'succeeded':
                        setMessage('Payment successful! Redirecting to your bookings...');
                        // Redirect to bookings page after 2 seconds
                        setTimeout(() => {
                            navigate('/bookings');
                        }, 2000);
                        break;
                    case 'processing':
                        setMessage('Your payment is processing.');
                        break;
                    case 'requires_payment_method':
                        setMessage('Your payment was not successful, please try again.');
                        break;
                    default:
                        setMessage('Something went wrong.');
                        break;
                }
            })
            .catch((error) => {
                setMessage('An error occurred while checking payment status.');
                console.error('Error:', error);
            })
            .finally(() => {
                setLoading(false);
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
                gap: 3,
                p: 3
            }}
        >
            {loading ? (
                <CircularProgress />
            ) : (
                <Alert 
                    severity={message.includes('successful') ? 'success' : 'error'}
                    sx={{ width: '100%', maxWidth: 500 }}
                >
                    <Typography variant="body1">
                        {message}
                    </Typography>
                </Alert>
            )}
        </Box>
    );
};

export default PaymentComplete; 