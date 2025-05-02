const express = require('express');
const router = express.Router();
const MembershipController = require('../controllers/membershipController');
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/isAdmin');
const db = require('../config/dbConfig');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Ensure Stripe secret key is in .env

// Initialize tables (admin only)
router.post('/initialize', authenticateToken, isAdmin, MembershipController.initializeTables);

// Create a new membership
router.post('/', authenticateToken, MembershipController.createMembership);

// Get user's active membership
router.get('/user/:userId', authenticateToken, MembershipController.getUserMembership);

// Get current authenticated user's membership
router.get('/', authenticateToken, MembershipController.getCurrentUserMembership);

// Upgrade membership for current user
router.post('/upgrade', authenticateToken, MembershipController.upgradeMembership);

// Update membership
router.put('/:membershipId', authenticateToken, MembershipController.updateMembership);

// Update auto-renew status for a specific membership
router.put('/:membershipId/autorenew', authenticateToken, MembershipController.updateAutoRenewStatus);

// Cancel membership
router.delete('/:membershipId', authenticateToken, MembershipController.cancelMembership);

// Get membership benefits
router.get('/benefits/:membershipType', MembershipController.getMembershipBenefits);

// Admin route to check for expired memberships
router.get('/check-expired', authenticateToken, isAdmin, MembershipController.checkExpiredMemberships);

// Admin routes
// Get all memberships (admin only)
router.get('/admin/all', authenticateToken, isAdmin, MembershipController.getAllMemberships);

// Update membership by ID (admin only)
router.put('/admin/update/:id', authenticateToken, isAdmin, MembershipController.updateMembershipById);

// Create membership for a user (admin only)
router.post('/admin/create', authenticateToken, isAdmin, MembershipController.createMembershipForUser);

// Delete membership (admin only)
router.delete('/admin/delete/:id', authenticateToken, isAdmin, MembershipController.deleteMembership);

// Get membership tiers available to users
router.get('/membership-tiers', authenticateToken, async (req, res) => {
    try {
        // Get only active tiers
        const [tiers] = await db.query(`
            SELECT * FROM membership_tiers
            WHERE is_active = TRUE
            ORDER BY price ASC
        `);
        
        // Transform benefits: handle if it's already an array or needs parsing
        const formattedTiers = tiers.map(tier => {
            let finalBenefits = [];
            
            if (Array.isArray(tier.benefits)) {
                // Already an array, use it directly
                finalBenefits = tier.benefits;
            } else if (typeof tier.benefits === 'string') {
                // It's a string, try to parse it
                try {
                    finalBenefits = JSON.parse(tier.benefits || '[]');
                } catch (parseError) {
                    console.warn(`[Membership Tiers] Failed to parse benefits string for tier ${tier.id} (${tier.type}). Invalid JSON: ${tier.benefits}. Defaulting to empty array. Error: ${parseError.message}`);
                    // Keep finalBenefits as []
                }
            } else {
                 // It's null, undefined, or some other type - default to empty array
                console.warn(`[Membership Tiers] Benefits for tier ${tier.id} (${tier.type}) is not an array or string (${typeof tier.benefits}). Defaulting to empty array.`);
                finalBenefits = []; // Default
            }
            
            return {
                ...tier,
                price: parseFloat(tier.price), // Keep price conversion
                benefits: finalBenefits
            };
        });
        
        res.json(formattedTiers);
    } catch (error) {
        console.error('Error fetching membership tiers:', error);
        res.status(500).json({ message: 'Error fetching membership tiers' });
    }
});

