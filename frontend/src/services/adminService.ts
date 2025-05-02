import axios from 'axios';
import { User } from '../types'; // Assuming you have a User type defined

// Define a more specific type for the user list returned by the admin API
export interface AdminUserListItem {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    driving_license?: string; 
    date_of_birth?: string; // Dates are strings from JSON
    driving_license_expiry?: string; 
    driving_license_country?: string;
    address?: string;
    city?: string;
    postcode?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    role: 'admin' | 'rentee';
    status: 'active' | 'blocked';
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    reward_points?: number; // Re-add reward points field
}

// Define a type for the full user details (returned by findById)
export interface AdminUserDetails extends AdminUserListItem {
    driving_license?: string;
    date_of_birth?: string; // Represent as string initially, format as needed
    driving_license_expiry?: string;
    driving_license_country?: string;
    address?: string;
    city?: string;
    postcode?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    // Add other fields returned by User.findById if needed
}


const API_URL = '/api/admin'; // Adjust if your backend prefix is different

const getAuthHeaders = () => {
    const token = localStorage.getItem('token'); // Or however you store your auth token
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getAllUsersAdmin = async (): Promise<AdminUserListItem[]> => {
    const response = await axios.get(`${API_URL}/users`, getAuthHeaders());
    return response.data;
};

export const getUserByIdAdmin = async (userId: number): Promise<AdminUserDetails> => {
    const response = await axios.get(`${API_URL}/users/${userId}`, getAuthHeaders());
    return response.data;
};

// Type for the update payload - only include fields admin can change
export interface UpdateUserAdminPayload {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    driving_license?: string;
    date_of_birth?: string | null; // Allow null for clearing
    driving_license_expiry?: string | null;
    driving_license_country?: string;
    address?: string;
    city?: string;
    postcode?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    role?: 'admin' | 'rentee';
    status?: 'active' | 'blocked';
    is_verified?: boolean;
}


export const updateUserAdmin = async (userId: number, userData: UpdateUserAdminPayload): Promise<AdminUserDetails> => {
    const response = await axios.put(`${API_URL}/users/${userId}`, userData, getAuthHeaders());
    return response.data;
};

// Add the delete function
export const deleteUserAdmin = async (userId: number): Promise<void> => {
    await axios.delete(`${API_URL}/users/${userId}`, getAuthHeaders());
};

// Re-add reward points function (Admin)
export const addRewardPointsAdmin = async (userId: number, points: number): Promise<{ message: string; newPointsTotal: number }> => {
    const response = await axios.post<{ message: string; newPointsTotal: number }>(
        `${API_URL}/users/${userId}/points`,
        { points }, // Request body
        getAuthHeaders()
    );
    return response.data;
}; 