import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: (status: string) => void;
    currentStatus: string;
}

const UserStatusDialog = ({ open, onClose, onConfirm, currentStatus }: Props) => {
    const [status, setStatus] = React.useState(currentStatus);

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Update User Status</DialogTitle>
            <DialogContent>
                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={status}
                        label="Status"
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="blocked">Blocked</MenuItem>
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={() => onConfirm(status)} color="primary">
                    Update
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserStatusDialog; 