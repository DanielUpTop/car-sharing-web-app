const Cancellation = require('../models/cancellationModel');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const MembershipUtils = require('../utils/membershipUtils');

class CancellationService {
    /**
     * Process booking cancellation with appropriate fees based on membership
     * @param {number} userId - User ID
     * @param {number} bookingId - Booking ID to cancel
     * @param {string} reason - Reason for cancellation
     * @returns {Promise<Object>} Cancellation details with refund amount
     */
    static async processCancellation(userId, bookingId, reason) {
        // Get booking details
        const booking = await Booking.getBookingById(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }
        
        // Check if booking belongs to user
        if (booking.user_id !== userId) {
            throw new Error('Unauthorized: Booking does not belong to this user');
        }
        
        // Check if booking is already cancelled
        if (booking.status === 'cancelled') {
            throw new Error('Booking is already cancelled');
        }
        
        // Check if booking start date is in the past
        const startDate = new Date(booking.start_date);
        const now = new Date();
        if (startDate < now) {
            throw new Error('Cannot cancel bookings that have already started');
        }
        
        // Get user's membership details
        const user = await User.getUserById(userId);
        const membershipTier = user.membership_tier || 'STANDARD';
        
        // Calculate refund amount based on cancellation policy and membership tier
        const { refundAmount, isFree } = await this.calculateRefundAmount(booking, membershipTier, userId);
        
        // Record cancellation
        await Cancellation.createCancellation({
            bookingId,
            userId,
            isFree,
            reason,
            refundAmount
        });
        
        // Update booking status
        await Booking.updateBookingStatus(bookingId, 'cancelled');
        
        return {
            booking,
            refundAmount,
            isFree,
            message: isFree ? 
                'Booking cancelled using free cancellation benefit' : 
                `Booking cancelled with a refund of ${refundAmount}`
        };
    }
    
    /**
     * Calculate refund amount based on cancellation policy and membership
     * @param {Object} booking - Booking details
     * @param {string} membershipTier - User's membership tier
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Refund amount and whether it's a free cancellation
     */
    static async calculateRefundAmount(booking, membershipTier, userId) {
        const startDate = new Date(booking.start_date);
        const now = new Date();
        const hoursUntilStart = (startDate - now) / (1000 * 60 * 60);
        const totalAmount = parseFloat(booking.total_price);
        
        // Check if user is eligible for free cancellation
        const isEligibleForFreeCancellation = await MembershipUtils.isEligibleForFreeCancellation(userId);
        
        // If eligible for free cancellation, refund full amount
        if (isEligibleForFreeCancellation) {
            return {
                refundAmount: totalAmount,
                isFree: true
            };
        }
        
        // Standard cancellation policy
        let refundPercentage = 0;
        
        // More than 72 hours before start: 90% refund
        if (hoursUntilStart >= 72) {
            refundPercentage = 0.9;
        } 
        // Between 48 and 72 hours: 70% refund
        else if (hoursUntilStart >= 48) {
            refundPercentage = 0.7;
        } 
        // Between 24 and 48 hours: 50% refund
        else if (hoursUntilStart >= 24) {
            refundPercentage = 0.5;
        } 
        // Less than 24 hours: 0% refund for standard, 25% for GOLD, 50% for PLATINUM
        else {
            if (membershipTier === 'PLATINUM') {
                refundPercentage = 0.5;
            } else if (membershipTier === 'GOLD') {
                refundPercentage = 0.25;
            } else {
                refundPercentage = 0;
            }
        }
        
        // Apply additional membership discount to refund
        const membershipDiscount = MembershipUtils.getDiscountPercentage(userId) / 100;
        refundPercentage = Math.min(1, refundPercentage + (membershipDiscount * 0.1));
        
        const refundAmount = totalAmount * refundPercentage;
        
        return {
            refundAmount: parseFloat(refundAmount.toFixed(2)),
            isFree: false
        };
    }
    
    /**
     * Get user's cancellation history
     * @param {number} userId - User ID
     * @returns {Promise<Array>} User's cancellation history
     */
    static async getUserCancellationHistory(userId) {
        return Cancellation.getUserCancellations(userId);
    }
    
    /**
     * Get user's remaining free cancellations
     * @param {number} userId - User ID
     * @returns {Promise<number>} Number of remaining free cancellations
     */
    static async getRemainingFreeCancellations(userId) {
        return MembershipUtils.getRemainingFreeCancellations(userId);
    }
}

module.exports = CancellationService; 