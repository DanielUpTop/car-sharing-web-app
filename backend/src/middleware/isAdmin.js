const isAdmin = (req, res, next) => {
    console.log('[ADMIN-CHECK] Checking admin status...');
    console.log('[ADMIN-CHECK] User object:', req.user);
    console.log('[ADMIN-CHECK] User role:', req.user?.role);
    console.log('[ADMIN-CHECK] isAdmin flag:', req.user?.isAdmin);

    if (req.user && (req.user.role === 'admin' || req.user.isAdmin === true)) {
        console.log('[ADMIN-CHECK] Admin access granted');
        next();
    } else {
        console.log('[ADMIN-CHECK] Admin access denied');
        console.log('[ADMIN-CHECK] User details:', {
            exists: !!req.user,
            role: req.user?.role,
            isAdmin: req.user?.isAdmin
        });
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

module.exports = isAdmin; 