// --- NEW: Create Stripe Checkout Session for Membership ---
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    const { membershipType } = req.body; // e.g., 'basic', 'premium'
    const userId = req.user.id;

    console.log(`[Checkout Session] User ${userId} requesting checkout for type: ${membershipType}`);

    if (!membershipType) {
        return res.status(400).json({ message: 'Membership type is required' });
    }

    try {
        // 1. Fetch the price for the selected membership tier from the database
        const [tiers] = await db.query('SELECT * FROM membership_tiers WHERE type = ? AND is_active = TRUE', [membershipType]);
        
        if (!tiers.length) {
            console.error(`[Checkout Session] Active membership tier type '${membershipType}' not found in DB.`);
            return res.status(404).json({ message: `Membership tier '${membershipType}' not found or not active.` });
        }
        
        const selectedTier = tiers[0];
        // Stripe expects price in the smallest currency unit (e.g., pence for GBP)
        const priceInPence = Math.round(parseFloat(selectedTier.price) * 100); 

        console.log(`[Checkout Session] Found tier: ${selectedTier.name}, Price: ${selectedTier.price}, Price in Pence: ${priceInPence}`);

        // Ensure price is valid
        if (isNaN(priceInPence) || priceInPence <= 0) {
             console.error(`[Checkout Session] Invalid price calculated for tier '${membershipType}': ${priceInPence}`);
             return res.status(500).json({ message: 'Invalid price configuration for membership tier.' });
        }

        // 2. Define URLs for Stripe redirection
        const successUrl = `${process.env.CLIENT_URL}/memberships/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${process.env.CLIENT_URL}/memberships?cancelled=true`;
        
        console.log(`[Checkout Session] Success URL: ${successUrl}`);
        console.log(`[Checkout Session] Cancel URL: ${cancelUrl}`);

        // 3. Create a Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp', // Adjust currency if needed
                        product_data: {
                            name: `${selectedTier.name} Membership`,
                            description: selectedTier.description || `Monthly subscription for ${selectedTier.name} benefits.`,
                        },
                        unit_amount: priceInPence,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // Use 'subscription' for recurring payments later if needed
            success_url: successUrl,
            cancel_url: cancelUrl,
            // Associate the session with the user and selected plan
            metadata: {
                userId: userId,
                membershipType: membershipType,
                tierId: selectedTier.id, // Store tier ID for convenience
            },
             client_reference_id: userId // Another way to link session to user
        });
        
        console.log(`[Checkout Session] Created Stripe Session ID: ${session.id} for User ${userId}`);

        // 4. Return the session ID to the frontend
        res.json({ sessionId: session.id });

    } catch (error) {
        console.error('[Checkout Session] Error creating Stripe checkout session:', error);
        res.status(500).json({ message: 'Error creating payment session', error: error.message });
    }
});

