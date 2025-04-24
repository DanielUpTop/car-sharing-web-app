import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/express';
import pool from '../config/database';
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-key-123';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        
        if (!decoded.userId) {
            return res.status(401).json({ message: 'Invalid token format' });
        }

        const [rows]: any = await pool.query(
            'SELECT id, email, role FROM users WHERE id = ?',
            [decoded.userId]
        );
        
        if (!rows || rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        const user = rows[0];
        req.user = {
            id: user.id,
            role: user.role
        };
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    
    next();
}; 