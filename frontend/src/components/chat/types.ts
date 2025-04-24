export interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    is_read: boolean;
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    created_at: string;
    sender: {
        first_name: string;
        last_name: string;
        role: string;
    };
}

export interface Conversation {
    id: number;
    user_id: number;
    subject: string;
    status: 'open' | 'closed' | 'archived';
    created_at: string;
    updated_at: string;
    last_message?: string;
    message_count?: number;
} 