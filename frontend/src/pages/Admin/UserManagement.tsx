// frontend/src/pages/Admin/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import {
    getAllUsersAdmin,
    AdminUserListItem,
    // Import other functions and types as needed (getUserByIdAdmin, updateUserAdmin, etc.)
    getUserByIdAdmin, 
    AdminUserDetails, 
    updateUserAdmin, 
    deleteUserAdmin, // Import delete function
} from '../../services/adminService';
import {
    Container,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    Box,
    IconButton,
    Tooltip,
} from '@mui/material'; // Using Material UI for styling
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridValueGetter
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// Import EditUserModal component once created
import EditUserModal from '../../components/admin/EditUserModal';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // Add state for modal visibility and selected user
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(false); // Add loading state for fetching details

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllUsersAdmin();
            setUsers(data);
        } catch (err: any) {
            console.error("Error fetching users:", err);
            setError(err.response?.data?.message || 'Failed to fetch users.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = async (user: AdminUserListItem) => {
        setIsFetchingDetails(true);
        setError(null); // Clear previous errors
        try {
            console.log("Fetching details for user ID:", user.id);
            // Fetch full user details before opening the modal
            const fullUserData = await getUserByIdAdmin(user.id);
            console.log("Fetched full user data:", fullUserData);
            setSelectedUser(fullUserData);
            setIsModalOpen(true);
        } catch (err: any) {
            console.error("Error fetching user details:", err);
            setError(err.response?.data?.message || 'Failed to fetch user details.');
            // Optionally show a toast notification here
        } finally {
            setIsFetchingDetails(false);
        }
        // alert(`Edit functionality for ${user.first_name} ${user.last_name} (ID: ${user.id}) is not yet implemented.`); // Remove placeholder alert
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleUserUpdate = async () => {
        // Callback after successful update in modal
        await fetchUsers(); // Refetch users to show updated data
        handleModalClose();
    };

    // Add handler for deleting a user
    const handleDeleteClick = async (userId: number) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            setLoading(true); // Use main loading state or a dedicated one
            setError(null);
            try {
                await deleteUserAdmin(userId);
                console.log(`User ${userId} deleted successfully.`);
                // Optionally show success toast
                await fetchUsers(); // Refresh the list
            } catch (err: any) {
                console.error("Error deleting user:", err);
                setError(err.response?.data?.message || 'Failed to delete user.');
                // Optionally show error toast
            } finally {
                setLoading(false);
            }
        }
    };

    // Add handler for toggling user status
    const handleToggleStatusClick = async (user: AdminUserListItem) => {
        const newStatus = user.status === 'active' ? 'blocked' : 'active';
        if (window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} user ${user.first_name} ${user.last_name}?`)) {
            setLoading(true);
            setError(null);
            try {
                await updateUserAdmin(user.id, { status: newStatus });
                console.log(`User ${user.id} status updated to ${newStatus}.`);
                // Optionally show success toast
                await fetchUsers(); // Refresh the list
            } catch (err: any) {
                console.error("Error updating user status:", err);
                setError(err.response?.data?.message || 'Failed to update user status.');
                 // Optionally show error toast
            } finally {
                setLoading(false);
            }
        }
    };

    // Define columns for DataGrid
    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        {
            field: 'name',
            headerName: 'Name',
            width: 180,
            valueGetter: (value, row) =>
                `${row.first_name || ''} ${row.last_name || ''}`,
        },
        { field: 'email', headerName: 'Email', width: 220 },
        { field: 'phone_number', headerName: 'Phone', width: 130, valueGetter: (value, row) => row.phone_number || '-' },
        { field: 'driving_license', headerName: 'License No.', width: 130, valueGetter: (value, row) => row.driving_license || '-' },
        {
            field: 'driving_license_expiry',
            headerName: 'License Expiry',
            width: 120,
            renderCell: (params: GridRenderCellParams<any, Date>) => (
                params.value ? params.value.toLocaleDateString() : '-'
            ),
            valueGetter: (value) => value ? new Date(value) : null,
            type: 'date',
        },
        {
            field: 'date_of_birth',
            headerName: 'DOB',
            width: 110,
            renderCell: (params: GridRenderCellParams<any, Date>) => (
                params.value ? params.value.toLocaleDateString() : '-'
            ),
            valueGetter: (value) => value ? new Date(value) : null,
            type: 'date',
        },
        {
            field: 'address_combined',
            headerName: 'Address',
            width: 250,
            sortable: false,
            valueGetter: (value, row) =>
                `${row.address || ''}, ${row.city || ''}, ${row.postcode || ''}`.replace(/^, |, $/g, '') || '-',
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title={params.value as string || '-'} placement="top">
                    <span>{params.value as string || '-'}</span>
                </Tooltip>
            ),
        },
        {
            field: 'emergency_contact_combined',
            headerName: 'Emergency Contact',
            width: 200,
            sortable: false,
            valueGetter: (value, row) =>
                 `${row.emergency_contact_name || ''} (${row.emergency_contact_number || 'N/A'})`.replace(/^ \(N\/A\)$/g, '') || '-',
            renderCell: (params: GridRenderCellParams) => (
                 <Tooltip title={params.value as string || '-'} placement="top">
                     <span>{params.value as string || '-'}</span>
                 </Tooltip>
            ),
        },
        { field: 'role', headerName: 'Role', width: 90 },
        { field: 'status', headerName: 'Status', width: 90 },
        {
            field: 'is_verified',
            headerName: 'Verified',
            width: 90,
            type: 'boolean'
        },
        {
            field: 'created_at',
            headerName: 'Created At',
            width: 120,
            renderCell: (params: GridRenderCellParams<any, Date>) => (
                params.value ? params.value.toLocaleDateString() : '-'
            ),
            valueGetter: (value) => value ? new Date(value) : null,
            type: 'date',
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 130, // Increase width for more icons
            sortable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams) => {
                const user = params.row as AdminUserListItem;
                const isActive = user.status === 'active';
                return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}> {/* Use Box for layout */}
                        <Tooltip title="Edit User">
                            {/* Wrap IconButton for Tooltip when disabled */}
                            <span> 
                                <IconButton
                                    aria-label="edit"
                                    size="small"
                                    onClick={() => handleEditClick(user)}
                                    disabled={isFetchingDetails} // Disable edit while fetching for modal
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={isActive ? 'Deactivate User' : 'Activate User'}>
                            <span> {/* Wrap IconButton for Tooltip when potentially disabled */}
                                <IconButton
                                    aria-label={isActive ? 'deactivate' : 'activate'}
                                    size="small"
                                    color={isActive ? 'warning' : 'success'} // Use warning/success color
                                    onClick={() => handleToggleStatusClick(user)}
                                    disabled={loading} // Disable during any loading action
                                >
                                    {isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Delete User">
                             <span> {/* Wrap IconButton for Tooltip when potentially disabled */}
                                <IconButton
                                    aria-label="delete"
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteClick(user.id)}
                                    disabled={loading} // Disable during any loading action
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                     </Box>
                );
            },
        },
    ];

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" gutterBottom sx={{ mt: 4, mb: 2, color: 'text.primary' }}>
                User Management
            </Typography>

            {loading && (
                <Box display="flex" justifyContent="center" sx={{ my: 4 }}>
                    <CircularProgress />
                </Box>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!loading && !error && (
                <Paper sx={{ height: '70vh', width: '100%' }}>
                    <DataGrid
                        rows={users}
                        columns={columns}
                        loading={isFetchingDetails}
                        pageSizeOptions={[10, 25, 50, 100]}
                        initialState={{
                            pagination: {
                                paginationModel: { pageSize: 100 },
                            },
                            sorting: {
                                sortModel: [{ field: 'id', sort: 'desc' }],
                            },
                        }}
                        disableRowSelectionOnClick
                    />
                </Paper>
            )}

            {selectedUser && (
                <EditUserModal
                    open={isModalOpen}
                    onClose={handleModalClose}
                    user={selectedUser}
                    onUpdate={handleUserUpdate}
                    updateUser={updateUserAdmin}
                />
            )}
        </Container>
    );
};

export default UserManagement; 