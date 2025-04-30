import React, { FormEvent, useState } from 'react';
import {
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { StripePaymentElementOptions } from '@stripe/stripe-js';

interface PaymentFormProps {
    amount: number;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
    amount,
    onSuccess,
    onError,
}) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!stripe || !elements) {
            console.error('Stripe.js has not loaded yet.');
            setMessage('Payment system not ready.');
            return;
        }

        setIsProcessing(true);

        // 1. Trigger form validation and wallet collection (Optional but recommended)
        //    If you skip this, confirmPayment will do it, but submitting first
        //    gives slightly better UX for validation errors.
        // const { error: submitError } = await elements.submit();
        // if (submitError) {
        //     setMessage(submitError.message ?? 'Error validating payment details.');
        //     onError(submitError.message ?? 'Validation error');
        //     setIsProcessing(false);
        //     return;
        // }

        // 2. Confirm the payment using details collected by the PaymentElement
        //    The clientSecret is automatically used from the Elements options.
        console.log('Attempting stripe.confirmPayment...');
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements, // Pass the elements group
            confirmParams: {
                // return_url is required for confirmPayment, even if we try to handle result client-side
                // It's the fallback if browser interaction is needed (e.g., 3D Secure)
                return_url: `${window.location.origin}/payment/success?bookingDialog=true`, // Redirect back to a success/status page
            },
             redirect: 'if_required' // Default, attempts to handle without redirect if possible
        });

        // 3. Handle the result
        // This block is primarily for handling *immediate* errors before any redirect.
        // Success handling for redirects happens on the return_url page.
        if (error) {
            console.error('Stripe payment confirmation error (immediate):', error);
            const errorMessage = error.type === "card_error" || error.type === "validation_error"
                ? error.message
                : "An unexpected error occurred during payment setup.";
            setMessage(errorMessage ?? 'Unknown payment error');
            onError(errorMessage ?? 'Unknown payment error');
        } else if (paymentIntent) {
             // This might be reached if redirect: 'if_required' completes without redirecting
             // (e.g., payment success without 3D Secure)
             console.log('PaymentForm: Payment confirmation finished without redirect. Status:', paymentIntent.status);
             if (paymentIntent.status === 'succeeded') {
                 console.log('PaymentForm: Payment SUCCEEDED. Calling onSuccess...');
                 setMessage('Payment successful!');
                 onSuccess(paymentIntent.id);
             } else {
                 setMessage(`Payment status: ${paymentIntent.status}`);
                 console.log('PaymentForm: Payment status not succeeded:', paymentIntent.status);
                 // Consider calling onError or just displaying message
             }
        } else {
             // If no error and no paymentIntent, it likely means a redirect is happening or pending.
             // We don't typically call onSuccess/onError here.
             console.log('confirmPayment called, redirect likely occurring or pending.');
             // setMessage('Processing payment...'); // Optional feedback
        }

        // Only set processing false if there was an immediate error.
        // If redirecting, the page navigates away.
        if (error) {
             setIsProcessing(false);
        }
        // If no error, keep processing true as redirect might occur.
    };

    // Options for PaymentElement
    const paymentElementOptions: StripePaymentElementOptions = {
        layout: "tabs"
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="subtitle1" gutterBottom>Enter Payment Details</Typography>
            <PaymentElement options={paymentElementOptions} />
            <Button
                variant="contained"
                disabled={isProcessing || !stripe || !elements}
                type="submit"
                fullWidth
                sx={{ mt: 2 }}
            >
                {isProcessing ? <CircularProgress size={24} /> : `Pay £${amount.toFixed(2)}`}
            </Button>
            {message && (
                <Typography 
                    color={message.includes('successful') ? 'success.main' : 'error'} 
                    sx={{ mt: 2, textAlign: 'center' }}
                >
                    {message}
                </Typography>
            )}
        </Box>
    );
};

export default PaymentForm; 