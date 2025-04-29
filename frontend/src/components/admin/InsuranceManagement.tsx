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
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    FormControl,
    Select,
    SelectChangeEvent,
    InputLabel,
    Grid,
    Card,
    CardContent,
    CardActions,
    Divider,
    Link,
    IconButton,
    Tab,
    Tabs,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import PaidIcon from '@mui/icons-material/Paid';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface Claim {
    id: number;
    policy_id: number;
    incident_date: string;
    description: string;
    claim_amount: number;
    status: string;
    created_at: string;
    updated_at: string;
    coverage_type: string;
    coverage_amount: number;
    user_id: number;
    make: string;
    model: string;
    user_email: string;
    first_name: string;
    last_name: string;
    admin_notes?: string;
    document_count: number;
}

interface ClaimDocument {
    id: number;
    claim_id: number;
    file_path: string;
    file_name: string;
    file_type: string;
    upload_date: string;
    description?: string;
}

interface ClaimDetailsData {
    claim: Claim;
    documents: ClaimDocument[];
}

const InsuranceManagement: React.FC = () => {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [token] = useState(localStorage.getItem('token'));
    const [selectedTab, setSelectedTab] = useState<number>(0);
    const [openClaimDialog, setOpenClaimDialog] = useState<boolean>(false);
    const [openStatusDialog, setOpenStatusDialog] = useState<boolean>(false);
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [claimDetails, setClaimDetails] = useState<ClaimDetailsData | null>(null);
    const [statusForm, setStatusForm] = useState({
        status: '',
        admin_notes: ''
    });
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [openImagePreview, setOpenImagePreview] = useState<boolean>(false);

    useEffect(() => {
        fetchClaims();
    }, []);

    const fetchClaims = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/insurance/claims`, { 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Authentication failed or session expired.');
                }
                throw new Error(`Failed to fetch claims: ${response.status}`);
            }

            const data: Claim[] = await response.json();
            setClaims(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchClaimDetails = async (claimId: number) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/insurance/claims/${claimId}`, { 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch claim details: ${response.status}`);
            }

            const data: ClaimDetailsData = await response.json();
            setClaimDetails(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            toast.error(`Error: ${errorMessage}`);
        }
    };

    const updateClaimStatus = async () => {
        if (!selectedClaim) return;
        
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/insurance/claims/${selectedClaim.id}/status`, { 
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(statusForm)
            });

            if (!response.ok) {
                throw new Error(`Failed to update claim status: ${response.status}`);
            }

            const data = await response.json();
            
            // Update claims list
            setClaims(claims.map(claim => 
                claim.id === selectedClaim.id 
                    ? { ...claim, status: statusForm.status, admin_notes: statusForm.admin_notes } 
                    : claim
            ));
            
            // Also update selected claim if claim details dialog is open
            if (claimDetails && claimDetails.claim.id === selectedClaim.id) {
                setClaimDetails({
                    ...claimDetails,
                    claim: {
                        ...claimDetails.claim,
                        status: statusForm.status,
                        admin_notes: statusForm.admin_notes
                    }
                });
            }
            
            toast.success('Claim status updated successfully');
            setOpenStatusDialog(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            toast.error(`Error: ${errorMessage}`);
        }
    };

    const handleViewClaim = (claim: Claim) => {
        setSelectedClaim(claim);
        fetchClaimDetails(claim.id);
        setOpenClaimDialog(true);
    };

    const handleChangeStatus = (claim: Claim) => {
        setSelectedClaim(claim);
        setStatusForm({
            status: claim.status,
            admin_notes: claim.admin_notes || ''
        });
        setOpenStatusDialog(true);
    };

    const handleStatusChange = (event: SelectChangeEvent<string>) => {
        setStatusForm({
            ...statusForm,
            status: event.target.value as string
        });
    };

    const handleAdminNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStatusForm({
            ...statusForm,
            admin_notes: event.target.value
        });
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setSelectedTab(newValue);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'approved':
                return 'success';
            case 'rejected':
                return 'error';
            case 'paid':
                return 'info';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <PendingIcon />;
            case 'approved':
                return <CheckCircleIcon />;
            case 'rejected':
                return <CancelIcon />;
            case 'paid':
                return <PaidIcon />;
            default:
                return undefined;
        }
    };

    const getDocumentIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) {
            return <ImageIcon />;
        } else if (fileType === 'application/pdf') {
            return <PictureAsPdfIcon />;
        } else {
            return <TextSnippetIcon />;
        }
    };

    const handlePreviewImage = (documentId: number, claimId: number) => {
        // Create URL for document preview
        const url = `${import.meta.env.VITE_API_URL}/api/admin/insurance/claims/${claimId}/documents/${documentId}`;
        setImagePreviewUrl(url);
        setOpenImagePreview(true);
    };

    const downloadDocument = (documentId: number, claimId: number, fileName: string) => {
        const url = `${import.meta.env.VITE_API_URL}/api/admin/insurance/claims/${claimId}/documents/${documentId}`;
        
        // Create a link element
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        
        // Add auth header by using fetch
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            link.setAttribute('href', url);
            document.body.appendChild(link);
            link.click();
            link.remove();
        })
        .catch(err => {
            toast.error('Failed to download document');
        });
    };

    const filterClaims = (status: string) => {
        if (status === 'all') return claims;
        return claims.filter(claim => claim.status === status);
    };

    const getFilteredClaims = () => {
        switch (selectedTab) {
            case 0:
                return filterClaims('all');
            case 1:
                return filterClaims('pending');
            case 2:
                return filterClaims('approved');
            case 3:
                return filterClaims('rejected');
            case 4:
                return filterClaims('paid');
            default:
                return claims;
        }
    };

    // Add a helper function to safely format the claim amount
    const formatCurrency = (amount: any): string => {
        // Convert to number if it's a string, or default to 0 if conversion fails
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : (typeof amount === 'number' ? amount : 0);
        
        // Check if it's a valid number
        if (isNaN(numAmount)) {
            return '£0.00';
        }
        
        return `£${numAmount.toFixed(2)}`;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading Insurance Claims...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
             <Box sx={{ p: 3 }}>
                 <Typography variant="h4" gutterBottom sx={{ mb: 3, color: 'black' }}>
                    Insurance Management
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
                Insurance Claims Management
            </Typography>

            <Paper sx={{ mb: 3 }}>
                <Tabs 
                    value={selectedTab} 
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab label={`All (${claims.length})`} />
                    <Tab label={`Pending (${filterClaims('pending').length})`} />
                    <Tab label={`Approved (${filterClaims('approved').length})`} />
                    <Tab label={`Rejected (${filterClaims('rejected').length})`} />
                    <Tab label={`Paid (${filterClaims('paid').length})`} />
                </Tabs>
            </Paper>

            <Paper sx={{ overflow: 'hidden' }}>
                <TableContainer>
                    <Table stickyHeader aria-label="insurance claims table">
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Vehicle</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Documents</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {getFilteredClaims().length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        No claims found in this category.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                getFilteredClaims().map((claim) => (
                                    <TableRow hover key={claim.id}>
                                        <TableCell>{claim.id}</TableCell>
                                        <TableCell>
                                            {claim.first_name} {claim.last_name}
                                            <br />
                                            <Typography variant="caption" color="textSecondary">
                                                {claim.user_email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {claim.make} {claim.model}
                                            <br />
                                            <Typography variant="caption" color="textSecondary">
                                                {claim.coverage_type} coverage
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(claim.incident_date), 'dd/MM/yyyy')}
                                            <br />
                                            <Typography variant="caption" color="textSecondary">
                                                Submitted: {format(new Date(claim.created_at), 'dd/MM/yyyy')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight="bold">
                                                {formatCurrency(claim.claim_amount)}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Coverage: {formatCurrency(claim.coverage_amount)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getStatusIcon(claim.status) || undefined}
                                                label={claim.status.toUpperCase()}
                                                color={getStatusColor(claim.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {claim.document_count > 0 ? (
                                                <Chip 
                                                    icon={<DescriptionIcon />} 
                                                    label={`${claim.document_count} documents`} 
                                                    size="small" 
                                                    color="primary"
                                                />
                                            ) : (
                                                <Typography variant="caption" color="textSecondary">
                                                    No documents
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box display="flex" justifyContent="center" gap={1}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<VisibilityIcon />}
                                                    onClick={() => handleViewClaim(claim)}
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleChangeStatus(claim)}
                                                >
                                                    Update
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Claim Details Dialog */}
            <Dialog 
                open={openClaimDialog} 
                onClose={() => setOpenClaimDialog(false)}
                maxWidth="md"
                fullWidth
            >
                {claimDetails ? (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6">
                                    Claim #{claimDetails.claim.id} Details
                                </Typography>
                                <Chip
                                    icon={getStatusIcon(claimDetails.claim.status) || undefined}
                                    label={claimDetails.claim.status.toUpperCase()}
                                    color={getStatusColor(claimDetails.claim.status)}
                                />
                            </Box>
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Card variant="outlined" sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Claimant Information
                                            </Typography>
                                            <Typography><strong>Name:</strong> {claimDetails.claim.first_name} {claimDetails.claim.last_name}</Typography>
                                            <Typography><strong>Email:</strong> {claimDetails.claim.user_email}</Typography>
                                            <Typography><strong>User ID:</strong> {claimDetails.claim.user_id}</Typography>
                                        </CardContent>
                                    </Card>

                                    <Card variant="outlined" sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Vehicle & Policy
                                            </Typography>
                                            <Typography><strong>Vehicle:</strong> {claimDetails.claim.make} {claimDetails.claim.model}</Typography>
                                            <Typography><strong>Policy ID:</strong> {claimDetails.claim.policy_id}</Typography>
                                            <Typography><strong>Coverage Type:</strong> {claimDetails.claim.coverage_type}</Typography>
                                            <Typography><strong>Coverage Amount:</strong> {formatCurrency(claimDetails.claim.coverage_amount)}</Typography>
                                        </CardContent>
                                    </Card>

                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Claim Information
                                            </Typography>
                                            <Typography><strong>Incident Date:</strong> {format(new Date(claimDetails.claim.incident_date), 'dd/MM/yyyy')}</Typography>
                                            <Typography><strong>Claim Amount:</strong> {formatCurrency(claimDetails.claim.claim_amount)}</Typography>
                                            <Typography><strong>Submitted:</strong> {format(new Date(claimDetails.claim.created_at), 'dd/MM/yyyy HH:mm')}</Typography>
                                            <Typography><strong>Last Updated:</strong> {format(new Date(claimDetails.claim.updated_at), 'dd/MM/yyyy HH:mm')}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Card variant="outlined" sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Incident Description
                                            </Typography>
                                            <Paper 
                                                elevation={0} 
                                                sx={{ 
                                                    p: 2, 
                                                    bgcolor: 'background.default', 
                                                    minHeight: '100px',
                                                    maxHeight: '200px',
                                                    overflow: 'auto'
                                                }}
                                            >
                                                <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                                    {claimDetails.claim.description}
                                                </Typography>
                                            </Paper>
                                        </CardContent>
                                    </Card>

                                    {claimDetails.claim.admin_notes && (
                                        <Card variant="outlined" sx={{ mb: 2 }}>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    Admin Notes
                                                </Typography>
                                                <Paper 
                                                    elevation={0} 
                                                    sx={{ 
                                                        p: 2, 
                                                        bgcolor: 'background.default', 
                                                        minHeight: '50px',
                                                        maxHeight: '150px',
                                                        overflow: 'auto'
                                                    }}
                                                >
                                                    <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                                        {claimDetails.claim.admin_notes}
                                                    </Typography>
                                                </Paper>
                                            </CardContent>
                                        </Card>
                                    )}

                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Claim Documents ({claimDetails.documents.length})
                                            </Typography>
                                            
                                            {claimDetails.documents.length === 0 ? (
                                                <Typography color="textSecondary">
                                                    No documents have been uploaded for this claim.
                                                </Typography>
                                            ) : (
                                                <List dense>
                                                    {claimDetails.documents.map((doc) => (
                                                        <ListItem 
                                                            key={doc.id}
                                                            secondaryAction={
                                                                <Box>
                                                                    {doc.file_type.startsWith('image/') && (
                                                                        <IconButton 
                                                                            edge="end" 
                                                                            onClick={() => handlePreviewImage(doc.id, claimDetails.claim.id)}
                                                                            title="Preview"
                                                                        >
                                                                            <OpenInNewIcon />
                                                                        </IconButton>
                                                                    )}
                                                                    <IconButton 
                                                                        edge="end"
                                                                        onClick={() => downloadDocument(doc.id, claimDetails.claim.id, doc.file_name)}
                                                                        title="Download"
                                                                    >
                                                                        <DownloadIcon />
                                                                    </IconButton>
                                                                </Box>
                                                            }
                                                        >
                                                            <ListItemIcon>
                                                                {getDocumentIcon(doc.file_type)}
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary={doc.file_name}
                                                                secondary={`Uploaded: ${format(new Date(doc.upload_date), 'dd/MM/yyyy HH:mm')}`}
                                                            />
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenClaimDialog(false)}>Close</Button>
                            <Button 
                                variant="contained" 
                                color="primary"
                                onClick={() => {
                                    setOpenClaimDialog(false);
                                    handleChangeStatus(claimDetails.claim);
                                }}
                            >
                                Update Status
                            </Button>
                        </DialogActions>
                    </>
                ) : (
                    <Box p={4} display="flex" justifyContent="center" alignItems="center">
                        <CircularProgress size={40} />
                        <Typography sx={{ ml: 2 }}>Loading claim details...</Typography>
                    </Box>
                )}
            </Dialog>

            {/* Update Status Dialog */}
            <Dialog 
                open={openStatusDialog} 
                onClose={() => setOpenStatusDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Update Claim Status
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2, mt: 1 }}>
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusForm.status}
                                onChange={handleStatusChange}
                                label="Status"
                            >
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                                <MenuItem value="paid">Paid</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Admin Notes"
                            multiline
                            rows={4}
                            value={statusForm.admin_notes}
                            onChange={handleAdminNotesChange}
                            fullWidth
                            variant="outlined"
                            placeholder="Add notes to explain your decision, especially if rejecting the claim..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="primary"
                        onClick={updateClaimStatus}
                    >
                        Update Status
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Preview Dialog */}
            <Dialog
                open={openImagePreview}
                onClose={() => setOpenImagePreview(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogContent>
                    {imagePreviewUrl && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <img 
                                src={imagePreviewUrl} 
                                alt="Document Preview" 
                                style={{ maxWidth: '100%', maxHeight: '70vh' }} 
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenImagePreview(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default InsuranceManagement; 