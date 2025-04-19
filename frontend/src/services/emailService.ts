import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '');

interface EmailParams {
    to_name: string;
    to_email: string;
    verification_link: string;
    car_details?: {
        make: string;
        model: string;
        booking_date: string;
        total_price: number;
        address?: string;
    };
}

export const sendVerificationEmail = async (params: EmailParams) => {
    try {
        const templateParams = {
            to_name: params.to_name,
            to_email: params.to_email,
            verification_link: params.verification_link,
            from_name: 'Car Sharing Service',
            reply_to: 'noreply@carshare.com'
        };

        console.log('Sending email with params:', templateParams);

        const response = await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
            import.meta.env.VITE_EMAILJS_VERIFICATION_TEMPLATE_ID || '',
            templateParams
        );

        return response;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
};

export const sendBookingConfirmationEmail = async (params: EmailParams) => {
    try {
        if (!params.car_details) {
            throw new Error('Car details are required for booking confirmation');
        }

        // Validate required fields
        if (!params.to_name || !params.to_email) {
            throw new Error('Recipient name and email are required');
        }

        // Log the environment variables (masked)
        console.log('EmailJS Config:', {
            serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID ? '✓ Present' : '✗ Missing',
            templateId: import.meta.env.VITE_EMAILJS_BOOKING_TEMPLATE_ID ? '✓ Present' : '✗ Missing',
            publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY ? '✓ Present' : '✗ Missing'
        });

        // Ensure total_price is a number and format it
        const totalPrice = typeof params.car_details.total_price === 'number' 
            ? params.car_details.total_price 
            : Number(params.car_details.total_price);

        if (isNaN(totalPrice)) {
            throw new Error('Invalid total price value');
        }

        // Get start and end dates from the booking date string
        const [startDate, endDate] = params.car_details.booking_date.split(' - ');

        // Create template parameters exactly matching the EmailJS template
        const templateParams = {
            user_name: params.to_name,
            email: params.to_email,
            car_name: `${params.car_details.make} ${params.car_details.model}`,
            start_date: startDate,
            end_date: endDate || startDate,
            pickup_location: params.car_details.address || 'No location set for this vehicle',
            total_price: totalPrice.toFixed(2),
            booking_ref: `BOOK-${Date.now().toString().slice(-6)}`
        };

        console.log('Attempting to send booking confirmation email with params:', {
            ...templateParams,
            email: '***@***', // Mask email for privacy in logs
            pickup_location: params.car_details.address // Log the actual pickup location
        });

        if (!import.meta.env.VITE_EMAILJS_SERVICE_ID || !import.meta.env.VITE_EMAILJS_BOOKING_TEMPLATE_ID) {
            throw new Error('Email service configuration is missing');
        }

        const response = await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_BOOKING_TEMPLATE_ID,
            templateParams
        );

        console.log('Booking confirmation email sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending booking confirmation email:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to send booking confirmation email');
    }
}; 