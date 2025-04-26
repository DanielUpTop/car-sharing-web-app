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
} from '@mui/material';
import { toast } from 'react-hot-toast';

interface AdminInsurance {
    policy_id: number;
    user_email: string;
    policy_type: string;
    status: string;
    coverage_amount: number;
}

const InsuranceManagement: React.FC = () => {
    const [policies, setPolicies] = useState<AdminInsurance[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        console.log(`[InsuranceManagement] useEffect running. Token value: ${token}`);
        fetchAdminInsurance();
    }, []);

    const fetchAdminInsurance = async () => {
        console.log(`[InsuranceManagement] fetchAdminInsurance called. Token value: ${token}`);
        setLoading(true);
        setError(null);
        
        if (!token) {
            console.error("[InsuranceManagement] No token found before fetching.");
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            return;
        }
        
        try {
            const response = await fetch('http://localhost:5001/api/admin/insurance', { 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`[InsuranceManagement] Fetch response status: ${response.status}`);

            if (!response.ok) {
                let errorMsg = `Failed to fetch insurance policies: ${response.status}`;
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
                
                console.error(`[InsuranceManagement] Fetch failed: ${errorMsg}`);
                
                if (shouldLogout) {
                    console.error("[InsuranceManagement] Auth error (401/403) detected, but logout() is disabled in this component.");
                }
                 
                throw new Error(errorMsg);
            }

            const data: AdminInsurance[] = await response.json();
            console.log("[InsuranceManagement] Fetch successful:", data);
            setPolicies(data);
        } catch (err) {
            console.error("[InsuranceManagement] Error caught during fetch:", err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            toast.error(`Error: ${errorMessage}`);
        } finally {
            console.log("[InsuranceManagement] Fetch finished.");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading Insurance Policies...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
             <Box sx={{ p: 3 }}>
                 <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
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
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                Insurance Management
            </Typography>

            <Paper sx={{ overflow: 'hidden' }}>
                <TableContainer>
                    <Table stickyHeader aria-label="insurance policies table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Policy ID</TableCell>
                                <TableCell>User Email</TableCell>
                                <TableCell>Policy Type</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Coverage Amount</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {policies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        No insurance policies found or data could not be loaded.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                policies.map((policy) => (
                                    <TableRow hover key={policy.policy_id}>
                                        <TableCell>{policy.policy_id}</TableCell>
                                        <TableCell>{policy.user_email}</TableCell>
                                        <TableCell>{policy.policy_type}</TableCell>
                                        <TableCell>{policy.status}</TableCell>
                                        <TableCell>£{policy.coverage_amount}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default InsuranceManagement; 