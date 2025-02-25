import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import { ListAlt as ListAltIcon } from '@mui/icons-material';

const Dashboard: React.FC = () => {
    return (
        <div>
            {/* Add a button or link to navigate to bookings */}
            <Button
                component={Link}
                to="/bookings"
                variant="contained"
                startIcon={<ListAltIcon />}
            >
                My Bookings
            </Button>
        </div>
    );
};

export default Dashboard; 