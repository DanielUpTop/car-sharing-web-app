export interface Car {
    id?: number;  // Optional for new cars
    make: string;
    model: string;
    year: number;
    registration_number: string;
    daily_rate: number;
    price_per_hour: number;
    location: string;
    availability_status: 'available' | 'booked' | 'maintenance';
    image_url?: string;
    latitude: number;
    longitude: number;
    address: string;
    type: 'electric' | 'hybrid' | 'petrol';
    seats: number;
    rating: number;
}

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
}

export interface Booking {
    id: number;
    user_id: number;
    car_id: number;
    start_date: string;
    end_date: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    total_price: number;
    created_at: string;
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
    car: {
        make: string;
        model: string;
        registration_number: string;
    };
} 