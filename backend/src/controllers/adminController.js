const User = require('../models/userModel');

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll();
        // Exclude password hashes before sending response
        const usersWithoutPassword = users.map(user => {
            const { password, ...userWithoutPass } = user;
            return userWithoutPass;
        });
        res.json(usersWithoutPassword);
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user by ID (Admin)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserByIdAdmin = async (req, res) => {
    try {
        // Using the existing findById which selects all necessary fields
        const user = await User.findById(req.params.id);
        
        if (user) {
            // Exclude password hash before sending response
            const { password, ...userWithoutPass } = user;
            res.json(userWithoutPass);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error in getUserByIdAdmin:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user (Admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUserAdmin = async (req, res) => {
    try {
        // Fetch user first to ensure they exist
        const userExists = await User.findById(req.params.id);
        if (!userExists) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Attempt to update the user with data from request body
        const wasUpdated = await User.adminUpdateUser(req.params.id, req.body);
        
        if (wasUpdated) {
            // Fetch the updated user data to return it
            const updatedUser = await User.findById(req.params.id);
            const { password, ...userWithoutPass } = updatedUser;
            res.json(userWithoutPass);
        } else {
            // This might happen if no valid fields were provided or data was the same
            res.status(400).json({ message: 'User not updated. Check input data.' }); 
        }
    } catch (error) {
        console.error('Error in updateUserAdmin:', error);
        // Handle specific errors like duplicate email
        if (error.message === 'Email address already in use.') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add reward points to a user (Admin)
// @route   POST /api/admin/users/:id/points
// @access  Private/Admin
const addPointsToUser = async (req, res) => {
    const { points } = req.body;
    const userId = req.params.id;

    // Basic validation
    if (typeof points !== 'number' || points <= 0 || !Number.isInteger(points)) {
        return res.status(400).json({ message: 'Invalid points value. Points must be a positive integer.' });
    }

    try {
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add the points
        const success = await User.addRewardPoints(userId, points);

        if (success) {
            // Fetch updated user data to return current points
            const updatedUser = await User.findById(userId);
            res.json({ 
                message: `Successfully added ${points} points to user ${userId}.`, 
                newPointsTotal: updatedUser.reward_points 
            });
        } else {
            // This case might be less likely if the user exists, but handle it
            res.status(500).json({ message: 'Failed to add points.' });
        }
    } catch (error) {
        console.error('Error in addPointsToUser:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAllUsers,
    getUserByIdAdmin,
    updateUserAdmin,
    addPointsToUser,
}; 