/**
 * Membership tier utility functions for enforcing restrictions and privileges
 */

export type MembershipType = 'basic' | 'premium' | 'platinum' | null;

// Maximum cancellations allowed per month by tier
export const MAX_CANCELLATIONS: Record<string, number> = {
    basic: 1,
    premium: 3,
    platinum: 999, // Unlimited for practical purposes
};

// Discount rates by membership tier (percentage)
export const DISCOUNT_RATES: Record<string, number> = {
    basic: 5,
    premium: 10,
    platinum: 15,
    null: 0, // No discount for non-members
};

// Insurance coverage limits by tier
export const INSURANCE_COVERAGE: Record<string, number> = {
    basic: 500,
    premium: 1000,
    platinum: 2000,
    null: 0, // No coverage for non-members
};

// Priority level by tier (higher is better)
export const BOOKING_PRIORITY: Record<string, number> = {
    basic: 1,
    premium: 2,
    platinum: 3,
    null: 0, // Lowest priority for non-members
};

/**
 * Check if user can make a cancellation based on their tier and usage
 * @param type Membership type
 * @param usedCancellations Number of cancellations used this month
 * @returns Whether the user can cancel
 */
export const canCancelBooking = (type: MembershipType, usedCancellations: number): boolean => {
    if (type === null) return false; // Non-members can't cancel for free
    return usedCancellations < (MAX_CANCELLATIONS[type] || 0);
};

/**
 * Calculate the price with membership discount applied
 * @param basePrice Original price
 * @param type Membership type
 * @returns Discounted price
 */
export const applyMembershipDiscount = (basePrice: number, type: MembershipType): number => {
    const discountRate = DISCOUNT_RATES[type || 'null'] || 0;
    const discountMultiplier = 1 - (discountRate / 100);
    return basePrice * discountMultiplier;
};

/**
 * Get the maximum insurance coverage amount based on membership
 * @param type Membership type
 * @returns Maximum coverage amount
 */
export const getMaxInsuranceCoverage = (type: MembershipType): number => {
    return INSURANCE_COVERAGE[type || 'null'] || 0;
};

/**
 * Get the priority level for bookings based on membership
 * @param type Membership type
 * @returns Priority level (higher is better)
 */
export const getBookingPriority = (type: MembershipType): number => {
    return BOOKING_PRIORITY[type || 'null'] || 0;
};

/**
 * Check if a user has access to premium customer support
 * @param type Membership type
 * @returns Whether user has access to premium support
 */
export const hasPremiumSupport = (type: MembershipType): boolean => {
    return type === 'premium' || type === 'platinum';
};

/**
 * Get the membership benefit description
 * @param type Membership type
 * @returns Array of benefit descriptions
 */
export const getMembershipBenefits = (type: MembershipType): string[] => {
    if (type === null) {
        return [
            'Standard booking access',
            'Basic support via email',
            'Standard pricing'
        ];
    }
    
    const benefits = [
        `${DISCOUNT_RATES[type]}% discount on rentals`,
    ];
    
    if (type === 'basic') {
        benefits.push(
            'Basic insurance coverage',
            'Standard booking priority',
            '1 free cancellation per month'
        );
    } else if (type === 'premium') {
        benefits.push(
            'Enhanced insurance coverage',
            'Priority booking',
            '3 free cancellations per month',
            '24/7 customer support'
        );
    } else if (type === 'platinum') {
        benefits.push(
            'Premium insurance coverage',
            'VIP booking priority',
            'Unlimited free cancellations',
            'Dedicated customer support'
        );
    }
    
    return benefits;
}; 