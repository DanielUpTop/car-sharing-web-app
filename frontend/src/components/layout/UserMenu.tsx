import React from 'react';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';

const UserMenu: React.FC = () => {
    const navigate = useNavigate();

    const handleClose = () => {
        // Implement the logic to close the menu
    };

    return (
        <MenuItem onClick={() => {
            handleClose();
            navigate('/profile');
        }}>
            <ListItemIcon>
                <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>My Profile</ListItemText>
        </MenuItem>
    );
};

export default UserMenu; 