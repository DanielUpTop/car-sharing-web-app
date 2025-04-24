import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Grid,
    Badge,
    IconButton,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Rating
} from '@mui/material';
import {
    Send as SendIcon,
    FiberManualRecord as StatusIcon,
    Close as CloseIcon,
    Star as StarIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

interface ChatUser {
    id: string;
    name: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isOnline: boolean;
    conversationId: string;
    status?: string;
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    isAdmin: boolean;
    is_system?: boolean;
}

const AdminChat: React.FC = () => {
    const [activeChats, setActiveChats] = useState<ChatUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closingChat, setClosingChat] = useState(false);
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const { token } = useAuth();
    const ws = useRef<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingChat, setDeletingChat] = useState(false);
    const [chatToDelete, setChatToDelete] = useState<ChatUser | null>(null);

    useEffect(() => {
        setupWebSocket();
        // Load active chats when component mounts
        loadActiveChats();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (selectedUser) {
            loadChatHistory(selectedUser.id);
        }
    }, [selectedUser]);

    const setupWebSocket = () => {
        ws.current = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/admin/chat`);

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setWsConnected(true);
            
            // Authenticate with token
            if (token && ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                    type: 'auth',
                    token
                }));
            }
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket data:', data);

                if (data.type === 'message') {
                    // Handle new message from user
                    handleNewMessage(data.message);
                } else if (data.type === 'message_sent') {
                    // Just log confirmation, we already added the message to the UI when sending
                    console.log('Message sent confirmation:', data.message);
                    // No need to update UI since we already added the message when sending
                } else if (data.type === 'user_status') {
                    updateUserStatus(data.userId, data.isOnline);
                } else if (data.type === 'error') {
                    setError(data.message);
                } else if (data.type === 'conversation_closed') {
                    handleConversationClosed(data.conversationId);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket disconnected');
            setWsConnected(false);
            // Try to reconnect after a delay
            setTimeout(() => {
                if (ws.current?.readyState === WebSocket.CLOSED) {
                    setupWebSocket();
                }
            }, 3000);
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('WebSocket connection error');
        };
    };

    const loadActiveChats = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/admin/active-chats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load active chats');
            }
            
            const data = await response.json();
            setActiveChats(data.conversations || data);
            console.log('Loaded active chats:', data);
        } catch (error) {
            console.error('Error loading active chats:', error);
            setError('Failed to load active chats');
        }
    };

    const loadChatHistory = async (userId: string) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/admin/chat-history/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }
            
            const data = await response.json();
            setMessages(data);
            scrollToBottom();
        } catch (error) {
            console.error('Error loading chat history:', error);
            setError('Failed to load chat history');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewMessage = (message: any) => {
        // Check if we received a complete message object or a message with conversation context
        const messageData = message.message ? message.message : message;
        const conversationId = message.conversation?.id || messageData.senderId;
        
        if (selectedUser && conversationId === selectedUser.id) {
            const newMsg: Message = {
                id: messageData.id,
                content: messageData.content,
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                timestamp: messageData.timestamp,
                isAdmin: messageData.isAdmin || false,
                is_system: messageData.is_system || false
            };
            
            setMessages(prev => [...prev, newMsg]);
            scrollToBottom();
        }
        
        // Update active chats list
        setActiveChats(prev => prev.map(chat => {
            if (chat.id === conversationId) {
                return {
                    ...chat,
                    lastMessage: messageData.content,
                    lastMessageTime: messageData.timestamp,
                    unreadCount: selectedUser?.id === conversationId ? 0 : (chat.unreadCount || 0) + 1
                };
            }
            return chat;
        }));
    };

    const updateUserStatus = (userId: string, isOnline: boolean) => {
        setActiveChats(prev => prev.map(chat => {
            if (chat.id === userId) {
                return { ...chat, isOnline };
            }
            return chat;
        }));
    };

    const handleConversationClosed = (conversationId: string) => {
        // Update the conversation status in active chats
        setActiveChats(prev => prev.map(chat => {
            if (chat.conversationId === conversationId) {
                return { ...chat, status: 'closed' };
            }
            return chat;
        }));
        
        // If this is the selected conversation, update the UI
        if (selectedUser?.conversationId === conversationId) {
            setSelectedUser(prev => prev ? { ...prev, status: 'closed' } : null);
            
            // Add a system message about the chat being closed
            const systemMessage: Message = {
                id: `system-${Date.now()}`,
                content: "This chat has been closed. The user has been asked to rate their experience.",
                senderId: 'system',
                senderName: 'System',
                timestamp: new Date().toISOString(),
                isAdmin: true,
                is_system: true
            };
            
            setMessages(prev => [...prev, systemMessage]);
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedUser || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            // Create a message object to add to UI immediately
            const adminMessage: Message = {
                id: `local-${Date.now()}`,
                content: newMessage.trim(),
                senderId: 'admin',
                senderName: 'Admin',
                timestamp: new Date().toISOString(),
                isAdmin: true
            };
            
            // Add message to UI immediately
            setMessages(prev => [...prev, adminMessage]);
            scrollToBottom();
            
            // Send message to websocket server
            ws.current.send(JSON.stringify({
                type: 'admin_message',
                message: {
                    content: newMessage.trim(),
                    userId: selectedUser.id,
                    conversationId: selectedUser.conversationId,
                    timestamp: new Date().toISOString()
                }
            }));
            
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message');
        }
    };

    const handleCloseChat = async () => {
        if (!selectedUser) return;
        
        setClosingChat(true);
        
        try {
            // Send close_conversation message via WebSocket
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                    type: 'close_conversation',
                    conversationId: selectedUser.conversationId
                }));
                
                // The server will handle sending the rating request
                setCloseDialogOpen(false);
            } else {
                // Fallback to REST API if WebSocket is not available
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/conversations/${selectedUser.conversationId}/close`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to close chat');
                }
                
                // Update local state
                handleConversationClosed(selectedUser.conversationId);
                setCloseDialogOpen(false);
            }
        } catch (error) {
            console.error('Error closing chat:', error);
            setError('Failed to close chat');
        } finally {
            setClosingChat(false);
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const handleOpenDeleteDialog = (chat: ChatUser) => {
        setChatToDelete(chat);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setChatToDelete(null);
        setDeleteDialogOpen(false);
    };

    const handleDeleteChat = async () => {
        if (!chatToDelete) return;

        setDeletingChat(true);
        setError(null);

        try {
            const response = await api.delete(`/api/chat/conversations/${chatToDelete.conversationId}`);
            
            if (response.status === 200 || response.status === 204) {
                // Remove the chat from the list
                setActiveChats(prev => prev.filter(chat => chat.conversationId !== chatToDelete.conversationId));
                
                // If the deleted chat was selected, clear the selection
                if (selectedUser?.conversationId === chatToDelete.conversationId) {
                    setSelectedUser(null);
                    setMessages([]);
                }
                handleCloseDeleteDialog();
            } else {
                throw new Error('Failed to delete chat from server');
            }
        } catch (err: any) {
            console.error('Error deleting chat:', err);
            setError(err?.response?.data?.message || 'Failed to delete chat');
        } finally {
            setDeletingChat(false);
        }
    };

    return (
        <Box sx={{ 
            display: 'flex', 
            width: '100%', 
            height: '100%',
            overflow: 'hidden',
            bgcolor: 'background.default'
        }}>
            {/* Active Chats Sidebar */}
            <Box sx={{ 
                width: '25%', 
                height: '100%', 
                borderRight: 1, 
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper'
            }}>
                <Box sx={{ 
                    height: '64px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    pl: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider', 
                    bgcolor: 'background.paper' 
                }}>
                    <Typography variant="h6">Active Conversations</Typography>
                </Box>
                <List sx={{ 
                    height: 'calc(100vh - 64px)', 
                    overflowY: 'auto',
                    bgcolor: 'background.paper'
                }}>
                    {activeChats.map((chat) => (
                        <React.Fragment key={chat.id}>
                            <ListItem 
                                button 
                                selected={selectedUser?.id === chat.id}
                                onClick={() => setSelectedUser(chat)}
                                sx={{
                                    '&.Mui-selected': {
                                        bgcolor: 'action.selected',
                                    },
                                    '&:hover .delete-button': {
                                        opacity: 1,
                                    }
                                }}
                            >
                                <ListItemAvatar>
                                    <Badge
                                        overlap="circular"
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                        badgeContent={
                                            <StatusIcon 
                                                sx={{ 
                                                    fontSize: 12,
                                                    color: chat.isOnline ? 'success.main' : 'text.disabled'
                                                }}
                                            />
                                        }
                                    >
                                        <Avatar>{chat.name[0]}</Avatar>
                                    </Badge>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="subtitle2">
                                                {chat.name}
                                            </Typography>
                                            {chat.unreadCount > 0 && (
                                                <Badge 
                                                    badgeContent={chat.unreadCount} 
                                                    color="primary"
                                                    sx={{ ml: 1 }}
                                                />
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary"
                                            noWrap
                                                sx={{ flex: 1 }}
                                        >
                                            {chat.lastMessage}
                                        </Typography>
                                            {chat.status && (
                                                <Chip 
                                                    size="small" 
                                                    label={chat.status} 
                                                    color={chat.status === 'open' ? 'success' : 'default'}
                                                    sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.7rem', py: 0.2 } }}
                                />
                                            )}
                                        </Box>
                                    }
                                />
                                <IconButton
                                    aria-label="delete chat"
                                    size="small"
                                    className="delete-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDeleteDialog(chat);
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        right: 8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        opacity: 0,
                                        transition: 'opacity 0.2s',
                                        color: 'error.main'
                                    }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            </Box>

            {/* Chat Area */}
            <Box sx={{ 
                width: '75%', 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.default'
            }}>
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <Box sx={{ 
                            p: 2, 
                            borderBottom: 1, 
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            bgcolor: 'background.paper',
                            flexShrink: 0
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6">
                                Chat with {selectedUser.name}
                            </Typography>
                                <Chip 
                                    label={selectedUser.status || 'open'} 
                                    size="small"
                                    color={selectedUser.status === 'closed' ? 'default' : 'success'}
                                />
                            </Box>
                            
                            {selectedUser.status !== 'closed' && (
                                <Button 
                                    variant="outlined" 
                                    color="error" 
                                    startIcon={<CloseIcon />} 
                                    onClick={() => setCloseDialogOpen(true)}
                                    size="small"
                                >
                                    Close Chat
                                </Button>
                            )}
                        </Box>

                        {/* Messages Area - This Box should scroll */}
                        <Box sx={{ 
                            flexGrow: 1,
                            overflowY: 'auto', 
                            p: 2, 
                            bgcolor: '#f5f5f5',
                            height: 'calc(100% - 140px)'
                        }}>
                            {isLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <CircularProgress />
                                </Box>
                            ) : error ? (
                                <Alert severity="error" sx={{ m: 2 }}>
                                    {error}
                                </Alert>
                            ) : (
                                <Box sx={{ minHeight: '1px' }}>
                                    {messages.map((message) => (
                                        <Box
                                            key={message.id}
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: message.isAdmin ? 'flex-end' : 'flex-start',
                                                maxWidth: message.is_system ? '100%' : '70%',
                                                alignSelf: message.is_system ? 'center' : (message.isAdmin ? 'flex-end' : 'flex-start')
                                            }}
                                        >
                                            <Paper
                                                elevation={1}
                                                sx={{
                                                    p: 2,
                                                    bgcolor: message.is_system 
                                                        ? 'rgba(0, 0, 0, 0.04)' 
                                                        : (message.isAdmin ? '#1976d2' : 'white'),
                                                    color: message.is_system
                                                        ? 'text.secondary'
                                                        : (message.isAdmin ? 'white' : 'text.primary'),
                                                    borderRadius: 2,
                                                    width: message.is_system ? '80%' : 'auto'
                                                }}
                                            >
                                                <Typography variant="body1" align={message.is_system ? 'center' : 'left'}>
                                                    {message.content}
                                                </Typography>
                                            </Paper>
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    mt: 0.5,
                                                    color: 'text.secondary',
                                                    alignSelf: message.is_system ? 'center' : (message.isAdmin ? 'flex-end' : 'flex-start')
                                                }}
                                            >
                                                {!message.is_system && (
                                                    format(new Date(message.timestamp), 'HH:mm')
                                                )}
                                            </Typography>
                                        </Box>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </Box>
                            )}
                        </Box>

                        {/* Message Input */}
                        <Box 
                            sx={{ 
                                p: 2, 
                                display: 'flex', 
                                gap: 1, 
                                alignItems: 'center',
                                borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                                bgcolor: 'background.paper',
                                flexShrink: 0
                            }}
                        >
                            <TextField
                                fullWidth
                                multiline
                                maxRows={2}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                variant="outlined"
                                size="small"
                                disabled={!ws.current || ws.current.readyState !== WebSocket.OPEN || selectedUser.status === 'closed'}
                                sx={{ bgcolor: 'white' }}
                            />
                            <Button
                                variant="contained"
                                endIcon={<SendIcon />}
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN || selectedUser.status === 'closed'}
                            >
                                Send
                            </Button>
                        </Box>
                    </>
                ) : (
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '100%',
                        width: '100%',
                        bgcolor: '#f5f5f5'
                    }}>
                        <Paper elevation={3} sx={{ p: 4, maxWidth: '500px', textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No conversation selected
                            </Typography>
                            <Typography color="text.secondary">
                                Select a conversation from the sidebar to start chatting
                        </Typography>
                        </Paper>
                    </Box>
                )}
            </Box>
            
            {/* Close Chat Confirmation Dialog */}
            <Dialog 
                open={closeDialogOpen} 
                onClose={() => setCloseDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle>Close Chat</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to close this chat? This will send a rating request to the user.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleCloseChat} 
                        color="error"
                        variant="contained"
                        disabled={closingChat}
                    >
                        {closingChat ? 'Closing...' : 'Close Chat'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Chat Confirmation Dialog */}
            <Dialog 
                open={deleteDialogOpen} 
                onClose={handleCloseDeleteDialog}
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle>Delete Chat</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to permanently delete this chat history for "{chatToDelete?.name}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
                    <Button 
                        onClick={handleDeleteChat} 
                        color="error"
                        variant="contained"
                        disabled={deletingChat}
                    >
                        {deletingChat ? 'Deleting...' : 'Delete Chat'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminChat; 