import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                role: string;
            };
        }
    }
}

export interface AuthRequest extends Request {
    user: {
        id: number;
        role: string;
    };
} 