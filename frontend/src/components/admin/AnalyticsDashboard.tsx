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
    CircularProgress,
    Button,
    Stack
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Remove as StableIcon,
    FileDownload as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import InteractiveCharts from './charts/InteractiveCharts';

interface AnalyticsData {
    revenue: {
        total: number;
        growth: number;
        forecast: number;
    };
    utilization: {
        total: number;
        byType: {
            [key: string]: number;
        };
    };
    customerMetrics: {
        totalCustomers: number;
        activeCustomers: number;
        customerRetention: number;
    };
    performance: {
        mostProfitableCars: Array<{
            make: string;
            model: string;
            revenue: number;
        }>;
        leastUtilizedCars: Array<{
            make: string;
            model: string;
            utilization: number;
        }>;
    };
    trends: {
        seasonalTrends: Array<{
            month: string;
            bookings: number;
            revenue: number;
            utilization: number;
        }>;
        hourlyDistribution: Array<{
            hour: string;
            bookings: number;
            avgRevenue: number;
        }>;
        weekdayAnalysis: Array<{
            day: string;
            bookings: number;
            utilization: number;
        }>;
    };
}

const AnalyticsDashboard = () => {
    const [timeFrame, setTimeFrame] = useState('month');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        fetchAnalytics();
    }, [timeFrame, token]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `http://localhost:5001/api/admin/analytics?timeFrame=${timeFrame}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setData(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = () => {
        if (!data) return;
        
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text('Analytics Report', 20, 20);
        doc.setFontSize(12);
        doc.text(`Period: ${timeFrame}`, 20, 30);

        // Revenue Section
        doc.text('Revenue Metrics', 20, 45);
        const revenueData = [
            ['Total Revenue', `£${data.revenue.total.toFixed(2)}`],
            ['Growth', `${data.revenue.growth}%`],
            ['Forecast', `£${data.revenue.forecast.toFixed(2)}`]
        ];
        (doc as any).autoTable({
            startY: 50,
            head: [['Metric', 'Value']],
            body: revenueData
        });

        // Utilization Section
        doc.text('Fleet Utilization', 20, (doc as any).previousAutoTable.finalY + 15);
        const utilizationData = [
            ['Total Utilization', `${data.utilization.total}%`],
            ...Object.entries(data.utilization.byType).map(([type, value]) => [type, `${value}%`])
        ];
        (doc as any).autoTable({
            startY: (doc as any).previousAutoTable.finalY + 20,
            head: [['Category', 'Utilization']],
            body: utilizationData
        });

        doc.save('analytics-report.pdf');
    };

    const exportToCSV = () => {
        if (!data) return;

        const csvData = [
            ['Analytics Report'],
            [`Period: ${timeFrame}`],
            [],
            ['Revenue Metrics'],
            ['Total Revenue', data.revenue.total],
            ['Growth', data.revenue.growth],
            ['Forecast', data.revenue.forecast],
            [],
            ['Fleet Utilization'],
            ['Total', data.utilization.total],
            ...Object.entries(data.utilization.byType).map(([type, value]) => [type, value]),
            [],
            ['Customer Metrics'],
            ['Total Customers', data.customerMetrics.totalCustomers],
            ['Active Customers', data.customerMetrics.activeCustomers],
            ['Retention Rate', data.customerMetrics.customerRetention],
            [],
            ['Most Profitable Cars'],
            ...data.performance.mostProfitableCars.map(car => [
                `${car.make} ${car.model}`,
                car.revenue
            ])
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, 'analytics-report.csv');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Analytics Dashboard</Typography>
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
                        onClick={exportToPDF}
                    >
                        Export PDF
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={exportToCSV}
                    >
                        Export CSV
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Revenue Metrics */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Revenue
                            </Typography>
                            <Typography variant="h4">
                                £{data?.revenue.total.toFixed(2) || '0.00'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                {
                                    typeof data?.revenue.growth === 'number' && data.revenue.growth !== 0 && (
                                        data.revenue.growth > 0 ? (
                                            <TrendingUpIcon color="success" />
                                        ) : (
                                            <TrendingDownIcon color="error" />
                                        )
                                    )
                                }
                                <Typography 
                                    color={
                                        typeof data?.revenue.growth === 'number' && data.revenue.growth > 0 ? 'success.main' : 
                                        typeof data?.revenue.growth === 'number' && data.revenue.growth < 0 ? 'error.main' : 
                                        'text.secondary' // Default color if 0 or not a number
                                    }
                                    sx={{ ml: 1 }}
                                >
                                    {
                                        typeof data?.revenue.growth === 'number' 
                                            ? `${data.revenue.growth >= 0 ? '+' : ''}${data.revenue.growth.toFixed(1)}% vs last month`
                                            : 'vs last month' // Or display '0.0% vs last month' or just '-'
                                    }
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Utilization Metrics */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Fleet Utilization
                            </Typography>
                            <Typography variant="h4">
                                {data?.utilization.total || 0}%
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                {Object.entries(data?.utilization.byType || {}).map(([type, value]) => (
                                    <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography>{type}</Typography>
                                        <Typography>{value}%</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Customer Metrics */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Customer Metrics
                            </Typography>
                            <Typography variant="h4">
                                {data?.customerMetrics.totalCustomers || 0}
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Typography>
                                    Active Customers: {data?.customerMetrics.activeCustomers || 0}
                                </Typography>
                                <Typography>
                                    Retention Rate: {data?.customerMetrics.customerRetention || 0}%
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Performance Insights */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Performance Insights
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Most Profitable Cars
                                </Typography>
                                {data?.performance.mostProfitableCars.map((car, index) => (
                                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography>
                                            {car.make} {car.model}
                                        </Typography>
                                        <Typography>
                                            £{car.revenue.toFixed(2)}
                                        </Typography>
                                    </Box>
                                ))}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Least Utilized Cars
                                </Typography>
                                {data?.performance.leastUtilizedCars.map((car, index) => (
                                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography>
                                            {car.make} {car.model}
                                        </Typography>
                                        <Typography>
                                            {car.utilization}%
                                        </Typography>
                                    </Box>
                                ))}
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <InteractiveCharts data={data?.trends || {
                        seasonalTrends: [],
                        hourlyDistribution: [],
                        weekdayAnalysis: []
                    }} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsDashboard; 