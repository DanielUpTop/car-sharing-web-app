import React, { useState } from 'react';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Link,
    Alert,
    InputAdornment,
    IconButton
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    
    // Get the redirect path from location state, or default to dashboard
    const from = location.state?.from?.pathname || "/dashboard";

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            console.log('Attempting login with:', formData.email);
            
            const response = await fetch('http://localhost:5001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log('Login response data:', data);
            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(data.message || 'Failed to login');
            }

            if (!data.token || !data.user) {
                throw new Error('Invalid response format');
            }

            // Store auth data
            console.log('Storing auth data:', {
                token: data.token,
                user: data.user
            });
            login(data.token, data.user);

            // Navigate based on role
            if (data.user.role === 'admin') {
                console.log('User is admin, redirecting to /admin');
                navigate('/admin');
            } else {
                console.log('User is not admin, redirecting to /dashboard');
                navigate('/dashboard');
            }

        } catch (err) {
            console.error('Login error:', err);
            setError(err instanceof Error ? err.message : 'Failed to login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        width: '100%',
                        borderRadius: 2,
                        backgroundColor: 'white',
                    }}
                >
                    <Typography component="h1" variant="h4" align="center" gutterBottom>
                        Welcome Back
                    </Typography>
                    <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 3 }}>
                        Sign in to continue to Car Sharing
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={formData.email}
                            onChange={handleChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Email color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Lock color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2, py: 1.5 }}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </Button>
                        <Box sx={{ textAlign: 'center' }}>
                            <Link
                                component="button"
                                variant="body2"
                                onClick={() => navigate('/register')}
                                sx={{ textDecoration: 'none' }}
                            >
                                Don't have an account? Sign Up
                            </Link>
                        </Box>
                    </form>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login; 