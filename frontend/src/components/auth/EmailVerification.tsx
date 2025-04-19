import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    Box,
    Alert,
    CircularProgress,
    Button
} from '@mui/material';

const EmailVerification = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');
            if (!token) {
                setStatus('error');
                setError('No verification token provided');
                return;
            }

            try {
                const response = await fetch('http://localhost:5001/api/auth/verify-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Verification failed');
                }

                setStatus('success');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } catch (err) {
                setStatus('error');
                setError(err instanceof Error ? err.message : 'Verification failed');
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ p: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5" gutterBottom>
                    Email Verification
                </Typography>

                {status === 'verifying' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                        <CircularProgress />
                        <Typography variant="body1" sx={{ mt: 2 }}>
                            Verifying your email...
                        </Typography>
                    </Box>
                )}

                {status === 'success' && (
                    <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
                        Email verified successfully! Redirecting to login...
                    </Alert>
                )}

                {status === 'error' && (
                    <>
                        <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                            {error}
                        </Alert>
                        <Button
                            variant="contained"
                            sx={{ mt: 2 }}
                            onClick={() => navigate('/login')}
                        >
                            Return to Login
                        </Button>
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default EmailVerification; 