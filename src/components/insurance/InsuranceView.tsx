import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Box, Typography, Grid, Paper } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import GavelIcon from '@mui/icons-material/Gavel';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EventIcon from '@mui/icons-material/Event';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { format } from 'date-fns';

const InsuranceView = () => {
    const [openNewClaim, setOpenNewClaim] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [claimForm, setClaimForm] = useState({
        incident_date: '',
        description: '',
        claim_amount: ''
    });

    const handleSubmitClaim = async () => {
        if (!selectedPolicy) {
            console.error('No policy selected for claim submission');
            return;
        }

        try {
            console.log('Starting claim submission process...');
            console.log('Claim form state:', claimForm);
            
            // Add a pre-validation check directly before submission
            if (!claimForm.incident_date) {
                console.error('Validation failed: Missing incident date');
                setError('Incident date is required');
                return;
            }

            if (!claimForm.description || claimForm.description.trim().length < 10) {
                console.error('Validation failed: Description too short or missing');
                setError('Description must be at least 10 characters long');
                return;
            }

            const claimAmount = Number(claimForm.claim_amount);
            if (!claimForm.claim_amount || isNaN(claimAmount) || claimAmount <= 0) {
                console.error('Validation failed: Invalid claim amount');
                setError('Claim amount must be greater than 0');
                return;
            }

            console.log('Form validation passed, preparing API request...');

            // Format the date properly if needed
            let formattedDate;
            try {
                formattedDate = new Date(claimForm.incident_date).toISOString().split('T')[0];
                console.log('Formatted date:', formattedDate);
            } catch (dateError) {
                console.error('Error formatting date:', dateError);
                setError('Invalid date format');
                return;
            }
            
            const claimData = {
                policy_id: selectedPolicy.id,
                incident_date: formattedDate,
                description: claimForm.description,
                claim_amount: claimAmount
            };
            
            console.log('Submitting claim with data:', claimData);

            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                setError('Authentication error. Please log in again.');
                return;
            }
            
            console.log('API URL:', `${import.meta.env.VITE_API_URL}/api/insurance/claims`);
            console.log('Using token (first 10 chars):', token.substring(0, 10));
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/insurance/claims`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(claimData)
            });

            console.log('Claim response status:', response.status);
            console.log('Claim response statusText:', response.statusText);
            
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            let responseData;
            try {
                responseData = responseText ? JSON.parse(responseText) : {};
                console.log('Parsed response data:', responseData);
            } catch (e) {
                console.error('Error parsing response:', e);
                console.log('Response was not valid JSON:', responseText);
            }

            if (!response.ok) {
                throw new Error(`Failed to submit claim: ${responseText}`);
            }

            console.log('Claim submitted successfully!');
            await fetchPoliciesAndClaims();
            setOpenNewClaim(false);
            setClaimForm({ incident_date: '', description: '', claim_amount: '' });
            setSelectedPolicy(null);
            setError(null);
            alert('Claim submitted successfully!');
        } catch (err) {
            console.error('Error in handleSubmitClaim:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit claim');
        }
    };

    return (
        <Dialog 
            open={openNewClaim} 
            onClose={() => setOpenNewClaim(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2 }
            }}
        >
            <DialogTitle 
                sx={{ 
                    pb: 1, 
                    pt: 2, 
                    px: 3,
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                }}
            >
                <ReportProblemIcon sx={{ color: 'error.main' }} />
                <Typography variant="h5" component="div">File New Insurance Claim</Typography>
            </DialogTitle>

            {/* Multi-step form with improved UX */}
            <DialogContent sx={{ p: 0 }}>
                {error && (
                    <Alert severity="error" sx={{ m: 3, mb: 0 }}>
                        {error}
                    </Alert>
                )}
                
                {selectedPolicy && (
                    <Box sx={{ m: 3, p: 2.5, bgcolor: 'background.default', borderRadius: 1, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <DirectionsCarIcon sx={{ color: 'primary.main' }} />
                            <Typography variant="h6" fontWeight="medium">
                                {selectedPolicy.make} {selectedPolicy.model}
                            </Typography>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="text.secondary">Policy #</Typography>
                                <Typography variant="body1" fontWeight="medium">{selectedPolicy.id}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="text.secondary">Coverage Type</Typography>
                                <Typography variant="body1" fontWeight="medium">
                                    {getPolicyTypeDetails(selectedPolicy.coverage_type).label}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="text.secondary">Coverage Amount</Typography>
                                <Typography variant="body1" fontWeight="medium">
                                    ${sanitizeNumber(selectedPolicy.coverage_amount).toFixed(2)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">Booking Period</Typography>
                                <Typography variant="body1">
                                    {selectedPolicy.booking_start ? format(new Date(selectedPolicy.booking_start), 'MMM d, yyyy') : '—'} to {selectedPolicy.booking_end ? format(new Date(selectedPolicy.booking_end), 'MMM d, yyyy') : '—'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>
                )}
                
                <Box sx={{ px: 3, py: 2 }}>
                    <Typography variant="subtitle1" color="text.primary" gutterBottom fontWeight="medium">
                        Incident Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Please provide detailed information about the incident that occurred during your rental period.
                        All fields marked with * are required.
                    </Typography>
                
                    <form id="claim-form">
                        <input 
                            type="hidden" 
                            name="policy_id" 
                            value={selectedPolicy?.id}
                        />
                        
                        <Grid container spacing={3}>
                            {/* Date selection with improved UX */}
                            <Grid item xs={12} md={6}>
                                <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
                                    Incident Date *
                                </Typography>
                                
                                <TextField
                                    type="date"
                                    name="incident_date"
                                    fullWidth
                                    value={claimForm.incident_date}
                                    onChange={(e) => {
                                        setError(null);
                                        setClaimForm({ ...claimForm, incident_date: e.target.value });
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <Box component="span" mr={1}>
                                                <EventIcon color="action" fontSize="small" />
                                            </Box>
                                        ),
                                    }}
                                    required
                                    error={Boolean(error && error.includes('date'))}
                                    helperText={selectedPolicy ? 
                                        `Date must be within booking period: ${selectedPolicy.booking_start ? format(new Date(selectedPolicy.booking_start), 'MMM d, yyyy') : '—'} - ${selectedPolicy.booking_end ? format(new Date(selectedPolicy.booking_end), 'MMM d, yyyy') : '—'}` : 
                                        'When did the incident occur?'
                                    }
                                    inputProps={{
                                        min: selectedPolicy?.booking_start ? format(new Date(selectedPolicy.booking_start), 'yyyy-MM-dd') : '',
                                        max: selectedPolicy?.booking_end ? format(new Date(selectedPolicy.booking_end), 'yyyy-MM-dd') : '',
                                    }}
                                    variant="outlined"
                                    size="medium"
                                />
                            </Grid>
                            
                            {/* Claim amount with currency symbol */}
                            <Grid item xs={12} md={6}>
                                <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
                                    Claim Amount *
                                </Typography>
                                
                                <TextField
                                    type="number"
                                    name="claim_amount"
                                    fullWidth
                                    value={claimForm.claim_amount}
                                    onChange={(e) => {
                                        setError(null);
                                        setClaimForm({ ...claimForm, claim_amount: e.target.value });
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <Box component="span" mr={1}>
                                                <AttachMoneyIcon color="action" fontSize="small" />
                                            </Box>
                                        ),
                                    }}
                                    required
                                    error={Boolean(error && error.includes('amount'))}
                                    helperText={selectedPolicy ?
                                        `Maximum coverage: $${sanitizeNumber(selectedPolicy.coverage_amount).toFixed(2)}` :
                                        "Enter the amount you're claiming"
                                    }
                                    inputProps={{
                                        min: "1",
                                        step: "0.01",
                                        max: selectedPolicy?.coverage_amount || undefined
                                    }}
                                    variant="outlined"
                                    size="medium"
                                />
                            </Grid>
                            
                            {/* Incident description with character count */}
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
                                    Description *
                                </Typography>
                                
                                <TextField
                                    name="description"
                                    multiline
                                    rows={4}
                                    fullWidth
                                    value={claimForm.description}
                                    onChange={(e) => {
                                        setError(null);
                                        setClaimForm({ ...claimForm, description: e.target.value });
                                    }}
                                    placeholder="Describe the incident in detail, including what happened, where it occurred, and any other relevant information."
                                    required
                                    error={Boolean(error && error.includes('description'))}
                                    helperText={`${claimForm.description.length}/10+ characters required. Please provide detailed information about what happened.`}
                                    InputProps={{
                                        startAdornment: (
                                            <Box component="span" sx={{ position: 'absolute', top: 12, left: 12 }}>
                                                <DescriptionIcon color="action" fontSize="small" />
                                            </Box>
                                        ),
                                        sx: { pl: 5 }
                                    }}
                                    variant="outlined"
                                    inputProps={{
                                        minLength: 10
                                    }}
                                />
                            </Grid>
                            
                            {/* File upload section */}
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontWeight: 'medium', mb: 1 }}>
                                    Supporting Documents (Optional)
                                </Typography>
                                
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 3,
                                        border: '1px dashed rgba(0, 0, 0, 0.23)',
                                        borderRadius: 1,
                                        bgcolor: 'background.default',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        }
                                    }}
                                >
                                    <input
                                        type="file"
                                        id="file-upload"
                                        multiple
                                        style={{ display: 'none' }}
                                        accept="image/*,.pdf"
                                    />
                                    <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                            <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                                            <Typography variant="body1" fontWeight="medium">
                                                Drag and drop or click to upload
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Upload photos of the damage, invoices, police reports, or any other supporting documents
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<AddCircleOutlineIcon />}
                                                sx={{ mt: 1 }}
                                            >
                                                Choose Files
                                            </Button>
                                        </Box>
                                    </label>
                                </Paper>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Accepted formats: JPG, PNG, PDF. Maximum 5 files, 10MB each.
                                </Typography>
                            </Grid>
                        </Grid>
                    </form>
                </Box>
                
                {/* Information about what happens next */}
                <Box sx={{ px: 3, pb: 3, pt: 1 }}>
                    <Paper
                        sx={{
                            p: 2,
                            bgcolor: 'info.50',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'info.200'
                        }}
                    >
                        <Typography variant="subtitle2" color="info.dark" gutterBottom>
                            What happens after you submit a claim?
                        </Typography>
                        <Typography variant="body2" color="info.dark">
                            1. Our admin team will review your claim within 1-2 business days and send a confirmation.
                        </Typography>
                        <Typography variant="body2" color="info.dark">
                            2. We'll contact you via phone and email to discuss your claim details if needed.
                        </Typography>
                        <Typography variant="body2" color="info.dark">
                            3. You can always open a live chat to discuss your claim with our support team.
                        </Typography>
                    </Paper>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <Button 
                    onClick={() => {
                        setOpenNewClaim(false);
                        setError(null);
                    }}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={(e) => {
                        e.preventDefault();
                        const form = document.getElementById('claim-form');
                        if (form) {
                            // Use good old DOM to trigger form validation
                            const isValid = Array.from(form.elements).every((el) => {
                                if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                                    return el.checkValidity();
                                }
                                return true;
                            });
                            
                            // Additional validation for date within booking period
                            if (selectedPolicy && claimForm.incident_date) {
                                const incidentDate = new Date(claimForm.incident_date);
                                const bookingStart = new Date(selectedPolicy.booking_start);
                                const bookingEnd = new Date(selectedPolicy.booking_end);
                                
                                if (incidentDate < bookingStart || incidentDate > bookingEnd) {
                                    setError('Incident date must be within the booking period');
                                    return;
                                }
                            }
                            
                            // Additional validation for description length
                            if (claimForm.description.length < 10) {
                                setError('Description must be at least 10 characters long');
                                return;
                            }
                            
                            // Additional validation for claim amount
                            const claimAmount = Number(claimForm.claim_amount);
                            if (isNaN(claimAmount) || claimAmount <= 0) {
                                setError('Claim amount must be greater than 0');
                                return;
                            }
                            
                            if (selectedPolicy && claimAmount > selectedPolicy.coverage_amount) {
                                setError(`Claim amount cannot exceed coverage amount of $${selectedPolicy.coverage_amount.toFixed(2)}`);
                                return;
                            }
                            
                            if (isValid) {
                                const token = localStorage.getItem('token');
                                if (!token) {
                                    alert('Not authenticated. Please log in again.');
                                    return;
                                }
                                
                                // Send the data using fetch
                                fetch(`${import.meta.env.VITE_API_URL}/api/insurance/claims`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                        policy_id: selectedPolicy?.id,
                                        incident_date: claimForm.incident_date,
                                        description: claimForm.description,
                                        claim_amount: Number(claimForm.claim_amount)
                                    })
                                })
                                .then(response => {
                                    if (!response.ok) {
                                        return response.text().then(text => { throw new Error(text) });
                                    }
                                    return response.json();
                                })
                                .then(data => {
                                    // Display success message
                                    setOpenNewClaim(false);
                                    setClaimForm({ incident_date: '', description: '', claim_amount: '' });
                                    setSelectedPolicy(null);
                                    
                                    // Show success dialog
                                    alert('Claim submitted successfully! Our admin team will review your claim and contact you soon.');
                                    
                                    // Refresh the claims list
                                    window.location.reload();
                                })
                                .catch(err => {
                                    console.error('Error submitting claim:', err);
                                    setError(`Failed to submit claim: ${err.message}`);
                                });
                            } else {
                                setError('Please fill out all required fields correctly.');
                            }
                        }
                    }}
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<GavelIcon />}
                    sx={{ borderRadius: 2, px: 3, fontSize: '1rem' }}
                >
                    Submit Claim
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default InsuranceView; 