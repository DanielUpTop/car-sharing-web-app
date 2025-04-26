import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Grid,
    Card,
    CardContent,
    IconButton,
    Tabs,
    Tab,
    Tooltip,
    Switch,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { Edit as EditIcon, Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { format, addDays, isBefore } from 'date-fns';

interface AdminMembership {
    membership_id: number;
    user_email: string;
    user_id: number;
    type: string;
    status: string;
    start_date: string;
    end_date: string;
    auto_renew: boolean;
}

interface MembershipTier {
    id?: number;
    type: string;
    name: string;
    description: string;
    price: number;
    benefits: string[];
    is_active: boolean;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
  
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`membership-tabpanel-${index}`}
            aria-labelledby={`membership-tab-${index}`}
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

const MembershipManagement: React.FC = () => {
    const [memberships, setMemberships] = useState<AdminMembership[]>([]);
    const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [tabValue, setTabValue] = useState(0);
    
    // Status counts
    const [statusCounts, setStatusCounts] = useState({
        active: 0,
        expired: 0,
        cancelled: 0,
        total: 0,
    });
    
    // Dialogs
    const [editTierDialog, setEditTierDialog] = useState(false);
    const [createTierDialog, setCreateTierDialog] = useState(false);
    const [editStatusDialog, setEditStatusDialog] = useState(false);
    const [currentMembership, setCurrentMembership] = useState<AdminMembership | null>(null);
    const [currentTier, setCurrentTier] = useState<MembershipTier | null>(null);
    const [newBenefit, setNewBenefit] = useState('');
    const [benefits, setBenefits] = useState<string[]>([]);

    useEffect(() => {
        console.log(`[MembershipManagement] useEffect running. Token value: ${token}`);
        fetchAdminMemberships();
        fetchMembershipTiers();
    }, []);

    const fetchAdminMemberships = async () => {
        console.log(`[MembershipManagement] fetchAdminMemberships called. Token value: ${token}`);
        setLoading(true);
        setError(null);
        
        if (!token) {
            console.error("[MembershipManagement] No token found before fetching.");
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            return;
        }
        
        try {
            const response = await fetch('http://localhost:5001/api/admin/memberships', { 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`[MembershipManagement] Fetch response status: ${response.status}`);

            if (!response.ok) {
                let errorMsg = `Failed to fetch memberships: ${response.status}`;
                let shouldLogout = false;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {
                }
                
                if (response.status === 401 || response.status === 403) {
                    shouldLogout = true;
                    errorMsg = 'Authentication failed or session expired.';
                }
                
                console.error(`[MembershipManagement] Fetch failed: ${errorMsg}`);
                
                if (shouldLogout) {
                    console.error("[MembershipManagement] Auth error (401/403) detected, but logout() is disabled in this component.");
                }
                 
                throw new Error(errorMsg);
            }

            const data: AdminMembership[] = await response.json();
            console.log("[MembershipManagement] Fetch successful:", data);
            setMemberships(data);
            
            // Calculate status counts
            const counts = {
                active: 0,
                expired: 0,
                cancelled: 0,
                total: data.length,
            };
            
            data.forEach(membership => {
                if (membership.status in counts) {
                    counts[membership.status as keyof typeof counts]++;
                }
            });
            
            setStatusCounts(counts);
        } catch (err) {
            console.error("[MembershipManagement] Error caught during fetch:", err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            toast.error(`Error: ${errorMessage}`);
        } finally {
            console.log("[MembershipManagement] Fetch finished.");
            setLoading(false);
        }
    };
    
    const fetchMembershipTiers = async () => {
        console.log("[MembershipManagement] Fetching membership tiers...");
        try {
            // Use the API URL from environment if available, or fallback to hardcoded URL
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const fullUrl = `${apiUrl}/api/admin/membership-tiers`;
            console.log(`[MembershipManagement] Making API request to: ${fullUrl}`);
            
            const response = await fetch(fullUrl, { 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`[MembershipManagement] Membership tiers response status: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[MembershipManagement] Failed to fetch membership tiers:', errorText);
                throw new Error(`Failed to fetch membership tiers: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            console.log(`[MembershipManagement] Successfully fetched ${data.length} membership tiers:`, data);
            setMembershipTiers(data);
        } catch (err) {
            console.error("[MembershipManagement] Error fetching membership tiers:", err);
            toast.error("Failed to load membership tiers");
        }
    };
    
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };
    
    const handleEditTier = (tier: MembershipTier) => {
        setCurrentTier(tier);
        setBenefits(tier.benefits);
        setEditTierDialog(true);
    };
    
    const handleCreateTier = async () => {
        // If no tiers exist, first try to initialize the default tiers
        if (membershipTiers.length === 0) {
            console.log("[MembershipManagement] No tiers exist, attempting to initialize defaults first");
            try {
                const response = await fetch('http://localhost:5001/api/admin/initialize-membership-tiers', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                console.log(`[MembershipManagement] Initialize tiers response: ${response.status}`);
                
                if (response.ok) {
                    toast.success("Default membership tiers initialized successfully");
                    // Refresh the tiers list
                    await fetchMembershipTiers();
                    return;
                }
            } catch (err) {
                console.error("[MembershipManagement] Error initializing default tiers:", err);
            }
        }
        
        // Continue with creating a new custom tier
        setCurrentTier({
            type: '',
            name: '',
            description: '',
            price: 0,
            benefits: [],
            is_active: true
        });
        setBenefits([]);
        setCreateTierDialog(true);
    };
    
    const handleEditStatus = (membership: AdminMembership) => {
        setCurrentMembership(membership);
        setEditStatusDialog(true);
    };
    
    const handleAddBenefit = () => {
        if (newBenefit.trim() !== '') {
            setBenefits([...benefits, newBenefit.trim()]);
            setNewBenefit('');
        }
    };
    
    const handleRemoveBenefit = (index: number) => {
        const newBenefits = [...benefits];
        newBenefits.splice(index, 1);
        setBenefits(newBenefits);
    };
    
    const handleSaveTier = async () => {
        if (!currentTier) return;
        
        try {
            const tierData = {
                ...currentTier,
                benefits: benefits
            };
            
            const method = currentTier.id ? 'PUT' : 'POST';
            const url = currentTier.id 
                ? `http://localhost:5001/api/admin/membership-tiers/${currentTier.id}`
                : 'http://localhost:5001/api/admin/membership-tiers';
                
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(tierData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to ${currentTier.id ? 'update' : 'create'} membership tier`);
            }
            
            toast.success(`Membership tier ${currentTier.id ? 'updated' : 'created'} successfully`);
            setEditTierDialog(false);
            setCreateTierDialog(false);
            fetchMembershipTiers();
        } catch (err) {
            console.error("Error saving membership tier:", err);
            toast.error("Failed to save membership tier");
        }
    };
    
    const handleUpdateStatus = async () => {
        if (!currentMembership) return;
        
        try {
            const response = await fetch(`http://localhost:5001/api/admin/memberships/${currentMembership.membership_id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: currentMembership.status
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update membership status');
            }
            
            toast.success('Membership status updated successfully');
            setEditStatusDialog(false);
            fetchAdminMemberships();
        } catch (err) {
            console.error("Error updating membership status:", err);
            toast.error("Failed to update status");
        }
    };
    
    const getUpcomingRenewals = () => {
        const thirtyDaysFromNow = addDays(new Date(), 30);
        return memberships.filter(membership => {
            if (membership.status !== 'active' || !membership.auto_renew || !membership.end_date) {
                return false;
            }
            
            const endDate = new Date(membership.end_date);
            return isBefore(endDate, thirtyDaysFromNow);
        });
    };
    
    const upcomingRenewals = getUpcomingRenewals();

    // Add this function to initialize tiers directly
    const initializeDefaultTiers = async () => {
        console.log("[MembershipManagement] Manually initializing default tiers");
        try {
            setLoading(true); // Show loading indicator
            
            // Use the API URL from environment if available, or fallback to hardcoded URL
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const fullUrl = `${apiUrl}/api/admin/initialize-membership-tiers`;
            console.log(`[MembershipManagement] Making API request to: ${fullUrl}`);
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`[MembershipManagement] Initialize tiers response: ${response.status}`);
            
            if (response.ok) {
                const result = await response.json();
                console.log("[MembershipManagement] Initialize response data:", result);
                toast.success("Default membership tiers initialized successfully");
                // Refresh the tiers list
                await fetchMembershipTiers();
            } else {
                const errorText = await response.text();
                console.error("[MembershipManagement] Error initializing tiers:", errorText);
                toast.error("Failed to initialize default tiers");
            }
        } catch (err) {
            console.error("[MembershipManagement] Error initializing default tiers:", err);
            toast.error("Failed to initialize default tiers");
        } finally {
            setLoading(false); // Hide loading indicator
        }
    };

    // Add this function to check debug endpoint
    const checkDebugEndpoint = async () => {
        console.log("[MembershipManagement] Checking debug endpoint");
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const fullUrl = `${apiUrl}/api/admin/membership-tiers-debug`;
            console.log(`[MembershipManagement] Making debug API request to: ${fullUrl}`);
            
            const response = await fetch(fullUrl, { 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`[MembershipManagement] Debug endpoint response status: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[MembershipManagement] Debug endpoint error:', errorText);
                toast.error("Debug endpoint failed");
                return;
            }
            
            const data = await response.json();
            console.log("[MembershipManagement] Debug endpoint data:", data);
            
            if (data.tiers && data.tiers.length > 0) {
                // Format the tiers data to match our component's expectations
                const formattedTiers = data.tiers.map((tier: any) => {
                    // Create a properly formatted tier object
                    return {
                        ...tier,
                        // Ensure price is a number
                        price: typeof tier.price === 'string' ? parseFloat(tier.price) : Number(tier.price),
                        // Ensure benefits is an array
                        benefits: typeof tier.benefits === 'string' ? 
                            JSON.parse(tier.benefits) : 
                            (Array.isArray(tier.benefits) ? tier.benefits : [])
                    };
                });
                
                setMembershipTiers(formattedTiers);
                toast.success(`Found ${formattedTiers.length} tiers via debug endpoint`);
            } else {
                toast.error("No tiers found in debug endpoint");
            }
        } catch (err) {
            console.error("[MembershipManagement] Debug endpoint error:", err);
            toast.error("Debug endpoint check failed");
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading Memberships...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
             <Box sx={{ p: 3 }}>
                 <Typography variant="h4" gutterBottom sx={{ mb: 3, color: 'black' }}>
                    Membership Management
                 </Typography>
                 <Alert severity="error" sx={{ m: 2 }}>
                     {error}
                 </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, color: 'black' }}>
                Membership Management
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="membership management tabs">
                    <Tab label="Membership Status" />
                    <Tab label="Tier Management" />
                    <Tab label="Upcoming Renewals" />
                </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Active Memberships
                                </Typography>
                                <Typography variant="h3">
                                    {statusCounts.active}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Expired Memberships
                                </Typography>
                                <Typography variant="h3">
                                    {statusCounts.expired}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Cancelled Memberships
                                </Typography>
                                <Typography variant="h3">
                                    {statusCounts.cancelled}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Total Memberships
                                </Typography>
                                <Typography variant="h3">
                                    {statusCounts.total}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button 
                        startIcon={<RefreshIcon />} 
                        variant="outlined" 
                        onClick={fetchAdminMemberships}
                    >
                        Refresh
                    </Button>
                </Box>

                <Paper sx={{ overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader aria-label="memberships table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Membership ID</TableCell>
                                    <TableCell>User Email</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Start Date</TableCell>
                                    <TableCell>End Date</TableCell>
                                    <TableCell>Auto Renew</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {memberships.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            No memberships found or data could not be loaded.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    memberships.map((m) => (
                                        <TableRow hover key={m.membership_id}>
                                            <TableCell>{m.membership_id}</TableCell>
                                            <TableCell>{m.user_email}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={m.type} 
                                                    color={
                                                        m.type === 'premium' ? 'primary' : 
                                                        m.type === 'platinum' ? 'secondary' : 'default'
                                                    }
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={m.status} 
                                                    color={
                                                        m.status === 'active' ? 'success' : 
                                                        m.status === 'expired' ? 'warning' : 'error'
                                                    }
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {m.start_date ? format(new Date(m.start_date), 'MM/dd/yyyy') : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {m.end_date ? format(new Date(m.end_date), 'MM/dd/yyyy') : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {m.auto_renew ? 'Yes' : 'No'}
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit Status">
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleEditStatus(m)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button 
                        startIcon={<AddIcon />} 
                        variant="contained" 
                        onClick={handleCreateTier}
                    >
                        Create New Tier
                    </Button>
                </Box>
                
                <Paper sx={{ overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader aria-label="membership tiers table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {membershipTiers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                <Typography variant="body1">No membership tiers found.</Typography>
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <Button 
                                                        variant="contained" 
                                                        color="primary" 
                                                        onClick={initializeDefaultTiers}
                                                    >
                                                        Initialize Default Tiers
                                                    </Button>
                                                    <Button 
                                                        variant="outlined" 
                                                        color="secondary" 
                                                        onClick={checkDebugEndpoint}
                                                    >
                                                        Check Debug Endpoint
                                                    </Button>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {/* Non-Member tier row */}
                                        <TableRow hover>
                                            <TableCell>none</TableCell>
                                            <TableCell>Non-Member</TableCell>
                                            <TableCell>Standard user without membership benefits</TableCell>
                                            <TableCell>£0.00</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label="Active" 
                                                    color="success"
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {/* No edit button for non-member tier */}
                                            </TableCell>
                                        </TableRow>
                                        {/* Regular membership tiers */}
                                        {membershipTiers.map((tier) => (
                                        <TableRow hover key={tier.id}>
                                            <TableCell>{tier.type}</TableCell>
                                            <TableCell>{tier.name}</TableCell>
                                            <TableCell>{tier.description}</TableCell>
                                            <TableCell>£{typeof tier.price === 'string' ? parseFloat(tier.price).toFixed(2) : Number(tier.price).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={tier.is_active ? 'Active' : 'Inactive'} 
                                                    color={tier.is_active ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit Tier">
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleEditTier(tier)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                        ))}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom sx={{ color: 'black' }}>
                    Memberships with Upcoming Renewals (Next 30 Days)
                </Typography>
                
                <Paper sx={{ overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader aria-label="upcoming renewals table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Membership ID</TableCell>
                                    <TableCell>User Email</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>End Date</TableCell>
                                    <TableCell>Days Remaining</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {upcomingRenewals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            No upcoming renewals in the next 30 days.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    upcomingRenewals.map((m) => {
                                        const endDate = new Date(m.end_date);
                                        const today = new Date();
                                        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        
                                        return (
                                            <TableRow hover key={m.membership_id}>
                                                <TableCell>{m.membership_id}</TableCell>
                                                <TableCell>{m.user_email}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={m.type} 
                                                        color={
                                                            m.type === 'premium' ? 'primary' : 
                                                            m.type === 'platinum' ? 'secondary' : 'default'
                                                        }
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{format(endDate, 'MM/dd/yyyy')}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={`${daysRemaining} days`}
                                                        color={
                                                            daysRemaining <= 7 ? 'error' :
                                                            daysRemaining <= 14 ? 'warning' : 'success'
                                                        }
                                                        size="small"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </TabPanel>
            
            {/* Edit Tier Dialog */}
            <Dialog open={editTierDialog} onClose={() => setEditTierDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit Membership Tier</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Type"
                                fullWidth
                                value={currentTier?.type || ''}
                                onChange={(e) => setCurrentTier(prev => prev ? {...prev, type: e.target.value} : null)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Name"
                                fullWidth
                                value={currentTier?.name || ''}
                                onChange={(e) => setCurrentTier(prev => prev ? {...prev, name: e.target.value} : null)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Price"
                                fullWidth
                                type="number"
                                inputProps={{ step: "0.01" }}
                                value={currentTier?.price || 0}
                                onChange={(e) => setCurrentTier(prev => prev ? {...prev, price: parseFloat(e.target.value) || 0} : null)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={currentTier?.is_active ? 'active' : 'inactive'}
                                    onChange={(e) => setCurrentTier(prev => prev ? {...prev, is_active: e.target.value === 'active'} : null)}
                                    label="Status"
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={3}
                                value={currentTier?.description || ''}
                                onChange={(e) => setCurrentTier(prev => prev ? {...prev, description: e.target.value} : null)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                                Benefits
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                {benefits.map((benefit, index) => (
                                    <Chip
                                        key={index}
                                        label={benefit}
                                        onDelete={() => handleRemoveBenefit(index)}
                                    />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    label="Add Benefit"
                                    fullWidth
                                    value={newBenefit}
                                    onChange={(e) => setNewBenefit(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddBenefit()}
                                />
                                <Button 
                                    variant="contained" 
                                    onClick={handleAddBenefit}
                                    sx={{ minWidth: '120px' }}
                                >
                                    Add
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditTierDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveTier} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
            
            {/* Create Tier Dialog - reuses the same component as edit */}
            <Dialog open={createTierDialog} onClose={() => setCreateTierDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create New Membership Tier</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Type"
                                fullWidth
                                value={currentTier?.type || ''}
                                onChange={(e) => setCurrentTier(prev => prev ? {...prev, type: e.target.value} : null)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Name"
                                fullWidth
                                value={currentTier?.name || ''}
                                onChange={(e) => setCurrentTier(prev => prev ? {...prev, name: e.target.value} : null)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Price"
                                fullWidth
                                type="number"
                                inputProps={{ step: "0.01" }}
                                value={currentTier?.price || 0}
                                onChange={(e) => setCurrentTier(prev => prev ? {...prev, price: parseFloat(e.target.value) || 0} : null)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={currentTier?.is_active ? 'active' : 'inactive'}
                                    onChange={(e) => setCurrentTier(prev => prev ? {...prev, is_active: e.target.value === 'active'} : null)}
                                    label="Status"
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={3}
                                value={currentTier?.description || ''}
                                onChange={(e) => setCurrentTier(prev => prev ? {...prev, description: e.target.value} : null)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                                Benefits
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                {benefits.map((benefit, index) => (
                                    <Chip
                                        key={index}
                                        label={benefit}
                                        onDelete={() => handleRemoveBenefit(index)}
                                    />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    label="Add Benefit"
                                    fullWidth
                                    value={newBenefit}
                                    onChange={(e) => setNewBenefit(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddBenefit()}
                                />
                                <Button 
                                    variant="contained" 
                                    onClick={handleAddBenefit}
                                    sx={{ minWidth: '120px' }}
                                >
                                    Add
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateTierDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveTier} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>
            
            {/* Edit Status Dialog */}
            <Dialog open={editStatusDialog} onClose={() => setEditStatusDialog(false)}>
                <DialogTitle>Update Membership Status</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={currentMembership?.status || ''}
                            onChange={(e) => setCurrentMembership(prev => prev ? {...prev, status: e.target.value} : null)}
                            label="Status"
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="expired">Expired</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditStatusDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateStatus} variant="contained">Update</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MembershipManagement; 