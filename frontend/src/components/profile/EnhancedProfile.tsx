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
    Switch,
    FormControlLabel,
    Divider,
    IconButton,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    AppBar,
    Toolbar,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import {
    PhotoCamera,
    Notifications,
    Security,
    Language,
    CreditCard,
    ContactEmergency,
    DarkMode,
    ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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
    notification_preferences: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    emergency_contact_name: string;
    emergency_contact_phone: string;
    driving_license_expiry: Date | null;
    driving_license_country: string;
    language_preference: string;
    theme_preference: string;
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
        notification_preferences: {
            email: true,
            sms: true,
            push: true,
        },
        emergency_contact_name: '',
        emergency_contact_phone: '',
        driving_license_expiry: null,
        driving_license_country: '',
        language_preference: 'en',
        theme_preference: 'light',
    });

    const [tabValue, setTabValue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [openImageDialog, setOpenImageDialog] = useState(false);
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
                ...profile,
                ...data,
                notification_preferences: data.notification_preferences || {
                    email: true,
                    sms: true,
                    push: true
                },
                date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null,
                driving_license_expiry: data.driving_license_expiry ? new Date(data.driving_license_expiry) : null,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profile)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            setSuccess('Profile updated successfully');
            setIsEditing(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/users/profile/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            setProfile({ ...profile, profile_image_url: data.profile_image_url });
            setSuccess('Profile image updated successfully');
            setOpenImageDialog(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
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
        <Box sx={{ flexGrow: 1 }}>
            {/* Dashboard Banner */}
            <AppBar position="fixed" sx={{ backgroundColor: '#1976d2' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate('/dashboard')}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        My Profile
                    </Typography>
                </Toolbar>
            </AppBar>
            <Toolbar /> {/* Spacer for fixed AppBar */}

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    {/* Header Section */}
                    <Box display="flex" alignItems="center" mb={4}>
                        <Box position="relative">
                            <Avatar
                                src={profile.profile_image_url}
                                sx={{ width: 120, height: 120 }}
                            />
                            <IconButton
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    backgroundColor: 'primary.main',
                                    '&:hover': { backgroundColor: 'primary.dark' },
                                }}
                                onClick={() => setOpenImageDialog(true)}
                            >
                                <PhotoCamera />
                            </IconButton>
                        </Box>
                        <Box ml={3}>
                            <Typography variant="h4">
                                {profile.first_name} {profile.last_name}
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                {profile.email}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Alert Messages */}
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

                    {/* Tabs Navigation */}
                    <Tabs
                        value={tabValue}
                        onChange={(_, newValue) => setTabValue(newValue)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label="Personal Info" />
                        <Tab label="Address" />
                        <Tab label="Driving License" />
                        <Tab label="Preferences" />
                        <Tab label="Emergency Contact" />
                    </Tabs>

                    {/* Personal Info Tab */}
                    <TabPanel value={tabValue} index={0}>
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
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                        label="Date of Birth"
                                        value={profile.date_of_birth}
                                        onChange={(date) => setProfile({ ...profile, date_of_birth: date })}
                                        disabled={!isEditing}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        </Grid>
                    </TabPanel>

                    {/* Address Tab */}
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
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Country"
                                    value={profile.country}
                                    onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </Grid>
                        </Grid>
                    </TabPanel>

                    {/* Driving License Tab */}
                    <TabPanel value={tabValue} index={2}>
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
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                        label="License Expiry Date"
                                        value={profile.driving_license_expiry}
                                        onChange={(date) => setProfile({ ...profile, driving_license_expiry: date })}
                                        disabled={!isEditing}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        </Grid>
                    </TabPanel>

                    {/* Preferences Tab */}
                    <TabPanel value={tabValue} index={3}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Notification Preferences
                                </Typography>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={profile.notification_preferences.email}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                notification_preferences: {
                                                    ...profile.notification_preferences,
                                                    email: e.target.checked
                                                }
                                            })}
                                            disabled={!isEditing}
                                        />
                                    }
                                    label="Email Notifications"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={profile.notification_preferences.sms}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                notification_preferences: {
                                                    ...profile.notification_preferences,
                                                    sms: e.target.checked
                                                }
                                            })}
                                            disabled={!isEditing}
                                        />
                                    }
                                    label="SMS Notifications"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={profile.notification_preferences.push}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                notification_preferences: {
                                                    ...profile.notification_preferences,
                                                    push: e.target.checked
                                                }
                                            })}
                                            disabled={!isEditing}
                                        />
                                    }
                                    label="Push Notifications"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="h6" gutterBottom>
                                    App Preferences
                                </Typography>
                                <TextField
                                    select
                                    fullWidth
                                    label="Language"
                                    value={profile.language_preference}
                                    onChange={(e) => setProfile({ ...profile, language_preference: e.target.value })}
                                    disabled={!isEditing}
                                    sx={{ mb: 2 }}
                                >
                                    <MenuItem value="en">English</MenuItem>
                                    <MenuItem value="es">Spanish</MenuItem>
                                    <MenuItem value="fr">French</MenuItem>
                                </TextField>
                                <TextField
                                    select
                                    fullWidth
                                    label="Theme"
                                    value={profile.theme_preference}
                                    onChange={(e) => setProfile({ ...profile, theme_preference: e.target.value })}
                                    disabled={!isEditing}
                                >
                                    <MenuItem value="light">Light</MenuItem>
                                    <MenuItem value="dark">Dark</MenuItem>
                                    <MenuItem value="system">System</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>
                    </TabPanel>

                    {/* Emergency Contact Tab */}
                    <TabPanel value={tabValue} index={4}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Emergency Contact Name"
                                    value={profile.emergency_contact_name}
                                    onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </Grid>
                            <Grid item xs={12}>
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

                    {/* Action Buttons */}
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

            {/* Image Upload Dialog */}
            <Dialog open={openImageDialog} onClose={() => setOpenImageDialog(false)}>
                <DialogTitle>Update Profile Picture</DialogTitle>
                <DialogContent>
                    <input
                        accept="image/*"
                        type="file"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        id="image-upload"
                    />
                    <label htmlFor="image-upload">
                        <Button
                            variant="contained"
                            component="span"
                            startIcon={<PhotoCamera />}
                        >
                            Choose Photo
                        </Button>
                    </label>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenImageDialog(false)}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EnhancedProfile; 