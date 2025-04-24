import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentForm from './PaymentForm';
import { Box, CircularProgress } from '@mui/material';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentProviderProps {
    clientSecret: string;
    amount: number;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
}

const PaymentProvider: React.FC<PaymentProviderProps> = ({
    clientSecret,
    amount,
    onSuccess,
    onError
}) => {
    if (!clientSecret) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    const options = {
        clientSecret,
        appearance: {
            theme: 'stripe' as const,
        }
    };

    return (
        <Elements stripe={stripePromise} options={options}>
            <PaymentForm
                amount={amount}
                onSuccess={onSuccess}
                onError={onError}
            />
        </Elements>
    );
};

export default PaymentProvider; 