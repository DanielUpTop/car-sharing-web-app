import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Snackbar,
    Tooltip,
    Divider,
    AppBar,
    Toolbar
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Check as CheckIcon,
    PersonAdd as PersonAddIcon,
    Refresh as RefreshIcon,
    ArrowBack as ArrowBackIcon,
    Search as SearchIcon,
    CardMembership as CardMembershipIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Membership {
    id: number;
    user_id: number;
    type: 'basic' | 'premium' | 'platinum';
    start_date: string;
    end_date: string | null;
    status: 'active' | 'expired' | 'cancelled';
    auto_renew: boolean;
    user?: {
        email: string;
        first_name: string;
        last_name: string;
    };
}

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

const membershipTypes = ['basic', 'premium', 'platinum'];
const membershipStatuses = ['active', 'expired', 'cancelled'];

const AdminMembership = () => {
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [filteredMemberships, setFilteredMemberships] = useState<Membership[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
    const [currentMembershipType, setCurrentMembershipType] = useState<string>('basic');
    const [currentMembershipStatus, setCurrentMembershipStatus] = useState<string>('active');
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchMemberships();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredMemberships(memberships);
        } else {
            const filtered = memberships.filter(membership => 
                membership.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                membership.user?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                membership.user?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                membership.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                membership.status.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredMemberships(filtered);
        }
    }, [searchTerm, memberships]);

    const fetchMemberships = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch memberships');
            }

            const data = await response.json();
            setMemberships(data);
            setFilteredMemberships(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching memberships:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
            // Don't set error here to avoid blocking the main membership functionality
        }
    };

    const handleEditMembership = (membership: Membership) => {
        setSelectedMembership(membership);
        setCurrentMembershipType(membership.type);
        setCurrentMembershipStatus(membership.status);
        setOpenEditDialog(true);
    };

    const handleAddMembership = () => {
        setOpenAddDialog(true);
    };

    const handleDeleteMembership = (membership: Membership) => {
        setSelectedMembership(membership);
        setOpenDeleteDialog(true);
    };

    const submitEditMembership = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships/admin/update/${selectedMembership?.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: currentMembershipType,
                    status: currentMembershipStatus
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update membership');
            }

            await fetchMemberships();
            setSnackbar({
                open: true,
                message: 'Membership updated successfully',
                severity: 'success'
            });
            setOpenEditDialog(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update membership');
            setSnackbar({
                open: true,
                message: 'Failed to update membership',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const submitAddMembership = async () => {
        try {
            if (!selectedUserId) {
                setSnackbar({
                    open: true,
                    message: 'Please select a user',
                    severity: 'error'
                });
                return;
            }

            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships/admin/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: selectedUserId,
                    membershipType: currentMembershipType
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create membership');
            }

            await fetchMemberships();
            setSnackbar({
                open: true,
                message: 'Membership created successfully',
                severity: 'success'
            });
            setOpenAddDialog(false);
            setSelectedUserId('');
            setCurrentMembershipType('basic');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create membership');
            setSnackbar({
                open: true,
                message: 'Failed to create membership',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const submitDeleteMembership = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships/admin/delete/${selectedMembership?.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete membership');
            }

            await fetchMemberships();
            setSnackbar({
                open: true,
                message: 'Membership deleted successfully',
                severity: 'success'
            });
            setOpenDeleteDialog(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete membership');
            setSnackbar({
                open: true,
                message: 'Failed to delete membership',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => {
        fetchMemberships();
        fetchUsers();
    };

    const getMembershipChipColor = (type: string) => {
        switch (type) {
            case 'basic': return 'primary';
            case 'premium': return 'secondary';
            case 'platinum': return 'warning';
            default: return 'default';
        }
    };

    const getStatusChipColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'expired': return 'error';
            case 'cancelled': return 'default';
            default: return 'default';
        }
    };

    if (loading && memberships.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <AppBar position="fixed" color="primary">
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/admin/dashboard')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
                        <CardMembershipIcon sx={{ mr: 2 }} />
                        <Typography variant="h6">Membership Management</Typography>
                    </Box>
                </Toolbar>
            </AppBar>
            <Toolbar />

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Paper sx={{ p: 3, mb: 4 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h5" fontWeight="bold">
                            Membership Management
                        </Typography>
                        <Box>
                            <Button 
                                variant="outlined" 
                                startIcon={<RefreshIcon />} 
                                onClick={refreshData}
                                sx={{ mr: 2 }}
                            >
                                Refresh
                            </Button>
                            <Button 
                                variant="contained" 
                                startIcon={<PersonAddIcon />} 
                                onClick={handleAddMembership}
                                color="primary"
                            >
                                Add Membership
                            </Button>
                        </Box>
                    </Box>

                    <Box mb={3} display="flex" alignItems="center">
                        <TextField
                            label="Search memberships"
                            variant="outlined"
                            fullWidth
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by user email, name, type or status"
                            InputProps={{
                                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                            }}
                        />
                    </Box>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Start Date</TableCell>
                                    <TableCell>End Date</TableCell>
                                    <TableCell>Auto Renew</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredMemberships.length > 0 ? (
                                    filteredMemberships.map((membership) => (
                                        <TableRow key={membership.id}>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {membership.user?.first_name} {membership.user?.last_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {membership.user?.email}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={membership.type.toUpperCase()} 
                                                    color={getMembershipChipColor(membership.type)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={membership.status.toUpperCase()} 
                                                    color={getStatusChipColor(membership.status)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(membership.start_date), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                {membership.end_date 
                                                    ? format(new Date(membership.end_date), 'dd/MM/yyyy')
                                                    : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {membership.auto_renew 
                                                    ? <CheckIcon color="success" />
                                                    : 'No'}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Edit Membership">
                                                    <IconButton 
                                                        color="primary" 
                                                        onClick={() => handleEditMembership(membership)}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Membership">
                                                    <IconButton 
                                                        color="error" 
                                                        onClick={() => handleDeleteMembership(membership)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            {searchTerm ? 'No memberships match your search' : 'No memberships found'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* Edit Membership Dialog */}
                <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
                    <DialogTitle>
                        <Typography variant="h6" fontWeight="bold">
                            Edit Membership
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ minWidth: 400 }}>
                        <Box mt={2} mb={3}>
                            <Typography variant="body1" gutterBottom>
                                <strong>User:</strong> {selectedMembership?.user?.email}
                            </Typography>
                            <Typography variant="body1">
                                <strong>Current Type:</strong> {selectedMembership?.type}
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 3 }} />
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel id="membership-type-label">Membership Type</InputLabel>
                            <Select
                                labelId="membership-type-label"
                                value={currentMembershipType}
                                label="Membership Type"
                                onChange={(e) => setCurrentMembershipType(e.target.value)}
                            >
                                {membershipTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel id="membership-status-label">Membership Status</InputLabel>
                            <Select
                                labelId="membership-status-label"
                                value={currentMembershipStatus}
                                label="Membership Status"
                                onChange={(e) => setCurrentMembershipStatus(e.target.value)}
                            >
                                {membershipStatuses.map((status) => (
                                    <MenuItem key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={() => setOpenEditDialog(false)} variant="outlined">
                            Cancel
                        </Button>
                        <Button
                            onClick={submitEditMembership}
                            variant="contained"
                            color="primary"
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Update'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Add Membership Dialog */}
                <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
                    <DialogTitle>
                        <Typography variant="h6" fontWeight="bold">
                            Add New Membership
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ minWidth: 400 }}>
                        <Box my={2}>
                            <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel id="user-select-label">Select User</InputLabel>
                                <Select
                                    labelId="user-select-label"
                                    value={selectedUserId}
                                    label="Select User"
                                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                                >
                                    {users.map((user) => (
                                        <MenuItem key={user.id} value={user.id}>
                                            {user.first_name} {user.last_name} ({user.email})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel id="new-membership-type-label">Membership Type</InputLabel>
                                <Select
                                    labelId="new-membership-type-label"
                                    value={currentMembershipType}
                                    label="Membership Type"
                                    onChange={(e) => setCurrentMembershipType(e.target.value)}
                                >
                                    {membershipTypes.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={() => setOpenAddDialog(false)} variant="outlined">
                            Cancel
                        </Button>
                        <Button
                            onClick={submitAddMembership}
                            variant="contained"
                            color="primary"
                            disabled={loading || !selectedUserId}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                    <DialogTitle>
                        <Typography variant="h6" fontWeight="bold">
                            Confirm Deletion
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Typography variant="body1">
                            Are you sure you want to delete the {selectedMembership?.type} membership for {selectedMembership?.user?.email}?
                        </Typography>
                        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                            This action cannot be undone.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={() => setOpenDeleteDialog(false)} variant="outlined">
                            Cancel
                        </Button>
                        <Button
                            onClick={submitDeleteMembership}
                            variant="contained"
                            color="error"
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Delete'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    <Alert 
                        onClose={() => setSnackbar({ ...snackbar, open: false })} 
                        severity={snackbar.severity === 'success' ? 'success' : 'error'}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </>
    );
};

export default AdminMembership; 