// --- NEW: Handle successful payment redirect from Stripe ---
router.get('/checkout-success', authenticateToken, async (req, res) => {
    const sessionId = req.query.session_id;
    const userId = req.user.id; // Verify against authenticated user

    console.log(`[Checkout Success] Received request for Session ID: ${sessionId}, User ID: ${userId}`);

    if (!sessionId) {
        console.warn('[Checkout Success] Missing session_id query parameter.');
        return res.status(400).redirect(`${process.env.CLIENT_URL}/memberships?error=session_missing`);
    }

    const connection = await db.getConnection();
    try {
        // Retrieve the session details from Stripe to verify payment & get metadata
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        console.log('[Checkout Success] Retrieved Stripe Session:', { 
             id: session.id, 
             payment_status: session.payment_status, 
             client_reference_id: session.client_reference_id,
             metadata: session.metadata 
        });

        // Verify the session belongs to the logged-in user (using metadata or client_reference_id)
        if (session.metadata?.userId !== String(userId) && session.client_reference_id !== String(userId)) {
            console.error(`[Checkout Success] User ID mismatch! Session User: ${session.metadata?.userId || session.client_reference_id}, Authenticated User: ${userId}`);
            return res.status(403).redirect(`${process.env.CLIENT_URL}/memberships?error=user_mismatch`);
        }
        
        // Check payment status
        if (session.payment_status === 'paid') {
            console.log(`[Checkout Success] Payment confirmed for session ${sessionId}.`);
            const membershipType = session.metadata.membershipType;
            // const tierId = session.metadata.tierId; // No longer needed here
            // const sessionUserId = parseInt(session.metadata.userId || session.client_reference_id, 10); // No longer needed here

            // REMOVED DATABASE UPDATE LOGIC - This should be handled by the webhook
            /*
            await connection.beginTransaction();

            // 1. Deactivate any existing active/pending memberships for the user
            console.log(`[Checkout Success] Deactivating existing memberships for user ${sessionUserId}.`);
             await connection.query(
                'UPDATE memberships SET status = ?, end_date = NOW() WHERE user_id = ? AND status IN (?, ?)',
                ['cancelled', sessionUserId, 'active', 'pending'] // Consider cancelling 'pending' ones too
            );

            // 2. Create the new active membership record
             const startDate = new Date();
             // Simple monthly membership for now
             const endDate = new Date(startDate);
             endDate.setMonth(endDate.getMonth() + 1); 

             console.log(`[Checkout Success] Inserting new membership: User=${sessionUserId}, Type=${membershipType}, Start=${startDate.toISOString()}, End=${endDate.toISOString()}`);
            
            const [insertResult] = await connection.query(
                `INSERT INTO memberships (user_id, type, status, start_date, end_date, auto_renew, stripe_session_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                 [sessionUserId, membershipType, 'active', startDate, endDate, true, sessionId] // Default auto_renew to true? Decide policy.
            );
            
            // Optional: Link to membership_tiers table if you have a foreign key
            // await connection.query('UPDATE memberships SET membership_tier_id = ? WHERE id = ?', [tierId, insertResult.insertId]);

            await connection.commit();
            console.log(`[Checkout Success] New membership (ID: ${insertResult.insertId}) created for user ${sessionUserId}. Transaction committed.`);
            */

            // Redirect user to a success page in the frontend, passing the type for UI feedback/retry
             console.log(`[Checkout Success] Redirecting user ${userId} to success page with type ${membershipType}.`);
            return res.redirect(`${process.env.CLIENT_URL}/memberships?payment_success=true&type=${membershipType}`);
        } else {
            console.warn(`[Checkout Success] Payment status for session ${sessionId} is not 'paid' (Status: ${session.payment_status}).`);
            // Redirect user to a failure/pending page or back to memberships
             return res.redirect(`${process.env.CLIENT_URL}/memberships?payment_failed=true`);
        }

    } catch (error) {
        await connection.rollback();
        console.error('[Checkout Success] Error handling checkout success:', error);
        // Redirect user to an error page
        res.status(500).redirect(`${process.env.CLIENT_URL}/memberships?error=server_error`);
    } finally {
        connection.release();
    }
});

// --- NEW: Handle cancelled payment redirect from Stripe ---
router.get('/checkout-cancelled', authenticateToken, (req, res) => {
    // Simply redirect back to the membership page with a flag
    console.log(`[Checkout Cancelled] User ${req.user.id} cancelled the checkout process.`);
    res.redirect(`${process.env.CLIENT_URL}/memberships?cancelled=true`);
});

// Update auto-renew setting
router.put('/:membershipId/autorenew', authenticateToken, async (req, res) => {
    const { membershipId } = req.params;
    const { auto_renew } = req.body;
    const userId = req.user.id;

     if (typeof auto_renew !== 'boolean') {
        return res.status(400).json({ message: 'Invalid auto_renew value. Must be true or false.' });
    }

    try {
        const [result] = await db.query(
            'UPDATE memberships SET auto_renew = ? WHERE id = ? AND user_id = ?',
            [auto_renew, membershipId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Membership not found or does not belong to user.' });
        }

        res.json({ message: `Auto-renew setting updated successfully to ${auto_renew}.` });
    } catch (error) {
        console.error('Error updating auto-renew setting:', error);
        res.status(500).json({ message: 'Failed to update auto-renew setting' });
    }
});

// Cancel membership (stops auto-renewal, doesn't necessarily end immediately)
router.put('/cancel', authenticateToken, async (req, res) => {
     const userId = req.user.id;

    try {
        const [result] = await db.query(
            'UPDATE memberships SET auto_renew = ?, status = ? WHERE user_id = ? AND status = ?',
            [false, 'cancelled', userId, 'active'] // Set auto_renew false and status to cancelled
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No active membership found to cancel.' });
        }

        res.json({ message: 'Membership cancelled successfully. Benefits remain until the end date.' });
    } catch (error) {
        console.error('Error cancelling membership:', error);
        res.status(500).json({ message: 'Failed to cancel membership' });
    }
});

module.exports = router; 