import React, { useState, useEffect } from 'react';
import {
    getAllUsersAdmin,
    AdminUserListItem,
    addRewardPointsAdmin,
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
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Snackbar,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// Extend the base type to ensure reward_points is handled
interface UserWithPoints extends AdminUserListItem {
    reward_points: number;
}

const RewardManagement: React.FC = () => {
    const [users, setUsers] = useState<UserWithPoints[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for Add Points Dialog
    const [isAddPointsDialogOpen, setIsAddPointsDialogOpen] = useState<boolean>(false);
    const [pointsToAdd, setPointsToAdd] = useState<number | string>('');
    const [selectedUserForPoints, setSelectedUserForPoints] = useState<UserWithPoints | null>(null);
    const [addPointsLoading, setAddPointsLoading] = useState<boolean>(false);
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllUsersAdmin();
            // Ensure reward_points is treated as a number, default to 0
            const usersWithPointsData = data.map(user => ({
                ...user,
                reward_points: user.reward_points ? Number(user.reward_points) : 0
            }));
            setUsers(usersWithPointsData);
        } catch (err: any) {
            console.error("Error fetching users:", err);
            const message = err.response?.data?.message || 'Failed to fetch users.';
            setError(message);
            handleSnackbarOpen(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Snackbar handler
    const handleSnackbarOpen = (message: string, severity: 'success' | 'error') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    // Add Points Logic
    const handleAddPointsClick = (user: UserWithPoints) => {
        setSelectedUserForPoints(user);
        setPointsToAdd('');
        setIsAddPointsDialogOpen(true);
    };

    const handleAddPointsDialogClose = () => {
        setIsAddPointsDialogOpen(false);
        setSelectedUserForPoints(null);
        setPointsToAdd('');
    };

    const handleAddPointsSubmit = async () => {
        if (!selectedUserForPoints || !pointsToAdd || +pointsToAdd <= 0) {
            handleSnackbarOpen('Please enter a positive number of points.', 'error');
            return;
        }

        const points = Number(pointsToAdd);
        if (isNaN(points) || !Number.isInteger(points) || points <= 0) {
            handleSnackbarOpen('Points must be a positive whole number.', 'error');
            return;
        }

        setAddPointsLoading(true);
        try {
            const response = await addRewardPointsAdmin(selectedUserForPoints.id, points);
            handleSnackbarOpen(response.message || `Successfully added ${points} points.`, 'success');
            handleAddPointsDialogClose();
            await fetchUsers(); // Refresh list
        } catch (err: any) {
            console.error("Error adding points:", err);
            const errorMessage = err.response?.data?.message || 'Failed to add points.';
            handleSnackbarOpen(errorMessage, 'error');
        } finally {
            setAddPointsLoading(false);
        }
    };

    const columns: GridColDef<UserWithPoints>[] = [
        { field: 'id', headerName: 'ID', width: 90 },
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 180,
            valueGetter: (value, row) =>
                `${row.first_name || ''} ${row.last_name || ''}`,
        },
        { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
        {
            field: 'reward_points',
            headerName: 'Current Points',
            type: 'number',
            width: 150,
            align: 'right',
            headerAlign: 'right',
        },
        {
            field: 'actions',
            headerName: 'Add Points',
            width: 120,
            sortable: false,
            disableColumnMenu: true,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<UserWithPoints>) => {
                const user = params.row;
                return (
                    <Tooltip title="Add Reward Points">
                        <span>
                            <IconButton
                                aria-label="add points"
                                size="small"
                                color="primary"
                                onClick={() => handleAddPointsClick(user)}
                                disabled={loading || addPointsLoading}
                            >
                                <AddCircleOutlineIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                );
            },
        },
    ];

    if (loading && users.length === 0) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                 <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                     <CircularProgress />
                 </Paper>
             </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom component="h1" sx={{ color: 'black' }}>
                Reward Points Management
            </Typography>
            {error && !loading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper sx={{ height: '70vh', width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={columns}
                    initialState={{
                        pagination: {
                            paginationModel: { pageSize: 15, page: 0 },
                        },
                        sorting: {
                            sortModel: [{ field: 'id', sort: 'asc' }],
                        },
                    }}
                    pageSizeOptions={[15, 30, 50]}
                    checkboxSelection={false}
                    disableRowSelectionOnClick
                    loading={loading}
                    getRowId={(row) => row.id}
                />
            </Paper>

            {/* Add Points Dialog */}
            <Dialog open={isAddPointsDialogOpen} onClose={handleAddPointsDialogClose}>
                <DialogTitle>Add Reward Points</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Add points to {selectedUserForPoints?.first_name} {selectedUserForPoints?.last_name} (Current: {selectedUserForPoints?.reward_points ?? 0} points).
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="points"
                        label="Points to Add"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={pointsToAdd}
                        onChange={(e) => setPointsToAdd(e.target.value)}
                        InputProps={{ inputProps: { min: 1, step: 1 } }}
                        disabled={addPointsLoading}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAddPointsDialogClose} color="secondary" disabled={addPointsLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddPointsSubmit} color="primary" variant="contained" disabled={addPointsLoading || !pointsToAdd}>
                        {addPointsLoading ? <CircularProgress size={24} /> : 'Add Points'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default RewardManagement; 