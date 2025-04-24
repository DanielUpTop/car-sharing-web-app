import React, { useState, useEffect } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Button,
} from '@mui/material';
import {
    DirectionsCar as CarIcon,
    People as UserIcon,
    BookOnline as BookingIcon,
    AttachMoney as RevenueIcon,
    Chat as ChatIcon,
    Help as HelpIcon,
    CardMembership as CardMembershipIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
    totalUsers: number;
    totalCars: number;
    activeBookings: number;
    totalRevenue: number;
    popularCars: Array<{
        id: number;
        make: string;
        model: string;
        bookings_count: number;
    }>;
    recentBookings: Array<{
        id: number;
        user_name: string;
        car_details: string;
        start_date: string;
        status: string;
        total_price: number;
    }>;
}

const AdminDashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/admin/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    if (!stats) {
        return null;
    }

    const StatCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) => (
        <Card>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography color="textSecondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4">
                            {typeof value === 'number' && title.includes('Revenue') ? 
                                `£${value.toLocaleString()}` : value}
                        </Typography>
                    </Box>
                    <Box sx={{ color }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Dashboard Overview
            </Typography>

            <Grid container spacing={3}>
                {/* Stats Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Revenue"
                        value={stats.totalRevenue}
                        icon={<RevenueIcon fontSize="large" />}
                        color="#2e7d32"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Active Bookings"
                        value={stats.activeBookings}
                        icon={<BookingIcon fontSize="large" />}
                        color="#1976d2"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Users"
                        value={stats.totalUsers}
                        icon={<UserIcon fontSize="large" />}
                        color="#ed6c02"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Cars"
                        value={stats.totalCars}
                        icon={<CarIcon fontSize="large" />}
                        color="#9c27b0"
                    />
                </Grid>

                {/* Support Management Card */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <ChatIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
                            <Typography variant="h6">Support Management</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Manage customer support conversations and inquiries.
                        </Typography>
                        <Box display="flex" gap={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => navigate('/admin/chat')}
                            >
                                View Support Tickets
                            </Button>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => navigate('/admin/chat/analytics')}
                            >
                                Support Analytics
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Membership Management Card */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <CardMembershipIcon sx={{ fontSize: 24, color: 'secondary.main', mr: 1 }} />
                            <Typography variant="h6">Membership Management</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Manage user memberships, types, and subscription statuses.
                        </Typography>
                        <Box display="flex" gap={2}>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => navigate('/admin/memberships')}
                            >
                                Manage Memberships
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => navigate('/admin/memberships/benefits')}
                            >
                                Membership Benefits
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Help Center Management Card */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <HelpIcon sx={{ fontSize: 24, color: 'warning.main', mr: 1 }} />
                            <Typography variant="h6">Help Center Management</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Manage FAQs, help articles, and support resources.
                        </Typography>
                        <Box display="flex" gap={2}>
                            <Button
                                variant="contained"
                                color="warning"
                                onClick={() => navigate('/admin/help/manage')}
                            >
                                Manage Content
                            </Button>
                            <Button
                                variant="outlined"
                                color="warning"
                                onClick={() => navigate('/admin/help/analytics')}
                            >
                                Help Analytics
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Popular Cars Table */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Popular Cars
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Car</TableCell>
                                        <TableCell align="right">Bookings</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stats.popularCars.map((car) => (
                                        <TableRow key={car.id}>
                                            <TableCell>{`${car.make} ${car.model}`}</TableCell>
                                            <TableCell align="right">{car.bookings_count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Recent Bookings Table */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Recent Bookings
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User</TableCell>
                                        <TableCell>Car</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Price</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stats.recentBookings.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell>{booking.user_name}</TableCell>
                                            <TableCell>{booking.car_details}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={booking.status}
                                                    color={
                                                        booking.status === 'completed' ? 'success' :
                                                        booking.status === 'pending' ? 'warning' :
                                                        booking.status === 'cancelled' ? 'error' : 'default'
                                                    }
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                £{booking.total_price.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AdminDashboard; 