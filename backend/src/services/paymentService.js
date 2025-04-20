const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
    static async createPaymentLink(amount, bookingData) {
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `Car Rental: ${bookingData.car.make} ${bookingData.car.model}`,
                            description: `Booking from ${bookingData.startDate} to ${bookingData.endDate}`,
                        },
                        unit_amount: amount * 100, // Convert to pence
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                metadata: {
                    bookingId: bookingData.bookingId,
                    userId: bookingData.userId,
                    carId: bookingData.carId,
                }
            });

            return session.url;
        } catch (error) {
            console.error('Error creating payment link:', error);
            throw new Error('Failed to create payment link');
        }
    }

    static async verifyPayment(sessionId) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            
            if (session.payment_status === 'paid') {
                return {
                    success: true,
                    metadata: session.metadata
                };
            }
            
            return {
                success: false,
                message: 'Payment not completed'
            };
        } catch (error) {
            console.error('Error verifying payment:', error);
            throw new Error('Failed to verify payment');
        }
    }
}

module.exports = PaymentService; 