import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Grid,
    Avatar,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Divider,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    AppBar,
    Toolbar,
    IconButton,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import {
    Notifications,
    Security,
    Language,
    CreditCard,
    ContactEmergency,
    DarkMode,
    ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { isFuture, startOfDay } from 'date-fns';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

interface UserProfile {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    driving_license: string;
    profile_image_url: string;
    date_of_birth: Date | null;
    address: string;
    city: string;
    postcode: string;
    country: string;
    preferred_payment_method: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    driving_license_expiry: Date | null;
    driving_license_country: string;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const EnhancedProfile = () => {
    const [profile, setProfile] = useState<UserProfile>({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        driving_license: '',
        profile_image_url: '',
        date_of_birth: null,
        address: '',
        city: '',
        postcode: '',
        country: '',
        preferred_payment_method: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        driving_license_expiry: null,
        driving_license_country: '',
    });

    const [tabValue, setTabValue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }

            const data = await response.json();
            setProfile({
                ...data,
                date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null,
                driving_license_expiry: data.driving_license_expiry ? new Date(data.driving_license_expiry) : null,
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                email: data.email || '',
                phone_number: data.phone_number || '',
                driving_license: data.driving_license || '',
                profile_image_url: data.profile_image_url || '',
                address: data.address || '',
                city: data.city || '',
                postcode: data.postcode || '',
                country: data.country || '',
                preferred_payment_method: data.preferred_payment_method || '',
                emergency_contact_name: data.emergency_contact_name || '',
                emergency_contact_phone: data.emergency_contact_phone || '',
                driving_license_country: data.driving_license_country || '',
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        setError(null);

        if (profile.driving_license_expiry && !isFuture(startOfDay(profile.driving_license_expiry))) {
            setError('Driving License Expiry Date must be in the future.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const profileToSend = {
                ...profile,
                date_of_birth: profile.date_of_birth ? profile.date_of_birth.toISOString().split('T')[0] : null,
                driving_license_expiry: profile.driving_license_expiry ? profile.driving_license_expiry.toISOString().split('T')[0] : null,
            };

            const response = await fetch('http://localhost:5001/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileToSend)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update profile');
            }

            setSuccess('Profile updated successfully');
            setIsEditing(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setTimeout(() => setError(null), 3000);
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <AppBar position="static" sx={{ backgroundColor: 'primary.main' }} elevation={1}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" aria-label="back" onClick={() => navigate(-1)}>
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
                        My Profile
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={4}>
                        <Avatar
                            src={profile.profile_image_url}
                            sx={{ width: 120, height: 120 }}
                        />
                        <Box ml={3}>
                            <Typography variant="h4">
                                {profile.first_name} {profile.last_name}
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                {profile.email}
                            </Typography>
                        </Box>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {success}
                        </Alert>
                    )}

                    <Tabs
                        value={tabValue}
                        onChange={(_, newValue) => setTabValue(newValue)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label="Personal Info" />
                        <Tab label="Address" />
                        <Tab label="Driving License" />
                        <Tab label="Emergency Contact" />
                    </Tabs>

                    <TabPanel value={tabValue} index={0}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="First Name"
                                        value={profile.first_name}
                                        onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Last Name"
                                        value={profile.last_name}
                                        onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        value={profile.email}
                                        disabled
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Phone Number"
                                        value={profile.phone_number}
                                        onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <DatePicker
                                        label="Date of Birth"
                                        value={profile.date_of_birth}
                                        onChange={(date) => setProfile({ ...profile, date_of_birth: date })}
                                        disabled={!isEditing}
                                        slotProps={{ textField: { fullWidth: true } }}
                                    />
                                </Grid>
                            </Grid>
                        </LocalizationProvider>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Address"
                                    value={profile.address}
                                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="City"
                                    value={profile.city}
                                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Postcode"
                                    value={profile.postcode}
                                    onChange={(e) => setProfile({ ...profile, postcode: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </Grid>
                        </Grid>
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Driving License Number"
                                        value={profile.driving_license}
                                        onChange={(e) => setProfile({ ...profile, driving_license: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="License Country"
                                        value={profile.driving_license_country}
                                        onChange={(e) => setProfile({ ...profile, driving_license_country: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <DatePicker
                                        label="License Expiry Date"
                                        value={profile.driving_license_expiry}
                                        onChange={(date) => setProfile({ ...profile, driving_license_expiry: date })}
                                        disabled={!isEditing}
                                        minDate={startOfDay(new Date())}
                                        slotProps={{ textField: { fullWidth: true } }}
                                    />
                                </Grid>
                            </Grid>
                        </LocalizationProvider>
                    </TabPanel>

                    <TabPanel value={tabValue} index={3}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Emergency Contact Name"
                                    value={profile.emergency_contact_name}
                                    onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Emergency Contact Phone"
                                    value={profile.emergency_contact_phone}
                                    onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </Grid>
                        </Grid>
                    </TabPanel>

                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        {isEditing ? (
                            <>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setIsEditing(false);
                                        fetchProfile();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleUpdate}
                                >
                                    Save Changes
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit Profile
                            </Button>
                        )}
                    </Box>
                </Paper>
            </Container>
        </>
    );
};

export default EnhancedProfile; 