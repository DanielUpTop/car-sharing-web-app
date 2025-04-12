import axios from 'axios';

export const sendBookingNotification = async (bookingId: number, type: 'reminder' | 'confirmation' | 'cancellation') => {
    try {
        await axios.post(`/api/notifications/booking/${bookingId}`, { type });
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
}; 