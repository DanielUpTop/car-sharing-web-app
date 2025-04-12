export interface Car {
    id: number;
    make: string;
    model: string;
    year: number;
    registration_number: string;
    price_per_hour: number;
    type: 'electric' | 'hybrid' | 'petrol';
    availability_status: 'available' | 'booked' | 'maintenance';
    image_url?: string;
    location?: string;
    seats?: number;
    daily_rate?: number;
}

export interface AddCarDialogProps {
    open: boolean;
    onClose: () => void;
    onCarAdded: () => void;
}

export interface EditCarDialogProps {
    open: boolean;
    onClose: () => void;
    car: Car;
    onCarUpdated: () => void;
} 