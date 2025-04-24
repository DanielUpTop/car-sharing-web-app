import React from 'react';
import { Conversation } from './types';

interface ConversationListProps {
    conversations: Conversation[];
    selectedConversation: Conversation | null;
    onSelectConversation: (conversation: Conversation) => void;
    onNewConversation: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
    conversations,
    selectedConversation,
    onSelectConversation,
    onNewConversation
}) => {
    return (
        <div className="w-1/4 border-r border-gray-200 bg-white overflow-y-auto">
            <div className="p-4">
                <button
                    onClick={onNewConversation}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    New Conversation
                </button>
            </div>
            <div className="divide-y divide-gray-200">
                {conversations.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => onSelectConversation(conv)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 ${
                            selectedConversation?.id === conv.id ? 'bg-gray-100' : ''
                        }`}
                    >
                        <h3 className="font-medium">{conv.subject}</h3>
                        <p className="text-sm text-gray-500">
                            {conv.last_message || 'No messages yet'}
                        </p>
                        <span className="text-xs text-gray-400">
                            {new Date(conv.updated_at).toLocaleDateString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConversationList; 