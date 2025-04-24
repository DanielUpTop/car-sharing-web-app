import React, { useRef, useEffect } from 'react';
import { Message } from './types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
    messages: Message[];
    currentUserId: number;
    onRetryMessage: (message: Message) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId, onRetryMessage }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
                <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.sender_id === currentUserId}
                    onRetry={() => onRetryMessage(message)}
                />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList; 