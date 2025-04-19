import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Paper, Typography, CircularProgress, Alert } from '@mui/material';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const token = searchParams.get('token');
                console.log('Verification token:', token);

                if (!token) {
                    setStatus('error');
                    setMessage('Verification token is missing');
                    return;
                }

                console.log('Sending verification request with token:', token);
                const response = await fetch('http://localhost:5001/api/auth/verify-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();
                console.log('Verification response:', data);

                if (response.ok) {
                    setStatus('success');
                    setMessage('Email verified successfully! You can now log in.');
                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        navigate('/login');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Verification failed');
                }
            } catch (error) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage('An error occurred during verification');
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

                {status === 'loading' && (
                    <>
                        <CircularProgress sx={{ my: 2 }} />
                        <Typography>Verifying your email...</Typography>
                    </>
                )}

                {status === 'success' && (
                    <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
                        {message}
                    </Alert>
                )}

                {status === 'error' && (
                    <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                        {message}
                    </Alert>
                )}
            </Paper>
        </Container>
    );
};

export default VerifyEmail; 