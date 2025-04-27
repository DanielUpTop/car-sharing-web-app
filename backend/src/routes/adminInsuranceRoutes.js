const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const Insurance = require('../models/insuranceModel');
const db = require('../config/dbConfig');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Middleware to ensure user is authenticated and has admin role
router.use(authenticateToken, authorizeAdmin);

// Log all requests to this router
router.use((req, res, next) => {
    logger.info(`Admin insurance route accessed: ${req.method} ${req.path}`);
    next();
});

// Get all insurance claims for admin
router.get('/claims', async (req, res) => {
    console.log('Admin insurance claims route accessed');
    try {
        // Query to get all claims with related information
        console.log('Executing claims query...');
        const [claims] = await db.query(`
            SELECT ic.*, ip.coverage_type, ip.coverage_amount,
                   b.user_id, b.start_date as booking_start, b.end_date as booking_end,
                   c.make, c.model, u.email as user_email, u.first_name, u.last_name,
                   (SELECT COUNT(*) FROM claim_documents WHERE claim_id = ic.id) as document_count
            FROM insurance_claims ic
            JOIN insurance_policies ip ON ic.policy_id = ip.id
            JOIN bookings b ON ip.booking_id = b.id
            JOIN cars c ON b.car_id = c.id
            JOIN users u ON b.user_id = u.id
            ORDER BY ic.created_at DESC
        `);
        
        console.log(`Found ${claims.length} claims`);
        res.status(200).json(claims);
    } catch (error) {
        console.error('Error in admin claims route:', error);
        logger.error('Error fetching admin insurance claims:', error);
        res.status(500).json({ message: 'Error fetching insurance claims' });
    }
});

// Get claim by ID with documents
router.get('/claims/:id', async (req, res) => {
    try {
        const claimId = req.params.id;
        
        // Get claim details
        const claim = await Insurance.getClaimById(claimId);
        
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }
        
        // Get claim documents
        const [documents] = await db.query(
            `SELECT * FROM claim_documents WHERE claim_id = ?`,
            [claimId]
        );
        
        res.status(200).json({
            claim,
            documents
        });
    } catch (error) {
        logger.error('Error fetching claim details:', error);
        res.status(500).json({ message: 'Error fetching claim details' });
    }
});

// Update claim status
router.put('/claims/:id/status', async (req, res) => {
    try {
        const claimId = req.params.id;
        const { status, admin_notes } = req.body;
        
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        
        // Validate status
        const validStatuses = ['pending', 'approved', 'rejected', 'paid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status. Must be one of: pending, approved, rejected, paid' 
            });
        }
        
        // Update status
        await Insurance.updateClaimStatus(claimId, status);
        
        // If admin notes provided, update them too
        if (admin_notes) {
            await db.query(
                `UPDATE insurance_claims SET admin_notes = ? WHERE id = ?`,
                [admin_notes, claimId]
            );
        }
        
        res.status(200).json({ 
            message: 'Claim status updated successfully',
            id: claimId,
            status,
            admin_notes
        });
    } catch (error) {
        logger.error('Error updating claim status:', error);
        res.status(500).json({ message: 'Error updating claim status' });
    }
});

// Get claim document
router.get('/claims/:claimId/documents/:documentId', async (req, res) => {
    try {
        const { claimId, documentId } = req.params;
        
        // Get document info
        const [documents] = await db.query(
            `SELECT * FROM claim_documents WHERE id = ? AND claim_id = ?`,
            [documentId, claimId]
        );
        
        if (!documents.length) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        const document = documents[0];
        const filePath = path.join(__dirname, '../../uploads/claims', document.file_path);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Document file not found' });
        }
        
        res.sendFile(filePath);
    } catch (error) {
        logger.error('Error fetching claim document:', error);
        res.status(500).json({ message: 'Error fetching claim document' });
    }
});

module.exports = router; 