import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Message, Conversation } from './types';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { AppBar, Toolbar, IconButton, Typography, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';

const ChatInterface: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch conversations
    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/chat/conversations');
            setConversations(response.data.conversations);
        } catch (error) {
            toast.error('Failed to load conversations');
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch messages for selected conversation
    const fetchMessages = async (conversationId: number) => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/chat/conversations/${conversationId}/messages`);
            setMessages(response.data.messages);
        } catch (error) {
            toast.error('Failed to load messages');
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    // Send new message
    const handleSendMessage = async (content: string) => {
        if (!selectedConversation) return;

        // Create a temporary message with 'sending' status
        const tempMessage: Message = {
            id: Date.now(), // temporary ID
            conversation_id: selectedConversation.id,
            sender_id: user!.id,
            content,
            is_read: false,
            status: 'sending',
            created_at: new Date().toISOString(),
            sender: {
                first_name: user!.first_name,
                last_name: user!.last_name,
                role: user!.role
            }
        };

        // Add the temporary message to the UI
        setMessages(prev => [...prev, tempMessage]);

        try {
            const response = await axios.post(`/api/chat/conversations/${selectedConversation.id}/messages`, {
                content: content.trim()
            });

            // Update the message with the server response
            setMessages(prev => prev.map(msg => 
                msg.id === tempMessage.id 
                    ? { ...response.data.message, status: 'sent' }
                    : msg
            ));

            // Update conversation list to show latest message
            fetchConversations();
        } catch (error) {
            // Mark message as failed
            setMessages(prev => prev.map(msg => 
                msg.id === tempMessage.id 
                    ? { ...msg, status: 'failed' }
                    : msg
            ));
            console.error('Error sending message:', error);
        }
    };

    // Retry failed message
    const handleRetryMessage = async (failedMessage: Message) => {
        // Remove the failed message
        setMessages(prev => prev.filter(msg => msg.id !== failedMessage.id));
        // Try sending it again
        await handleSendMessage(failedMessage.content);
    };

    // Start new conversation
    const handleNewConversation = async () => {
        try {
            const response = await axios.post('/api/chat/conversations', {
                subject: 'New Conversation'
            });
            const newConversation = response.data.conversationId;
            fetchConversations();
            setSelectedConversation(newConversation);
        } catch (error) {
            toast.error('Failed to start conversation');
            console.error('Error starting conversation:', error);
        }
    };

    // Mark messages as read when conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            // Update local message status
            setMessages(prev => prev.map(msg => 
                msg.sender_id !== user?.id && !msg.is_read
                    ? { ...msg, is_read: true, status: 'read' }
                    : msg
            ));

            // Update server
            axios.post(`/api/chat/conversations/${selectedConversation.id}/read`)
                .catch(error => console.error('Error marking messages as read:', error));
        }
    }, [selectedConversation, user?.id]);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    if (!user) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                Please log in to use the chat feature.
            </div>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate(-1)}
                        sx={{ mr: 2 }}
                        aria-label="Back"
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
                        <ChatIcon sx={{ mr: 1.5 }} />
                        <Typography variant="h6" component="div">
                            Live Chat
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>

            <div className="flex flex-grow">
                <ConversationList
                    conversations={conversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={setSelectedConversation}
                    onNewConversation={handleNewConversation}
                />
                
                <div className="flex-1 flex flex-col bg-gray-50">
                    {selectedConversation ? (
                        <>
                            <div className="p-4 border-b border-gray-200 bg-white">
                                <h2 className="text-lg font-semibold">{selectedConversation.subject}</h2>
                                <span className="text-sm text-gray-500">
                                    Status: {selectedConversation.status}
                                </span>
                            </div>

                            <MessageList
                                messages={messages}
                                currentUserId={user.id}
                                onRetryMessage={handleRetryMessage}
                            />

                            <MessageInput
                                onSendMessage={handleSendMessage}
                                disabled={loading || selectedConversation.status !== 'open'}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            Select a conversation or start a new one
                        </div>
                    )}
                </div>
            </div>
        </Box>
    );
};

export default ChatInterface; 