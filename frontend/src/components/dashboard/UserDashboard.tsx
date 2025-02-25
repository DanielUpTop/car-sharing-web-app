import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    CircularProgress,
    Card,
    CardContent,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    AppBar,
    Toolbar,
    IconButton,
    Table,
    TableHead,
    TableBody,
    TableCell,
    TableRow,
    Chip,
    Button,
    Rating
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
    DirectionsCarFilledOutlined as CarIcon,
    CheckCircleOutline as CompletedIcon,
    PendingOutlined as PendingIcon,
    CancelOutlined as CancelledIcon,
    AttachMoney as MoneyIcon,
    ArrowBack as ArrowBackIcon,
    Refresh as RefreshIcon,
    FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { format, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface MonthlyStats {
    month: string;
    bookings: number;
    spent: number;
}

interface CarTypeStats {
    make: string;
    bookings: number;
}

interface DashboardStats {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalSpent: number;
    averageBookingDuration: number;
    mostBookedCar: {
        make: string;
        model: string;
        bookings: number;
    } | null;
    monthlyStats: MonthlyStats[];
    carTypeStats: CarTypeStats[];
    recentBookings: {
        id: number;
        start_date: string;
        status: string;
        total_price: number;
        make: string;
        model: string;
    }[];
    averageRating?: number;
    mostCommonBookingLength?: number;
    preferredCarMake?: string;
    bookingsByDayOfWeek?: {
        day: string;
        count: number;
    }[];
    popularBookingTimes?: {
        hour: number;
        count: number;
    }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const getStatusColor = (status: string): "success" | "warning" | "error" | "info" | "default" => {
    switch (status.toLowerCase()) {
        case 'confirmed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'cancelled':
            return 'error';
        case 'completed':
            return 'info';
        default:
            return 'default';
    }
};

const UserDashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('6months');
    const [startDate, setStartDate] = useState<Date | null>(subMonths(new Date(), 6));
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardStats();
    }, [timeRange, startDate, endDate]);

    const fetchDashboardStats = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            
            if (!token) {
                navigate('/login');
                return;
            }

            const params = new URLSearchParams({
                timeRange,
                ...(startDate && { startDate: startDate.toISOString() }),
                ...(endDate && { endDate: endDate.toISOString() })
            });

            const response = await fetch(
                `http://localhost:5001/api/users/dashboard-stats?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 403) {
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const exportDashboardData = () => {
        if (!stats) return;
        
        const data = {
            summary: {
                totalBookings: stats.totalBookings,
                activeBookings: stats.activeBookings,
                completedBookings: stats.completedBookings,
                cancelledBookings: stats.cancelledBookings,
                totalSpent: stats.totalSpent,
                averageBookingDuration: stats.averageBookingDuration
            },
            monthlyStats: stats.monthlyStats,
            recentBookings: stats.recentBookings,
            carTypeStats: stats.carTypeStats
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-stats-${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="100vh"
                flexDirection="column"
                gap={2}
            >
                <Typography color="error" variant="h6">
                    {error}
                </Typography>
                <Button 
                    variant="contained" 
                    onClick={fetchDashboardStats}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    if (!stats) {
        return (
            <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="100vh"
            >
                <Typography>No data available</Typography>
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <AppBar position="fixed">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate('/dashboard')}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        My Dashboard
                    </Typography>
                    <IconButton 
                        color="inherit" 
                        onClick={fetchDashboardStats}
                        sx={{ ml: 'auto' }}
                    >
                        <RefreshIcon />
                    </IconButton>
                    <IconButton 
                        color="inherit" 
                        onClick={exportDashboardData}
                        title="Export Data"
                    >
                        <FileDownloadIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Toolbar />

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Time Range</InputLabel>
                            <Select
                                value={timeRange}
                                label="Time Range"
                                onChange={(e) => setTimeRange(e.target.value)}
                            >
                                <MenuItem value="1month">Last Month</MenuItem>
                                <MenuItem value="3months">Last 3 Months</MenuItem>
                                <MenuItem value="6months">Last 6 Months</MenuItem>
                                <MenuItem value="custom">Custom Range</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    {timeRange === 'custom' && (
                        <>
                            <Grid item xs={12} md={4}>
                                <DatePicker
                                    label="Start Date"
                                    value={startDate}
                                    onChange={setStartDate}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <DatePicker
                                    label="End Date"
                                    value={endDate}
                                    onChange={setEndDate}
                                />
                            </Grid>
                        </>
                    )}
                </Grid>
            </Paper>

            <Grid container spacing={3}>
                {/* Booking Statistics */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>
                            Booking Statistics
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ 
                                    bgcolor: 'primary.light',
                                    color: 'primary.contrastText',
                                    transition: '0.3s',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: 3
                                    }
                                }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <CarIcon sx={{ fontSize: 40, mr: 1 }} />
                                            <Typography variant="h4">
                                                {stats.totalBookings}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2">
                                            Total Bookings
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ 
                                    bgcolor: 'warning.light',
                                    color: 'warning.contrastText',
                                    transition: '0.3s',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: 3
                                    }
                                }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <PendingIcon sx={{ fontSize: 40, mr: 1 }} />
                                            <Typography variant="h4">
                                                {stats.activeBookings}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2">
                                            Active Bookings
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ 
                                    bgcolor: 'success.light',
                                    color: 'success.contrastText',
                                    transition: '0.3s',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: 3
                                    }
                                }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <CompletedIcon sx={{ fontSize: 40, mr: 1 }} />
                                            <Typography variant="h4">
                                                {stats.completedBookings}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2">
                                            Completed
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ 
                                    bgcolor: 'error.light',
                                    color: 'error.contrastText',
                                    transition: '0.3s',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: 3
                                    }
                                }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <CancelledIcon sx={{ fontSize: 40, mr: 1 }} />
                                            <Typography variant="h4">
                                                {stats.cancelledBookings}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2">
                                            Cancelled
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Financial Summary */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Financial Summary
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h4" color="primary">
                                £{Number(stats.totalSpent || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Amount Spent
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Most Booked Car */}
                {stats.mostBookedCar && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Most Booked Car
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h5">
                                    {stats.mostBookedCar.make} {stats.mostBookedCar.model}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Booked {stats.mostBookedCar.bookings} times
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                )}

                {/* Monthly Bookings Chart */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Monthly Booking Trends
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={stats.monthlyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis yAxisId="left" />
                                <YAxis 
                                    yAxisId="right" 
                                    orientation="right" 
                                    tickFormatter={(value) => `£${Number(value).toFixed(2)}`}
                                />
                                <Tooltip />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="bookings"
                                    stroke="#8884d8"
                                    name="Bookings"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="spent"
                                    stroke="#82ca9d"
                                    name="Amount Spent (£)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Car Type Distribution */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Car Type Distribution
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={stats.carTypeStats}
                                    dataKey="bookings"
                                    nameKey="make"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {stats.carTypeStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Additional Stats */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Additional Statistics
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body1" gutterBottom>
                                Average Booking Duration: {Math.round(stats.averageBookingDuration)} days
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                                Average Cost per Booking: £{(stats.totalSpent / (stats.totalBookings || 1)).toFixed(2)}
                            </Typography>
                            {stats.mostCommonBookingLength && (
                                <Typography variant="body1" gutterBottom>
                                    Most Common Booking Length: {stats.mostCommonBookingLength} days
                                </Typography>
                            )}
                            {stats.preferredCarMake && (
                                <Typography variant="body1">
                                    Preferred Car Make: {stats.preferredCarMake}
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* Recent Bookings */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Recent Bookings
                        </Typography>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Car</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stats.recentBookings?.map((booking) => (
                                    <TableRow key={booking.id}>
                                        <TableCell>{booking.make} {booking.model}</TableCell>
                                        <TableCell>{format(new Date(booking.start_date), 'PP')}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={booking.status}
                                                color={getStatusColor(booking.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">£{Number(booking.total_price || 0).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>

                {/* Popular Booking Days */}
                {stats.bookingsByDayOfWeek && stats.bookingsByDayOfWeek.length > 0 && (
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Popular Booking Days
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.bookingsByDayOfWeek}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                )}

                {/* Popular Booking Times */}
                {stats.popularBookingTimes && stats.popularBookingTimes.length > 0 && (
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Popular Booking Times
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.popularBookingTimes}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                )}

                {/* Ratings Summary */}
                {stats.averageRating !== undefined && (
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Ratings Summary
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <Rating 
                                        value={stats.averageRating} 
                                        precision={0.5} 
                                        readOnly 
                                    />
                                    <Typography variant="body2" sx={{ ml: 1 }}>
                                        ({stats.averageRating.toFixed(1)})
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    Average Rating
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Container>
    );
};

export default UserDashboard; 