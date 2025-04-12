import React from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';

interface ActivityLog {
    id: number;
    user_id: number;
    action: string;
    details: string;
    timestamp: string;
}

interface Props {
    logs: ActivityLog[];
}

const UserActivityLogs = ({ logs }: Props) => {
    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                User Activity Logs
            </Typography>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Action</TableCell>
                            <TableCell>Details</TableCell>
                            <TableCell>Timestamp</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{log.action}</TableCell>
                                <TableCell>{log.details}</TableCell>
                                <TableCell>
                                    {new Date(log.timestamp).toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default UserActivityLogs; 