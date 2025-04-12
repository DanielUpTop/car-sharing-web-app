import React from 'react';
import { Link } from 'react-router-dom';
import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';

const Sidebar: React.FC = () => {
  return (
    <div>
      {/* Add this to your sidebar menu items */}
      <ListItem button component={Link} to="/dashboard/favorites">
        <ListItemIcon>
          <FavoriteIcon />
        </ListItemIcon>
        <ListItemText primary="My Favorites" />
      </ListItem>
    </div>
  );
};

export default Sidebar; 