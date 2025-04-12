import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Stack,
    Tooltip,
    IconButton,
    Menu
} from '@mui/material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { FileDownload as DownloadIcon, FilterList as FilterIcon, Search as SearchIcon } from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    ChartTooltip,
    Legend,
    ArcElement
);

interface BookingStats {
    totalBookings: number;
    totalRevenue: number;
    averageBookingValue: number;
    bookingsByStatus: {
        pending: number;
        confirmed: number;
        completed: number;
        cancelled: number;
    };
    revenueByMonth: {
        [key: string]: number;
    };
    popularCars: {
        make: string;
        model: string;
        bookings: number;
    }[];
    topLocations: {
        location: string;
        bookings: number;
    }[];
    peakHours: {
        hour: number;
        bookings: number;
    }[];
    customerStats: {
        totalCustomers: number;
        newCustomers: number;
        returningCustomers: number;
    };
    comparativeStats: {
        current: {
            totalBookings: number;
            totalRevenue: number;
            averageBookingValue: number;
        };
        previous: {
            totalBookings: number;
            totalRevenue: number;
            averageBookingValue: number;
        };
    };
    forecast: {
        nextWeek: number;
        nextMonth: number;
        trend: 'increasing' | 'decreasing' | 'stable';
    };
}

const BookingAnalytics = () => {
    const [timeFrame, setTimeFrame] = useState('month');
    const [stats, setStats] = useState<BookingStats | null>(null);
    const { token } = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    useEffect(() => {
        fetchStats();
    }, [timeFrame, token]);

    const fetchStats = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5001/api/admin/bookings/stats?timeFrame=${timeFrame}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching booking stats:', error);
        }
    };

    const revenueChartData = {
        labels: stats?.revenueByMonth ? Object.keys(stats.revenueByMonth) : [],
        datasets: [
            {
                label: 'Revenue',
                data: stats?.revenueByMonth ? Object.values(stats.revenueByMonth) : [],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }
        ]
    };

    const statusChartData = {
        labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        datasets: [
            {
                data: stats ? [
                    stats.bookingsByStatus.pending,
                    stats.bookingsByStatus.confirmed,
                    stats.bookingsByStatus.completed,
                    stats.bookingsByStatus.cancelled
                ] : [],
                backgroundColor: [
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 99, 132, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }
        ]
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text('Booking Analytics Report', 20, 20);
        doc.setFontSize(12);
        doc.text(`Period: ${timeFrame}`, 20, 30);

        doc.text('Summary Statistics', 20, 45);
        const summaryData = [
            ['Total Bookings', stats?.totalBookings.toString() || '0'],
            ['Total Revenue', `£${stats?.totalRevenue.toFixed(2) || '0.00'}`],
            ['Average Booking Value', `£${stats?.averageBookingValue.toFixed(2) || '0.00'}`]
        ];
        doc.autoTable({
            startY: 50,
            head: [['Metric', 'Value']],
            body: summaryData
        });

        doc.text('Most Popular Cars', 20, doc.previousAutoTable.finalY + 15);
        const carData = stats?.popularCars.map(car => [
            `${car.make} ${car.model}`,
            car.bookings.toString()
        ]) || [];
        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 20,
            head: [['Car', 'Bookings']],
            body: carData
        });

        doc.save('booking-analytics.pdf');
    };

    const exportToCSV = () => {
        if (!stats) return;

        const csvData = [
            ['Booking Analytics Report'],
            [`Period: ${timeFrame}`],
            [],
            ['Summary Statistics'],
            ['Total Bookings', stats.totalBookings],
            ['Total Revenue', stats.totalRevenue],
            ['Average Booking Value', stats.averageBookingValue],
            [],
            ['Bookings by Status'],
            ['Pending', stats.bookingsByStatus.pending],
            ['Confirmed', stats.bookingsByStatus.confirmed],
            ['Completed', stats.bookingsByStatus.completed],
            ['Cancelled', stats.bookingsByStatus.cancelled],
            [],
            ['Popular Cars'],
            ...stats.popularCars.map(car => [`${car.make} ${car.model}`, car.bookings])
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, 'booking-analytics.csv');
    };

    const ForecastCard = ({ forecast }: { forecast: BookingStats['forecast'] }) => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Revenue Forecast
                </Typography>
                <Box sx={{ mt: 2 }}>
                    <Typography color="textSecondary">
                        Next Week: £{forecast.nextWeek.toFixed(2)}
                    </Typography>
                    <Typography color="textSecondary">
                        Next Month: £{forecast.nextMonth.toFixed(2)}
                    </Typography>
                    <Typography 
                        color={
                            forecast.trend === 'increasing' 
                                ? 'success.main' 
                                : forecast.trend === 'decreasing' 
                                    ? 'error.main' 
                                    : 'text.secondary'
                        }
                    >
                        Trend: {forecast.trend}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );

    const ComparativeStats = ({ stats }: { stats: BookingStats['comparativeStats'] }) => {
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return 100;
            return ((current - previous) / previous) * 100;
        };

        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Period Comparison
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="textSecondary">
                                Bookings Change
                            </Typography>
                            <Typography variant="h6">
                                {calculateChange(
                                    stats.current.totalBookings,
                                    stats.previous.totalBookings
                                ).toFixed(1)}%
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="textSecondary">
                                Revenue Change
                            </Typography>
                            <Typography variant="h6">
                                {calculateChange(
                                    stats.current.totalRevenue,
                                    stats.previous.totalRevenue
                                ).toFixed(1)}%
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Booking Analytics</Typography>
                <Stack direction="row" spacing={2}>
                    <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Time Frame</InputLabel>
                        <Select
                            value={timeFrame}
                            label="Time Frame"
                            onChange={(e) => setTimeFrame(e.target.value)}
                        >
                            <MenuItem value="week">Last Week</MenuItem>
                            <MenuItem value="month">Last Month</MenuItem>
                            <MenuItem value="year">Last Year</MenuItem>
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                    >
                        Export
                    </Button>
                </Stack>
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem onClick={() => { exportToPDF(); setAnchorEl(null); }}>
                    Export as PDF
                </MenuItem>
                <MenuItem onClick={() => { exportToCSV(); setAnchorEl(null); }}>
                    Export as CSV
                </MenuItem>
            </Menu>

            <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Bookings
                            </Typography>
                            <Typography variant="h4">
                                {stats?.totalBookings || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Revenue
                            </Typography>
                            <Typography variant="h4">
                                £{stats?.totalRevenue.toFixed(2) || '0.00'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Average Booking Value
                            </Typography>
                            <Typography variant="h4">
                                £{stats?.averageBookingValue.toFixed(2) || '0.00'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Revenue Over Time
                        </Typography>
                        <Bar data={revenueChartData} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Bookings by Status
                        </Typography>
                        <Pie data={statusChartData} />
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Most Popular Cars
                        </Typography>
                        <Grid container spacing={2}>
                            {stats?.popularCars.map((car, index) => (
                                <Grid item xs={12} sm={6} md={3} key={index}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6">
                                                {car.make} {car.model}
                                            </Typography>
                                            <Typography color="textSecondary">
                                                {car.bookings} bookings
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Grid>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Customer Statistics
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Customers
                                    </Typography>
                                    <Typography variant="h6">
                                        {stats?.customerStats.totalCustomers || 0}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="textSecondary">
                                        New Customers
                                    </Typography>
                                    <Typography variant="h6">
                                        {stats?.customerStats.newCustomers || 0}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="textSecondary">
                                        Returning Customers
                                    </Typography>
                                    <Typography variant="h6">
                                        {stats?.customerStats.returningCustomers || 0}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Peak Booking Hours
                            </Typography>
                            <Bar
                                data={{
                                    labels: stats?.peakHours.map(h => `${h.hour}:00`) || [],
                                    datasets: [{
                                        label: 'Bookings',
                                        data: stats?.peakHours.map(h => h.bookings) || [],
                                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                                        borderColor: 'rgba(75, 192, 192, 1)',
                                        borderWidth: 1
                                    }]
                                }}
                            />
                        </Paper>
                    </Grid>
                </Grid>

                <Grid item xs={12} md={6}>
                    <ForecastCard forecast={stats?.forecast || { nextWeek: 0, nextMonth: 0, trend: 'stable' }} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <ComparativeStats stats={stats?.comparativeStats || { current: { totalBookings: 0, totalRevenue: 0, averageBookingValue: 0 }, previous: { totalBookings: 0, totalRevenue: 0, averageBookingValue: 0 } }} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default BookingAnalytics; 