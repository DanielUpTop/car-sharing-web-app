const isAdmin = (req, res, next) => {
    console.log('Checking admin authorization');
    console.log('Request user:', req.user);
    console.log('User role:', req.user?.role);

    if (req.user && req.user.role === 'admin') {
        console.log('Admin access granted');
        next();
    } else {
        console.log('Admin access denied');
        console.log('User details:', {
            exists: !!req.user,
            role: req.user?.role
        });
        res.status(403).json({ 
            message: 'Access denied. Admin only.',
            error: 'User does not have admin privileges'
        });
    }
};

module.exports = isAdmin; 