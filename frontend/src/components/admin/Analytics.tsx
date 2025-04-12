import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    SelectChangeEvent,
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import {
    DirectionsCar as CarIcon,
    People as UserIcon,
    BookOnline as BookingIcon,
    AttachMoney as RevenueIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface AnalyticsData {
    overview: {
        totalRevenue: number;
        totalBookings: number;
        activeUsers: number;
        availableCars: number;
        revenueGrowth: number;
        bookingGrowth: number;
    };
    revenueByMonth: Array<{
        month: string;
        revenue: number;
    }>;
    bookingsByStatus: Array<{
        status: string;
        count: number;
    }>;
    popularCars: Array<{
        car: string;
        bookings: number;
        revenue: number;
    }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Analytics = () => {
    const { token } = useAuth();
    const [timeFrame, setTimeFrame] = useState('month');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchAnalytics();
        }
    }, [timeFrame, token]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `http://localhost:5001/api/admin/analytics?timeFrame=${timeFrame}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }
            
            const data = await response.json();
            setData(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setError('Failed to load analytics data');
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

    if (error || !data) {
        return (
            <Box p={3}>
                <Alert severity="error">{error || 'No data available'}</Alert>
            </Box>
        );
    }

    const StatCard = ({ title, value, icon, color, subtext }: {
        title: string;
        value: string | number;
        icon: React.ReactNode;
        color: string;
        subtext?: string;
    }) => (
        <Card>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography color="textSecondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" component="div">
                            {value}
                        </Typography>
                        {subtext && (
                            <Typography variant="body2" color={subtext.includes('+') ? 'success.main' : 'error.main'}>
                                {subtext}
                            </Typography>
                        )}
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
                Analytics Dashboard
            </Typography>

            <Grid container spacing={3}>
                {/* Stats Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Revenue"
                        value={`£${data.overview.totalRevenue.toLocaleString()}`}
                        icon={<RevenueIcon fontSize="large" />}
                        color="#2e7d32"
                        subtext={`${data.overview.revenueGrowth >= 0 ? '+' : ''}${data.overview.revenueGrowth}% vs last month`}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Bookings"
                        value={data.overview.totalBookings}
                        icon={<BookingIcon fontSize="large" />}
                        color="#1976d2"
                        subtext={`${data.overview.bookingGrowth >= 0 ? '+' : ''}${data.overview.bookingGrowth}% vs last month`}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Active Users"
                        value={data.overview.activeUsers}
                        icon={<UserIcon fontSize="large" />}
                        color="#ed6c02"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Available Cars"
                        value={data.overview.availableCars}
                        icon={<CarIcon fontSize="large" />}
                        color="#9c27b0"
                    />
                </Grid>

                {/* Revenue Chart */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <Typography variant="h6" gutterBottom>
                            Revenue Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={data.revenueByMonth}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value) => `£${value}`} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8884d8"
                                    activeDot={{ r: 8 }}
                                    name="Revenue"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Booking Status Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <Typography variant="h6" gutterBottom>
                            Bookings by Status
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.bookingsByStatus}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                    nameKey="status"
                                >
                                    {data.bookingsByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Popular Cars Chart */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: 400 }}>
                        <Typography variant="h6" gutterBottom>
                            Popular Cars Performance
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data.popularCars}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="car" />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="left" dataKey="bookings" fill="#8884d8" name="Bookings" />
                                <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Analytics; 