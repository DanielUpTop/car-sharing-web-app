import React, { useState } from 'react';
import { Button, Box, CircularProgress } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

interface ImageUploadProps {
    onImageUploaded: (imageUrl: string) => void;
    currentImage?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUploaded, currentImage }) => {
    const [uploading, setUploading] = useState(false);
    const { token } = useAuth();

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await axios.post(
                'http://localhost:5001/api/admin/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            onImageUploaded(response.data.imageUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {currentImage && (
                <img 
                    src={currentImage} 
                    alt="Car preview" 
                    style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }} 
                />
            )}
            <Button
                variant="outlined"
                component="label"
                startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                disabled={uploading}
            >
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileSelect}
                />
            </Button>
        </Box>
    );
};

export default ImageUpload; 