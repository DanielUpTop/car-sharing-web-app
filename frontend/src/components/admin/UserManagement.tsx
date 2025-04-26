import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Paper,
    IconButton,
    Tooltip,
    Snackbar,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Chip,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridRowParams,
    GridValueGetterParams
} from '@mui/x-data-grid';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
}

interface UserFormData {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    status: string;
    password?: string;
}

const initialFormData: UserFormData = {
    first_name: '',
    last_name: '',
    email: '',
    role: 'rentee',
    status: 'active',
    password: '',
};

const UserManagement = () => {
    const { } = useAuth();
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState<UserFormData>(initialFormData);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            showSnackbar('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (user?: User) => {
        if (user) {
            setFormData({
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                status: user.status,
            });
            setEditingId(user.id);
        } else {
            setFormData(initialFormData);
            setEditingId(null);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData(initialFormData);
        setEditingId(null);
    };

    const handleTextFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        try {
            const url = `http://localhost:5001/api/admin/users${editingId ? `/${editingId}` : ''}`;
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to save user');
            }

            showSnackbar(`User ${editingId ? 'updated' : 'added'} successfully`, 'success');
            handleCloseDialog();
            fetchUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            showSnackbar(`Failed to ${editingId ? 'update' : 'add'} user`, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            showSnackbar('User deleted successfully', 'success');
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            showSnackbar('Failed to delete user', 'error');
        }
    };

    const handleToggleStatus = async (user: User) => {
        try {
            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            
            const response = await fetch(`http://localhost:5001/api/admin/users/${user.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update user status');
            }

            showSnackbar(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
            fetchUsers();
        } catch (error) {
            console.error('Error updating user status:', error);
            showSnackbar('Failed to update user status', 'error');
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const columns: GridColDef[] = [
        {
            field: 'first_name',
            headerName: 'First Name',
            width: 130
        },
        {
            field: 'last_name',
            headerName: 'Last Name',
            width: 130
        },
        {
            field: 'email',
            headerName: 'Email',
            width: 200
        },
        {
            field: 'role',
            headerName: 'Role',
            width: 120,
            renderCell: (params) => {
                const role = params.value as string;
                return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
            }
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={String(params.value).charAt(0).toUpperCase() + String(params.value).slice(1)}
                    color={params.value === 'active' ? 'success' : 'error'}
                    size="small"
                />
            )
        },
        {
            field: 'created_at',
            headerName: 'Created On',
            width: 180,
            renderCell: (params) => {
                if (!params.row?.created_at) return '';
                const date = new Date(params.row.created_at);
                return date.toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 180,
            renderCell: (params) => {
                if (!params.row) return null;
                return (
                    <Box component="div">
                        <Tooltip title="Edit User">
                            <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(params.row)}
                            >
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={params.row.status === 'active' ? 'Deactivate' : 'Activate'}>
                            <IconButton
                                size="small"
                                onClick={() => handleToggleStatus(params.row)}
                                color={params.row.status === 'active' ? 'error' : 'success'}
                            >
                                {params.row.status === 'active' ? <BlockIcon /> : <CheckCircleIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                            <IconButton
                                size="small"
                                onClick={() => handleDelete(params.row.id)}
                                color="error"
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                );
            },
        },
    ];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">User Management</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add New User
                </Button>
            </Box>

            <Paper sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={columns}
                    loading={loading}
                    pageSizeOptions={[10, 25, 50, 100]}
                    disableRowSelectionOnClick
                />
            </Paper>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogContent>
                    <Box display="grid" gap={2} mt={2}>
                        <TextField
                            name="first_name"
                            label="First Name"
                            value={formData.first_name}
                            onChange={handleTextFieldChange}
                            fullWidth
                        />
                        <TextField
                            name="last_name"
                            label="Last Name"
                            value={formData.last_name}
                            onChange={handleTextFieldChange}
                            fullWidth
                        />
                        <TextField
                            name="email"
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={handleTextFieldChange}
                            fullWidth
                        />
                        {!editingId && (
                            <TextField
                                name="password"
                                label="Password"
                                type="password"
                                value={formData.password}
                                onChange={handleTextFieldChange}
                                fullWidth
                            />
                        )}
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                name="role"
                                value={formData.role}
                                label="Role"
                                onChange={handleSelectChange}
                            >
                                <MenuItem value="rentee">Rentee</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                name="status"
                                value={formData.status}
                                label="Status"
                                onChange={handleSelectChange}
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingId ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserManagement; 