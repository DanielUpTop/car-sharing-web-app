import React from 'react';
import {
    Box,
    Paper,
    Typography,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface ChartData {
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
}

interface Props {
    data: ChartData;
}

const InteractiveCharts = ({ data }: Props) => {
    const [chartView, setChartView] = React.useState('seasonal');

    const handleViewChange = (event: React.MouseEvent<HTMLElement>, newView: string) => {
        if (newView !== null) {
            setChartView(newView);
        }
    };

    const renderSeasonalTrends = () => (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.seasonalTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
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
                    dataKey="revenue"
                    stroke="#82ca9d"
                    name="Revenue"
                />
            </LineChart>
        </ResponsiveContainer>
    );

    const renderHourlyDistribution = () => (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookings" fill="#8884d8" name="Bookings" />
                <Bar dataKey="avgRevenue" fill="#82ca9d" name="Avg Revenue" />
            </BarChart>
        </ResponsiveContainer>
    );

    const renderWeekdayAnalysis = () => (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.weekdayAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookings" fill="#8884d8" name="Bookings" />
                <Bar dataKey="utilization" fill="#82ca9d" name="Utilization %" />
            </BarChart>
        </ResponsiveContainer>
    );

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Trend Analysis
                </Typography>
                <ToggleButtonGroup
                    value={chartView}
                    exclusive
                    onChange={handleViewChange}
                    aria-label="chart view"
                >
                    <ToggleButton value="seasonal">
                        Seasonal Trends
                    </ToggleButton>
                    <ToggleButton value="hourly">
                        Hourly Distribution
                    </ToggleButton>
                    <ToggleButton value="weekday">
                        Weekday Analysis
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {chartView === 'seasonal' && renderSeasonalTrends()}
            {chartView === 'hourly' && renderHourlyDistribution()}
            {chartView === 'weekday' && renderWeekdayAnalysis()}
        </Paper>
    );
};

export default InteractiveCharts; 