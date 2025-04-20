import React from 'react';
import {
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { Box, Button, Typography, CircularProgress } from '@mui/material';

interface PaymentFormProps {
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
    amount: number;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, onError, amount }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage('');

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
            });

            if (error) {
                setErrorMessage(error.message || 'An error occurred');
                onError(error.message || 'Payment failed');
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onSuccess(paymentIntent.id);
            }
        } catch (e) {
            setErrorMessage('An unexpected error occurred');
            onError('Payment failed');
        }

        setIsProcessing(false);
    };

    return (
        <Box sx={{ maxWidth: 500, mx: 'auto', p: 2 }}>
            <form onSubmit={handleSubmit}>
                <Typography variant="h6" gutterBottom>
                    Payment Details - £{amount.toFixed(2)}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                    <PaymentElement />
                </Box>

                {errorMessage && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {errorMessage}
                    </Typography>
                )}

                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={isProcessing || !stripe}
                    sx={{ mt: 2 }}
                >
                    {isProcessing ? (
                        <CircularProgress size={24} />
                    ) : (
                        `Pay £${amount.toFixed(2)}`
                    )}
                </Button>
            </form>
        </Box>
    );
};

export default PaymentForm; 