import React from 'react';
import { Message } from './types';
import { FiCheck, FiCheckCircle, FiClock, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

interface MessageBubbleProps {
    message: Message;
    isOwnMessage: boolean;
    onRetry?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage, onRetry }) => {
    const getStatusIcon = () => {
        switch (message.status) {
            case 'sending':
                return <FiClock className="text-gray-400 animate-spin" />;
            case 'sent':
                return <FiCheck className="text-gray-400" />;
            case 'delivered':
                return (
                    <div className="flex">
                        <FiCheck className="text-gray-400" />
                        <FiCheck className="text-gray-400 -ml-1" />
                    </div>
                );
            case 'read':
                return <FiCheckCircle className="text-blue-400" />;
            case 'failed':
                return <FiAlertCircle className="text-red-500" />;
            default:
                return null;
        }
    };

    const getStatusText = () => {
        switch (message.status) {
            case 'sending':
                return 'Sending...';
            case 'sent':
                return 'Sent';
            case 'delivered':
                return 'Delivered';
            case 'read':
                return 'Read';
            case 'failed':
                return 'Failed to send';
            default:
                return '';
        }
    };

    return (
        <div className={`mb-4 ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
            <div
                className={`max-w-[70%] p-3 rounded-lg ${
                    isOwnMessage
                        ? 'bg-blue-600 text-white ml-auto'
                        : 'bg-white text-gray-900'
                }`}
            >
                {!isOwnMessage && (
                    <div className="text-xs text-gray-500 mb-1">
                        {message.sender.first_name} {message.sender.last_name}
                    </div>
                )}
                <p>{message.content}</p>
                <div className="flex items-center justify-end gap-1 text-xs mt-1">
                    <span className={`opacity-75 ${message.status === 'failed' ? 'text-red-500' : ''}`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                    {isOwnMessage && (
                        <div className="flex items-center gap-1 ml-1">
                            {getStatusIcon()}
                            <span className="sr-only">{getStatusText()}</span>
                        </div>
                    )}
                </div>
            </div>
            {message.status === 'failed' && isOwnMessage && onRetry && (
                <button
                    onClick={onRetry}
                    className="text-xs text-red-500 mt-1 flex items-center gap-1 ml-auto hover:text-red-600"
                >
                    <FiRefreshCw className="w-3 h-3" />
                    Click to retry
                </button>
            )}
        </div>
    );
};

export default MessageBubble; 