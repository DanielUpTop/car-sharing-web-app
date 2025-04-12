import AdminDashboard from './AdminDashboard';
import CarManagement from './CarManagement';

interface AddCarDialogProps {
    open: boolean;
    onClose: () => void;
    onCarAdded: () => void;
}

interface EditCarDialogProps {
    open: boolean;
    onClose: () => void;
    car: Car;
    onCarUpdated: () => void;
}

interface Car {
    id: number;
    make: string;
    model: string;
    year: number;
    registration_number: string;
    daily_rate: number;
    price_per_hour: number;
    availability_status: string;
    type: string;
}

// Temporary placeholder components until we implement them
export const AddCarDialog: React.FC<AddCarDialogProps> = () => null;
export const EditCarDialog: React.FC<EditCarDialogProps> = () => null;

export { AdminDashboard, CarManagement }; 