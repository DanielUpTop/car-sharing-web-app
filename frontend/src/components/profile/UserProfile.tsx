import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    Typography,
    TextField,
    Button,
    Grid,
    Avatar,
    Alert
} from '@mui/material';

interface UserData {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    driving_license: string;
}

const UserProfile = () => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setUserData(data);
        } catch (error) {
            setError('Failed to fetch user data');
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                setSuccess('Profile updated successfully');
                setIsEditing(false);
            } else {
                setError('Failed to update profile');
            }
        } catch (error) {
            setError('Error updating profile');
        }
    };

    if (!userData) return <div>Loading...</div>;

    return (
        <Box sx={{ p: 3 }}>
            <Card sx={{ p: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                        <Avatar
                            sx={{ width: 120, height: 120, margin: 'auto' }}
                        />
                        <Typography variant="h5" sx={{ mt: 2 }}>
                            {userData.first_name} {userData.last_name}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                        <form onSubmit={handleUpdate}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="First Name"
                                        value={userData.first_name}
                                        disabled={!isEditing}
                                        onChange={(e) => setUserData({...userData, first_name: e.target.value})}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Last Name"
                                        value={userData.last_name}
                                        disabled={!isEditing}
                                        onChange={(e) => setUserData({...userData, last_name: e.target.value})}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        value={userData.email}
                                        disabled
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Phone Number"
                                        value={userData.phone_number}
                                        disabled={!isEditing}
                                        onChange={(e) => setUserData({...userData, phone_number: e.target.value})}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Driving License"
                                        value={userData.driving_license}
                                        disabled={!isEditing}
                                        onChange={(e) => setUserData({...userData, driving_license: e.target.value})}
                                    />
                                </Grid>
                            </Grid>
                            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                {!isEditing ? (
                                    <Button
                                        variant="contained"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Edit Profile
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="contained"
                                            type="submit"
                                        >
                                            Save Changes
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={() => {
                                                setIsEditing(false);
                                                fetchUserData();
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </form>
                    </Grid>
                </Grid>
            </Card>
        </Box>
    );
};

export default UserProfile; 