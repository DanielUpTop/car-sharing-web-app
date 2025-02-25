import React from 'react';
import { 
    AppBar, 
    Toolbar, 
    IconButton, 
    Typography,
    Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';

const Navbar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <AppBar position="fixed">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Car Sharing
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        color="inherit"
                        onClick={() => navigate('/profile')}
                        title="My Profile"
                    >
                        <PersonIcon />
                    </IconButton>
                    <IconButton
                        color="inherit"
                        onClick={() => navigate('/user-dashboard')}
                        title="My Dashboard"
                    >
                        <DashboardIcon />
                    </IconButton>
                    <IconButton
                        color="inherit"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <LogoutIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar; 