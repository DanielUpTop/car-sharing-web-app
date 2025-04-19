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
    IconButton,
    Grid,
    CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    Visibility,
    VisibilityOff,
    Email,
    Lock,
    Person,
    Phone,
    DriveEta
} from '@mui/icons-material';
import { sendVerificationEmail } from '../../services/emailService';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone_number: '',
        driving_license: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            // First, try to send the verification email
            const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const verificationLink = `${window.location.origin}/verify-email?token=${verificationToken}`;

            // Try sending the verification email first
            await sendVerificationEmail({
                to_name: `${formData.first_name} ${formData.last_name}`,
                to_email: formData.email,
                verification_link: verificationLink
            });

            // If email sends successfully, proceed with registration
            const response = await fetch('http://localhost:5001/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    verificationToken // Include the verification token
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            setSuccess('Registration successful! Please check your email to verify your account.');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ p: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Register
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
                        {success}
                    </Alert>
                )}
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                label="First Name"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Person color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                label="Last Name"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Person color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Email Address"
                                name="email"
                                type="email"
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
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
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
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Confirm Password"
                                name="confirm_password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirm_password}
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
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                edge="end"
                                            >
                                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Phone Number"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Phone color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Driving License"
                                name="driving_license"
                                value={formData.driving_license}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <DriveEta color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                    </Grid>
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={isLoading}
                    >
                        {isLoading ? <CircularProgress size={24} /> : 'Register'}
                    </Button>
                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link href="/login" variant="body2">
                                Already have an account? Sign in
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
};

export default Register; 