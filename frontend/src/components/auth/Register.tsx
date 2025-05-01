import React, { useState, useEffect, useRef } from 'react';
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
    ContactPhone
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { sendVerificationEmail } from '../../services/emailService';
import { subYears, isFuture, startOfDay, isValid, parseISO } from 'date-fns';
import * as Yup from 'yup';

// Define an interface for the errors state
interface FormErrors {
    first_name?: string;
    last_name?: string;
    email?: string;
    password?: string;
    confirm_password?: string;
    phone_number?: string;
    driving_license?: string;
    date_of_birth?: string;
    driving_license_expiry?: string;
    address?: string;
    city?: string;
    postcode?: string;
    driving_license_country?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    general?: string; // For general errors like API failures
}

// --- Yup Validation Schema ---
const registrationSchema = Yup.object().shape({
    first_name: Yup.string().required('First Name is required.'),
    last_name: Yup.string().required('Last Name is required.'),
    email: Yup.string().email('Please enter a valid email address.').required('Email is required.'),
    password: Yup.string()
        .required('Password is required.')
        .min(8, 'Password must be at least 8 characters long.')
        .matches(/[a-z]/, 'Password must contain at least one lowercase letter.')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter.')
        .matches(/[0-9]/, 'Password must contain at least one number.')
        .matches(/[@$!%*?&#]/, 'Password must contain at least one special character (@$!%*?&#).'),
    confirm_password: Yup.string()
        .required('Please confirm your password.')
        .oneOf([Yup.ref('password')], 'Passwords do not match.'),
    phone_number: Yup.string()
        .required('Phone Number is required.')
        .matches(/^\+?[0-9\s-]{10,15}$/, 'Please enter a valid phone number (10-15 digits, optionally starting with +).'),
    driving_license: Yup.string().required('Driving License Number is required.'),
    date_of_birth: Yup.date()
        .required('Date of Birth is required.')
        .nullable()
        .typeError('Invalid Date of Birth.') // Handle invalid date inputs
        .max(subYears(new Date(), 20), 'You must be at least 20 years old to register.'),
    driving_license_expiry: Yup.date()
        .required('Driving License Expiry Date is required.')
        .nullable()
        .typeError('Invalid Driving License Expiry Date.') // Handle invalid date inputs
        .min(startOfDay(new Date()), 'Driving License Expiry Date must be in the future.'),
    address: Yup.string().required('Address is required.'),
    city: Yup.string().required('City is required.'),
    postcode: Yup.string()
        .required('Postcode is required.')
        .matches(/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i, 'Please enter a valid UK postcode format (e.g., SW1A 0AA).'),
    driving_license_country: Yup.string().required('Driving License Country is required.'),
    emergency_contact_name: Yup.string().required('Emergency Contact Name is required.'),
    emergency_contact_number: Yup.string()
        .required('Emergency Contact Number is required.')
        .matches(/^\+?[0-9\s-]{10,15}$/, 'Please enter a valid phone number (10-15 digits, optionally starting with +).'),
});

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
        driving_license_country: '',
        emergency_contact_name: '',
        emergency_contact_number: ''
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    // --- Validation Function ---
    const validateField = async (field: keyof typeof formData) => {
        try {
            await registrationSchema.validateAt(field, formData);
            // If validation passes, clear the error for this field
            setErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
            return true; // Indicate validation passed
        } catch (err) {
            if (err instanceof Yup.ValidationError) {
                // If validation fails, set the error message
                setErrors(prevErrors => ({ ...prevErrors, [field]: err.message }));
            }
            return false; // Indicate validation failed
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        // Clear error on change (validation happens onBlur)
        if (errors[name as keyof FormErrors]) {
            setErrors(prevErrors => ({ ...prevErrors, [name]: undefined }));
        }
    };

    const handleDateChange = (field: 'date_of_birth' | 'driving_license_expiry', date: Date | null) => {
        setFormData({
            ...formData,
            [field]: date
        });
        // Clear error on change (validation happens onBlur)
        if (errors[field]) {
            setErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
        }
    };

    // --- onBlur Handler ---
    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (name in formData) {
            validateField(name as keyof typeof formData);
            // Special case for password confirmation: validate it when password field blurs
            if (name === 'password') {
                validateField('confirm_password');
            }
        }
    };

    // --- Handle DatePicker Blur ---
    // DatePicker doesn't directly expose onBlur for the input easily in all versions/setups.
    // We attach it via slotProps.textField. Note: This might need adjustment based on specific MUI/DatePicker versions.
    const handleDatePickerBlur = (field: 'date_of_birth' | 'driving_license_expiry') => {
        // Add a tiny delay to allow the date state to update before validating
        setTimeout(() => {
            validateField(field);
        }, 100);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess('');
        setErrors({}); // Clear previous errors before full validation

        try {
            // Validate the entire form using Yup schema
            await registrationSchema.validate(formData, { abortEarly: false }); // abortEarly: false to get all errors

            // Validation passed, proceed with submission
            setIsLoading(true);

            const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const verificationLink = `${window.location.origin}/verify-email?token=${verificationToken}`;

            const dobString = formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : null;
            const expiryString = formData.driving_license_expiry ? formData.driving_license_expiry.toISOString().split('T')[0] : null;

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
                // Improved Backend Error Handling: Try to map specific errors
                const message = data.message || 'Registration failed. Please check your details.';
                if (/email.*exist/i.test(message)) { // Example: Check if error is about email
                    setErrors({ email: message });
                    // Focus the email field
                    const emailField = document.getElementById('email');
                    if (emailField) emailField.focus();
                } else {
                    setErrors({ general: message }); // Fallback to general error
                }
                // No need to throw here, just set the error state
                setIsLoading(false); // Ensure loading stops
                return; // Stop execution
            }

            // Send verification email *after* successful backend registration
            console.log("Sending verification email to:", formData.email);
            try {
                await sendVerificationEmail({
                    to_name: `${formData.first_name} ${formData.last_name}`,
                    to_email: formData.email,
                    verification_link: verificationLink
                });
                console.log("Verification email sent successfully.");
                setSuccess('Registration successful! Please check your email to verify your account.');
            } catch (emailError) {
                console.error("Failed to send verification email after registration:", emailError);
                setSuccess('Registration successful, but we failed to send the verification email. Please contact support.');
            }

            setTimeout(() => {
                navigate('/login');
            }, 5000);

        } catch (err) {
            if (err instanceof Yup.ValidationError) {
                // Validation failed, transform Yup errors into FormErrors state
                const formErrors: FormErrors = {};
                err.inner.forEach(error => {
                    if (error.path && !formErrors[error.path as keyof FormErrors]) {
                        formErrors[error.path as keyof FormErrors] = error.message;
                    }
                });
                setErrors(formErrors);

                // Focus the first field with an error
                if (err.inner.length > 0 && err.inner[0].path) {
                    const firstErrorField = document.getElementById(err.inner[0].path);
                    if (firstErrorField) {
                        firstErrorField.focus();
                    }
                }

            } else {
                // Handle other errors (e.g., network issues before API call)
                console.error("Registration error caught:", err);
                setErrors({ general: err instanceof Error ? err.message : 'An unknown error occurred during registration.' });
            }
        } finally {
            // Only set isLoading to false if it wasn't already set in the specific error handling
            if (isLoading) {
                setIsLoading(false);
            }
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container component="main" maxWidth="sm">
                <Paper elevation={3} sx={{ p: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography component="h1" variant="h5">
                        Register
                    </Typography>
                    {errors.general && (
                        <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                            {errors.general}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
                            {success}
                        </Alert>
                    )}
                    <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    id="first_name"
                                    label="First Name"
                                    name="first_name"
                                    autoComplete="given-name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.first_name}
                                    helperText={errors.first_name || ''}
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
                                    id="last_name"
                                    label="Last Name"
                                    name="last_name"
                                    autoComplete="family-name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.last_name}
                                    helperText={errors.last_name || ''}
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
                                    id="email"
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.email}
                                    helperText={errors.email || ''}
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
                                <TextField
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.password}
                                    helperText={errors.password || ''}
                                    aria-describedby={errors.password ? "password-helper-text" : undefined}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    edge="end"
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                {errors.password && <p id="password-helper-text" style={{ display: 'none' }}>{errors.password}</p>}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    name="confirm_password"
                                    label="Confirm Password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirm_password"
                                    autoComplete="new-password"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.confirm_password}
                                    helperText={errors.confirm_password || ''}
                                    aria-describedby={errors.confirm_password ? "confirm_password-helper-text" : undefined}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle confirm password visibility"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    edge="end"
                                                >
                                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                {errors.confirm_password && <p id="confirm_password-helper-text" style={{ display: 'none' }}>{errors.confirm_password}</p>}
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    fullWidth
                                    id="phone_number"
                                    label="Phone Number"
                                    name="phone_number"
                                    type="tel"
                                    autoComplete="tel"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.phone_number}
                                    helperText={errors.phone_number || ''}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Phone color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    required
                                    fullWidth
                                    id="driving_license"
                                    label="Driving License Number"
                                    name="driving_license"
                                    value={formData.driving_license}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.driving_license}
                                    helperText={errors.driving_license || ''}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <DriveEta color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    required
                                    fullWidth
                                    id="driving_license_country"
                                    label="License Country"
                                    name="driving_license_country"
                                    value={formData.driving_license_country}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.driving_license_country}
                                    helperText={errors.driving_license_country || ''}
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
                                <DatePicker
                                    label="Date of Birth"
                                    value={formData.date_of_birth}
                                    onChange={(date) => handleDateChange('date_of_birth', date)}
                                    maxDate={subYears(new Date(), 20)}
                                    disableFuture
                                    slotProps={{
                                        textField: {
                                            required: true,
                                            fullWidth: true,
                                            id: "date_of_birth",
                                            name: "date_of_birth",
                                            error: !!errors.date_of_birth,
                                            helperText: errors.date_of_birth || '',
                                            onBlur: () => handleDatePickerBlur('date_of_birth'),
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
                                <DatePicker
                                    label="Driving License Expiry"
                                    value={formData.driving_license_expiry}
                                    onChange={(date) => handleDateChange('driving_license_expiry', date)}
                                    minDate={startOfDay(new Date())}
                                    disablePast
                                    slotProps={{
                                        textField: {
                                            required: true,
                                            fullWidth: true,
                                            id: "driving_license_expiry",
                                            name: "driving_license_expiry",
                                            error: !!errors.driving_license_expiry,
                                            helperText: errors.driving_license_expiry || '',
                                            onBlur: () => handleDatePickerBlur('driving_license_expiry'),
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
                                    id="address"
                                    label="Address Line 1"
                                    name="address"
                                    autoComplete="address-line1"
                                    value={formData.address}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.address}
                                    helperText={errors.address || ''}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Home color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    id="city"
                                    label="City"
                                    name="city"
                                    autoComplete="address-level2"
                                    value={formData.city}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.city}
                                    helperText={errors.city || ''}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LocationCity color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    id="postcode"
                                    label="Postcode"
                                    name="postcode"
                                    autoComplete="postal-code"
                                    value={formData.postcode}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.postcode}
                                    helperText={errors.postcode || ''}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Map color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                                    Emergency Contact Information
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    id="emergency_contact_name"
                                    label="Emergency Contact Name"
                                    name="emergency_contact_name"
                                    autoComplete="off"
                                    value={formData.emergency_contact_name}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.emergency_contact_name}
                                    helperText={errors.emergency_contact_name || ''}
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
                                    id="emergency_contact_number"
                                    label="Emergency Contact Number"
                                    name="emergency_contact_number"
                                    type="tel"
                                    autoComplete="off"
                                    value={formData.emergency_contact_number}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={!!errors.emergency_contact_number}
                                    helperText={errors.emergency_contact_number || ''}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <ContactPhone color="action" />
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
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
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