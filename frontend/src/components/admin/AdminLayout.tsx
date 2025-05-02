import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
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
    CircularProgress,
    Alert,
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
    ChatBubble as ChatIcon,
    ConfirmationNumber as TicketIcon,
    CardMembership as CardMembershipIcon,
    Security as SecurityIcon,
    Warning as WarningIcon,
    EmojiEvents as RewardsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const AdminLayout = () => {
    const theme = useTheme();
    const [open, setOpen] = useState(true);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, loading } = useAuth();

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
        { text: 'Membership Management', icon: <CardMembershipIcon />, path: '/admin/members' },
        { text: 'Rewards Management', icon: <RewardsIcon />, path: '/admin/rewards' },
        { text: 'Insurance Management', icon: <SecurityIcon />, path: '/admin/insurance' },
        { text: 'Analytics', icon: <AnalyticsIcon />, path: '/admin/analytics' },
        { text: 'Live Chat Archive', icon: <ChatIcon />, path: '/admin/chat-archive' },
        { text: 'Support Tickets', icon: <TicketIcon />, path: '/admin/tickets' },
    ];

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        console.error("[AdminLayout] No user found after loading. Redirecting to login.");
        return <Navigate to="/login" replace />;
    }

    if (user && user.role !== 'admin') {
        console.warn(`[AdminLayout] User role '${user.role}' is not authorized for admin area.`);
        return (
             <Box sx={{ display: 'flex', height: '100vh' }}>
                <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
                     <Toolbar>
                         <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                             Car Sharing Admin - Unauthorized
                         </Typography>
                        <IconButton color="inherit" onClick={handleLogout} title="Logout">
                            <LogoutIcon />
                         </IconButton>
                     </Toolbar>
                 </AppBar>
                 <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px' }}>
                    <Alert severity="error" icon={<WarningIcon />}>
                        You do not have permission to access this area. Your role is '{user.role}'.
                    </Alert>
                 </Box>
            </Box>
        );
    }
    
    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
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
                                // handleDrawerToggle(); // Temporarily comment out drawer toggle
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
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    mt: '64px',
                    overflow: 'auto'
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default AdminLayout; 