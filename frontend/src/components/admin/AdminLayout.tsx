import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    Avatar,
    Menu,
    MenuItem,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    DirectionsCar as CarIcon,
    People as PeopleIcon,
    BookOnline as BookingIcon,
    Assessment as AnalyticsIcon,
    AccountCircle,
    ChevronLeft,
    ChevronRight,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const AdminLayout = () => {
    const theme = useTheme();
    const [open, setOpen] = useState(true);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleDrawerToggle = () => {
        setOpen(!open);
    };

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
        { text: 'Car Management', icon: <CarIcon />, path: '/admin/cars' },
        { text: 'User Management', icon: <PeopleIcon />, path: '/admin/users' },
        { text: 'Booking Management', icon: <BookingIcon />, path: '/admin/bookings' },
        { text: 'Analytics', icon: <AnalyticsIcon />, path: '/admin/analytics' },
    ];

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    zIndex: theme.zIndex.drawer + 1,
                    transition: theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    ...(open && {
                        marginLeft: drawerWidth,
                        width: `calc(100% - ${drawerWidth}px)`,
                        transition: theme.transitions.create(['width', 'margin'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    }),
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="toggle drawer"
                        onClick={handleDrawerToggle}
                        edge="start"
                        sx={{ marginRight: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                        Car Sharing Admin
                    </Typography>
                    <IconButton
                        color="inherit"
                        onClick={handleProfileMenuOpen}
                        sx={{ ml: 2 }}
                    >
                        <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                            {user?.first_name?.[0]}
                        </Avatar>
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleProfileMenuClose}
                    >
                        <MenuItem onClick={handleLogout}>
                            <ListItemIcon>
                                <LogoutIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Logout</ListItemText>
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="temporary"
                open={open}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile
                }}
                sx={{
                    display: { xs: 'block' },
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
            >
                <Toolbar />
                <List>
                    {menuItems.map((item) => (
                        <ListItem
                            button
                            key={item.text}
                            onClick={() => {
                                navigate(item.path);
                                handleDrawerToggle();
                            }}
                            selected={location.pathname === item.path}
                            sx={{
                                minHeight: 48,
                                px: 2.5,
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 0, mr: 3 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItem>
                    ))}
                </List>
            </Drawer>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: '100%',
                    marginTop: theme.spacing(8),
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default AdminLayout; 