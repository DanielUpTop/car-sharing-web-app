interface Booking {
  customer: string;
  car: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: string;
  bookedOn: Date;
}

class BookingManagement {
  // Fix 1: Ensure proper data binding
  private bookings: Booking[] = [];

  async fetchBookings() {
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();
      this.bookings = data.map((booking: any) => ({
        customer: booking.customer || '',
        car: booking.car || '',
        startDate: new Date(booking.startDate),
        endDate: new Date(booking.endDate),
        totalPrice: booking.totalPrice || 0,
        status: booking.status || '',
        bookedOn: new Date(booking.bookedOn)
      }));
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }
} 