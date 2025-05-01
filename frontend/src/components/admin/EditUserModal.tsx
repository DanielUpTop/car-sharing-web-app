import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdminUserDetails, UpdateUserAdminPayload } from '../../services/adminService';
import { parseISO } from 'date-fns'; // Helper to parse ISO date strings

interface EditUserModalProps {
    open: boolean;
    onClose: () => void;
    user: AdminUserDetails | null;
    onUpdate: () => void;
    updateUser: (userId: number, userData: UpdateUserAdminPayload) => Promise<AdminUserDetails>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ open, onClose, user, onUpdate, updateUser }) => {
    const [formData, setFormData] = useState<UpdateUserAdminPayload>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [dob, setDob] = useState<Date | null>(null);
    const [expiry, setExpiry] = useState<Date | null>(null);

    useEffect(() => {
        if (user) {
            // Initialize form data when user data is available
            const initialData: UpdateUserAdminPayload = {
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone_number: user.phone_number || '',
                driving_license: user.driving_license || '',
                driving_license_country: user.driving_license_country || '',
                address: user.address || '',
                city: user.city || '',
                postcode: user.postcode || '',
                emergency_contact_name: user.emergency_contact_name || '',
                emergency_contact_number: user.emergency_contact_number || '',
                role: user.role,
                status: user.status,
                is_verified: user.is_verified,
                // Dates are handled separately below
            };
            setFormData(initialData);

            // Initialize date states
            try {
                 setDob(user.date_of_birth ? parseISO(user.date_of_birth) : null);
            } catch (e) { console.error('Error parsing DOB:', e); setDob(null); }
            try {
                 setExpiry(user.driving_license_expiry ? parseISO(user.driving_license_expiry) : null);
             } catch (e) { console.error('Error parsing Expiry:', e); setExpiry(null); }

        } else {
            // Reset form if no user
            setFormData({});
            setDob(null);
            setExpiry(null);
        }
        setError(null); // Clear error when modal opens or user changes
    }, [user]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = event.target;
        // Handle checkbox separately with type assertion
        if (type === 'checkbox' && event.target instanceof HTMLInputElement) {
             setFormData((prev) => ({ ...prev, [name]: (event.target as HTMLInputElement).checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSelectChange = (event: any) => { // Using any for MUI Select event
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (name: string, date: Date | null) => {
        if (name === 'date_of_birth') {
            setDob(date);
        } else if (name === 'driving_license_expiry') {
            setExpiry(date);
        }
        // Update formData with date in ISO format (YYYY-MM-DD) or null
        setFormData((prev) => ({
            ...prev,
            [name]: date ? date.toISOString().split('T')[0] : null,
        }));
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            console.log("Submitting updated data:", formData);
            await updateUser(user.id, formData);
            console.log("Update successful");
            onUpdate(); // This calls fetchUsers and closes modal in parent
        } catch (err: any) {
            console.error('Error updating user:', err);
            setError(err.response?.data?.message || 'Failed to update user.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null; // Don't render if no user

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>Edit User: {user.first_name} {user.last_name} (ID: {user.id})</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {/* Personal Details */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="first_name"
                                label="First Name"
                                value={formData.first_name || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="last_name"
                                label="Last Name"
                                value={formData.last_name || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <DatePicker
                                label="Date of Birth"
                                value={dob}
                                onChange={(date) => handleDateChange('date_of_birth', date)}
                                // renderInput={(params) => <TextField {...params} fullWidth margin="dense" name="date_of_birth" />} // For older MUI
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <TextField
                                name="email"
                                label="Email"
                                type="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <TextField
                                name="phone_number"
                                label="Phone Number"
                                value={formData.phone_number || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>

                        {/* Address */}
                        <Grid item xs={12}>
                             <TextField
                                name="address"
                                label="Address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <TextField
                                name="city"
                                label="City"
                                value={formData.city || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <TextField
                                name="postcode"
                                label="Postcode"
                                value={formData.postcode || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>

                         {/* Driving License */}
                         <Grid item xs={12} sm={6}>
                            <TextField
                                name="driving_license"
                                label="Driving License No."
                                value={formData.driving_license || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <DatePicker
                                label="License Expiry Date"
                                value={expiry}
                                onChange={(date) => handleDateChange('driving_license_expiry', date)}
                                // renderInput={(params) => <TextField {...params} fullWidth margin="dense" name="driving_license_expiry" />} // For older MUI
                            />
                        </Grid>
                         <Grid item xs={12} sm={6}>
                             <TextField
                                name="driving_license_country"
                                label="License Country"
                                value={formData.driving_license_country || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>

                        {/* Emergency Contact */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="emergency_contact_name"
                                label="Emergency Contact Name"
                                value={formData.emergency_contact_name || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>
                         <Grid item xs={12} sm={6}>
                            <TextField
                                name="emergency_contact_number"
                                label="Emergency Contact Number"
                                value={formData.emergency_contact_number || ''}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                        </Grid>

                        {/* Admin Controls */}
                         <Grid item xs={12} sm={4}>
                            <FormControl fullWidth variant="outlined" margin="dense">
                                <InputLabel id="role-label">Role</InputLabel>
                                <Select
                                    labelId="role-label"
                                    name="role"
                                    value={formData.role || 'rentee'}
                                    onChange={handleSelectChange}
                                    label="Role"
                                >
                                    <MenuItem value="rentee">Rentee</MenuItem>
                                    <MenuItem value="admin">Admin</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                         <Grid item xs={12} sm={4}>
                            <FormControl fullWidth variant="outlined" margin="dense">
                                <InputLabel id="status-label">Status</InputLabel>
                                <Select
                                    labelId="status-label"
                                    name="status"
                                    value={formData.status || 'active'}
                                    onChange={handleSelectChange}
                                    label="Status"
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="blocked">Blocked</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                             <FormControlLabel
                                control={<Checkbox checked={formData.is_verified || false} onChange={handleChange} name="is_verified" />}
                                label="Verified"
                            />
                        </Grid>

                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="secondary" disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default EditUserModal; 