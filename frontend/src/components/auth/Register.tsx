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
    DriveEta,
    CalendarToday,
    Home,
    LocationCity,
    Map,
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { sendVerificationEmail } from '../../services/emailService';
import { subYears, isFuture, startOfDay } from 'date-fns';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone_number: '',
        driving_license: '',
        date_of_birth: null as Date | null,
        driving_license_expiry: null as Date | null,
        address: '',
        city: '',
        postcode: '',
        driving_license_country: ''
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

    const handleDateChange = (field: 'date_of_birth' | 'driving_license_expiry', date: Date | null) => {
        setFormData({
            ...formData,
            [field]: date
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        for (const [key, value] of Object.entries(formData)) {
            if (value === '' || value === null) {
                if (key !== 'confirm_password') {
                    const fieldName = key === 'driving_license_country' ? 'Driving License Country' : key.replace('_', ' ');
                    setError(`Please fill in the ${fieldName} field.`);
                    return;
                }
            }
        }

        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        if (!formData.date_of_birth) {
            setError('Date of Birth is required');
            return;
        }

        const today = startOfDay(new Date());
        const twentyYearsAgo = subYears(today, 20);
        if (formData.date_of_birth > twentyYearsAgo) {
            setError('You must be at least 20 years old to register.');
            return;
        }

        if (!formData.driving_license_expiry) {
            setError('Driving License Expiry Date is required');
            return;
        }
        if (!isFuture(startOfDay(formData.driving_license_expiry))) {
            setError('Driving License Expiry Date must be in the future.');
            return;
        }

        setIsLoading(true);

        try {
            const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const verificationLink = `${window.location.origin}/verify-email?token=${verificationToken}`;

            const dobString = formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : null;
            const expiryString = formData.driving_license_expiry ? formData.driving_license_expiry.toISOString().split('T')[0] : null;

            await sendVerificationEmail({
                to_name: `${formData.first_name} ${formData.last_name}`,
                to_email: formData.email,
                verification_link: verificationLink
            });

            const { confirm_password, ...dataToSend } = formData;

            const response = await fetch('http://localhost:5001/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...dataToSend,
                    date_of_birth: dobString,
                    driving_license_expiry: expiryString,
                    verificationToken
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
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container component="main" maxWidth="sm">
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
                            <Grid item xs={12} sm={6}>
                                <DatePicker
                                    label="Date of Birth"
                                    value={formData.date_of_birth}
                                    onChange={(date) => handleDateChange('date_of_birth', date)}
                                    maxDate={subYears(new Date(), 20)}
                                    slotProps={{
                                        textField: {
                                            required: true,
                                            fullWidth: true,
                                            InputProps: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <CalendarToday color="action" />
                                                    </InputAdornment>
                                                ),
                                            },
                                        },
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
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
                                    label="Address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Home color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    required
                                    fullWidth
                                    label="City"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LocationCity color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    required
                                    fullWidth
                                    label="Postcode"
                                    name="postcode"
                                    value={formData.postcode}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Map color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
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
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    label="License Country"
                                    name="driving_license_country"
                                    value={formData.driving_license_country}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <DatePicker
                                    label="License Expiry Date"
                                    value={formData.driving_license_expiry}
                                    onChange={(date) => handleDateChange('driving_license_expiry', date)}
                                    minDate={startOfDay(new Date())}
                                    slotProps={{
                                        textField: {
                                            required: true,
                                            fullWidth: true,
                                            InputProps: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <CalendarToday color="action" />
                                                    </InputAdornment>
                                                ),
                                            },
                                        },
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
        </LocalizationProvider>
    );
};

export default Register; 