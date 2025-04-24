import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    TextField,
    IconButton,
    InputAdornment,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Container,
    AppBar,
    Toolbar,
    Rating
} from '@mui/material';
import {
    Send as SendIcon,
    Search as SearchIcon,
    PersonOutline as PersonIcon,
    Close as CloseIcon,
    Archive as ArchiveIcon,
    CalendarToday as CalendarIcon,
    Chat as ChatIcon,
    ArrowBack as ArrowBackIcon,
    Add as AddIcon,
    Star as StarIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
}

interface Conversation {
    id: number;
    user_id: number;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    subject: string;
    last_message: string;
    message_count: number;
}

interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    is_read: boolean;
    is_system?: boolean;
    created_at: string;
    sender_email?: string;
    sender_first_name?: string;
    sender_last_name?: string;
    sender_role?: string;
    isAdmin?: boolean;
    senderName?: string;
    timestamp?: string;
}

const EnhancedChat: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [endChatDialogOpen, setEndChatDialogOpen] = useState(false);
    const [isWsConnected, setIsWsConnected] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const ws = useRef<WebSocket | null>(null);
    const [isCreatingConversation, setIsCreatingConversation] = useState(false);
    const isComponentMounted = useRef(true);
    const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
    const [ratingValue, setRatingValue] = useState<number | null>(null);
    const [submittingRating, setSubmittingRating] = useState(false);
    
    const { user, token } = useAuth();
    const navigate = useNavigate();
    
    // Effect for connecting to WebSocket
    useEffect(() => {
        if (!token || !selectedConversation?.id || selectedConversation.status === 'closed') return;
        
        const setupWebSocket = () => {
            if (ws.current) {
                ws.current.close();
            }
            
            const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/chat';
            ws.current = new WebSocket(wsUrl);
            
            ws.current.onopen = () => {
                console.log('WebSocket connected');
                setIsWsConnected(true);
                
                // Authenticate after connection
                if (token) {
                    ws.current?.send(JSON.stringify({
                        type: 'auth',
                        token
                    }));
                }
            };
            
            // We don't set onmessage here since we're using the addEventListener approach from the useEffect
            
            ws.current.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                setIsWsConnected(false);
                
                // Attempt to reconnect after delay, but only if not unmounted
                setTimeout(() => {
                    if (ws.current?.readyState === WebSocket.CLOSED && isComponentMounted.current) {
                        setupWebSocket();
                    }
                }, 5000);
            };
            
            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        };
        
        setupWebSocket();
        
        return () => {
            isComponentMounted.current = false;
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [token, selectedConversation]);
    
    // Initial data loading
    useEffect(() => {
        if (token) {
            fetchConversations();
        }
    }, [token]);
    
    // Update selected conversation's messages
    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
        }
    }, [selectedConversation]);
    
    // Filter conversations when filters change
    useEffect(() => {
        filterConversations();
    }, [conversations, searchTerm, statusFilter, dateFilter]);
    
    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const fetchConversations = async () => {
        try {
            setConversationsLoading(true);
            setError(null);
            
            console.log('Fetching conversations...');
            const response = await api.get('/api/chat/conversations');
            console.log('Conversations response:', response.data);
            
            if (response.data?.conversations && Array.isArray(response.data.conversations)) {
                setConversations(response.data.conversations);
                setFilteredConversations(response.data.conversations);
                
                // Select the first open conversation by default
                const openConversation = response.data.conversations.find((c: Conversation) => c.status === 'open');
                if (openConversation) {
                    console.log('Selected open conversation:', openConversation.id);
                    setSelectedConversation(openConversation);
                } else if (response.data.conversations.length > 0) {
                    console.log('No open conversations, selecting first available:', response.data.conversations[0].id);
                    setSelectedConversation(response.data.conversations[0]);
                } else {
                    console.log('No conversations found');
                    setSelectedConversation(null);
                }
                
                return true;
            } else {
                console.log('No conversations data in response');
                setConversations([]);
                setFilteredConversations([]);
                setSelectedConversation(null);
                
                // Only attempt to create a conversation if we're not already in the process
                if (!isCreatingConversation) {
                    console.log('No conversations found, creating a new one...');
                    setIsCreatingConversation(true);
                    await createNewConversation();
                    setIsCreatingConversation(false);
                }
            }
        } catch (err: any) {
            console.error('Error fetching conversations:', err);
            const errorMessage = err?.response?.data?.message || 'Failed to load your conversations';
            console.log('Setting error message:', errorMessage);
            setError(errorMessage);
            
            // Only create a new conversation if not already doing so
            if (!isCreatingConversation) {
                console.log('Error occurred, attempting to create a new conversation');
                setIsCreatingConversation(true);
                await createNewConversation();
                setIsCreatingConversation(false);
            }
        } finally {
            setConversationsLoading(false);
            setLoading(false);
        }
    };
    
    const fetchMessages = async (conversationId: number) => {
        try {
            setMessagesLoading(true);
            
            const response = await api.get(`/api/chat/conversations/${conversationId}/messages`);
            
            if (response.data?.messages) {
                setMessages(response.data.messages);
            }
        } catch (err: any) {
            console.error('Error fetching messages:', err);
            setError(err?.response?.data?.message || 'Failed to load messages');
            
            // Try to use the fallback history endpoint
            try {
                const fallbackResponse = await api.get('/api/chat/history');
                if (Array.isArray(fallbackResponse.data)) {
                    setMessages(fallbackResponse.data);
                }
            } catch (fallbackErr) {
                console.error('Fallback history also failed:', fallbackErr);
            }
        } finally {
            setMessagesLoading(false);
        }
    };
    
    // Add a mock data generator to provide simulated messages
    const generateMockData = () => {
        // Create a new mock conversation
        const mockConversation: Conversation = {
            id: 1,
            user_id: user?.id || 0,
            status: 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            subject: 'Mock Support Chat',
            last_message: 'Welcome to support chat!',
            message_count: 1
        };
        
        // Create mock welcome message
        const mockMessages: Message[] = [
            {
                id: 1,
                conversation_id: 1,
                sender_id: 999, // Admin ID
                content: "Hello! This is a simulated chat experience since our server appears to be offline. Our support team will be available once the system is back online.",
                is_read: true,
                created_at: new Date().toISOString(),
                sender_first_name: "Support",
                sender_last_name: "Team",
                sender_role: "admin",
                isAdmin: true
            }
        ];
        
        return { mockConversation, mockMessages };
    };
    
    // Update the createNewConversation function to provide clearer error messages
    const createNewConversation = async () => {
        try {
            setError(null);
            
            console.log('Creating new conversation...');
            const response = await api.post('/api/chat/conversations', {
                subject: 'General Support Request'
            });
            
            console.log('New conversation response:', response.data);
            
            if (response.data.success && response.data.conversationId) {
                // Fetch all conversations again to get the new one
                await fetchConversations();
                return true;
            } else {
                console.log('Unsuccessful response when creating conversation:', response.data);
                setError('Failed to start a new conversation. Please try again.');
                return false;
            }
        } catch (err: any) {
            console.error('Error creating new conversation:', err);
            
            // Show a more specific message for database connection errors
            if (err.response?.data?.message?.includes('Database connection refused') ||
                err.message?.includes('Database connection refused')) {
                setError('Database connection error. Please make sure the MySQL server is running.');
            } else if (err.response?.status === 401) {
                setError('Please log in to start a conversation');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to start a new conversation. Please try again later.');
            }
            
            return false;
        }
    };
    
    // Update the handleStartNewChat function to be simpler and more direct
    const handleStartNewChat = async () => {
        setError(null);
        setLoading(true);
        
        try {
            console.log('Starting new chat...');
            const success = await createNewConversation();
            
            if (success) {
                console.log('Successfully created new chat');
                // Clear any previous error message
                setError(null);
            } else {
                console.log('Failed to create new chat');
            }
        } catch (err) {
            console.error('Error in handleStartNewChat:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // Update the handleSendMessage to handle offline mode
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        // Store message content before clearing the input
        const messageContent = newMessage.trim();
        
        // Clear the input field immediately for better user experience
        setNewMessage('');
        
        try {
            // Handle offline mode - just add the message locally
            if (!navigator.onLine || error?.includes('offline mode')) {
                console.log('Sending message in offline mode');
                
                // Add the user's message
                const optimisticMessage: Message = {
                    id: Date.now(),
                    conversation_id: selectedConversation.id,
                    sender_id: user?.id || 0,
                    content: messageContent,
                    is_read: true,
                    created_at: new Date().toISOString(),
                    sender_first_name: user?.first_name || '',
                    sender_last_name: user?.last_name || '',
                    sender_role: 'rentee'
                };
                
                setMessages(prev => [...prev, optimisticMessage]);
                scrollToBottom();
                
                // Add a mock response after a short delay
                setTimeout(() => {
                    const mockResponse: Message = {
                        id: Date.now() + 1,
                        conversation_id: selectedConversation.id,
                        sender_id: 999,
                        content: "I've received your message. Our support team will assist you when the system is back online.",
                        is_read: true,
                        created_at: new Date().toISOString(),
                        sender_first_name: "Support",
                        sender_last_name: "Team",
                        sender_role: "admin",
                        isAdmin: true
                    };
                    
                    setMessages(prev => [...prev, mockResponse]);
                    scrollToBottom();
                }, 1500);
                
                return;
            }
            
            // For online mode: 
            // Check if we're using WebSocket or REST API
            if (ws.current && isWsConnected) {
                // If using WebSocket, don't add an optimistic message
                // The message will be added when the server confirms via WebSocket
                console.log('Sending message via WebSocket');
                
                // Send via WebSocket
                ws.current.send(JSON.stringify({
                    type: 'message',
                    message: {
                        content: messageContent,
                        senderId: user?.id,
                        senderName: `${user?.first_name} ${user?.last_name}`,
                        timestamp: new Date().toISOString(),
                        isAdmin: false
                    },
                    conversationId: selectedConversation.id
                }));
            } else {
                // If using REST API, add optimistic message
                console.log('Sending message via REST API');
                
                // Add optimistic message to UI
                const optimisticMessage: Message = {
                    id: Date.now(),
                    conversation_id: selectedConversation.id,
                    sender_id: user?.id || 0,
                    content: messageContent,
                    is_read: true,
                    created_at: new Date().toISOString(),
                    sender_first_name: user?.first_name || '',
                    sender_last_name: user?.last_name || '',
                    sender_role: 'rentee'
                };
                
                setMessages(prev => [...prev, optimisticMessage]);
                scrollToBottom();
                
                // Also send via REST API
                await api.post(`/api/chat/conversations/${selectedConversation.id}/messages`, {
                    content: messageContent
                });
            }
            
            // Refresh the conversation list to update the last message
            setTimeout(() => {
                fetchConversations();
            }, 1000);
        } catch (err) {
            console.error('Error sending message:', err);
            
            // If we get a network error, switch to offline mode
            if (err instanceof Error && 
                (err.message?.includes('Network Error') || !navigator.onLine)) {
                setError('Unable to connect to the server. Using offline mode.');
            } else {
                setError('Failed to send message');
            }
        }
    };
    
    const handleEndChat = async () => {
        if (!selectedConversation) return;
        
        try {
            // Close the chat via API
            await api.put(`/api/chat/conversations/${selectedConversation.id}/close`);
            
            // Update the conversation status locally
            setConversations(prev => 
                prev.map(conv => 
                    conv.id === selectedConversation.id 
                        ? { ...conv, status: 'closed' } 
                        : conv
                )
            );
            
            // Close the WebSocket connection
            if (ws.current) {
                ws.current.close();
                setIsWsConnected(false);
            }
            
            // Update the selected conversation
            setSelectedConversation(prev => 
                prev ? { ...prev, status: 'closed' } : null
            );
            
            // Close the dialog and open rating dialog
            setEndChatDialogOpen(false);
            setRatingDialogOpen(true);
            
            // Add system message about chat being closed
            const systemMessage: Message = {
                id: Date.now(),
                conversation_id: selectedConversation.id,
                sender_id: 0, // System message
                content: "Chat has been closed. Please rate your experience.",
                is_read: true,
                is_system: true,
                created_at: new Date().toISOString(),
                sender_role: 'system'
            };
            
            setMessages(prev => [...prev, systemMessage]);
            scrollToBottom();
            
            // Refresh conversations to get the updated list
            setTimeout(() => {
                fetchConversations();
            }, 1000);
        } catch (err) {
            console.error('Error ending chat:', err);
            setError('Failed to end the chat');
        }
    };
    
    const filterConversations = () => {
        let filtered = [...conversations];
        
        // Apply search filter
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(conv => 
                conv.subject?.toLowerCase().includes(term) ||
                conv.last_message?.toLowerCase().includes(term)
            );
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(conv => conv.status === statusFilter);
        }
        
        // Apply date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            
            filtered = filtered.filter(conv => {
                const updatedAt = new Date(conv.updated_at);
                
                if (dateFilter === 'today') {
                    return updatedAt >= today;
                } else if (dateFilter === 'week') {
                    return updatedAt >= weekAgo;
                } else if (dateFilter === 'month') {
                    return updatedAt >= monthAgo;
                }
                
                return true;
            });
        }
        
        setFilteredConversations(filtered);
    };
    
    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };
    
    // Update the initialization to handle offline connections
    useEffect(() => {
        const handleOnlineStatusChange = () => {
            if (navigator.onLine) {
                // We're back online, try to fetch data
                console.log('App is back online, refreshing data');
                setError(null);
                fetchConversations();
            } else {
                console.log('App is offline');
                setError('You are currently offline. Using offline mode.');
                
                // If we don't have any conversations yet, create a mock one
                if (conversations.length === 0 && !isCreatingConversation) {
                    const { mockConversation, mockMessages } = generateMockData();
                    setConversations([mockConversation]);
                    setFilteredConversations([mockConversation]);
                    setSelectedConversation(mockConversation);
                    setMessages(mockMessages);
                }
            }
        };
        
        window.addEventListener('online', handleOnlineStatusChange);
        window.addEventListener('offline', handleOnlineStatusChange);
        
        // Check initial status
        if (!navigator.onLine) {
            handleOnlineStatusChange();
        }
        
        return () => {
            window.removeEventListener('online', handleOnlineStatusChange);
            window.removeEventListener('offline', handleOnlineStatusChange);
        };
    }, [conversations.length, isCreatingConversation]);
    
    // Handle WebSocket messages
    useEffect(() => {
        if (!ws.current) return;

        const handleWebSocketMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data);

                if (data.type === 'message') {
                    // Process new message - only add it if it's not from the current user
                    // This prevents duplicate messages when the user sends a message
                    const message = data.message;
                    
                    // Check if this message is from someone else or it's a system message 
                    // before adding it to the UI (otherwise it will duplicate user's own messages)
                    if (message.senderId !== user?.id) {
                        const newMessage: Message = {
                            id: message.id,
                            conversation_id: message.conversationId,
                            sender_id: message.senderId,
                            content: message.content,
                            is_read: false,
                            created_at: message.timestamp,
                            sender_first_name: message.senderName?.split(' ')[0] || '',
                            sender_last_name: message.senderName?.split(' ')[1] || '',
                            sender_role: message.isAdmin ? 'admin' : 'rentee'
                        };
                        
                        setMessages(prev => [...prev, newMessage]);
                        scrollToBottom();
                    }
                } else if (data.type === 'message_sent') {
                    // Confirmation of our own message being sent - no need to add to messages
                    // since we've already added it optimistically or will add it via REST API
                    console.log('Message sent confirmation:', data.message);
                } else if (data.type === 'error') {
                    setError(`WebSocket error: ${data.message}`);
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
            }
        };

        ws.current.addEventListener('message', handleWebSocketMessage);

        return () => {
            ws.current?.removeEventListener('message', handleWebSocketMessage);
        };
    }, [ws.current, user?.id]);
    
    // Add handler for the rating message
    const handleRatingRequest = (message: Message) => {
        if (message.is_system && message.content.includes("rate your experience")) {
            setRatingDialogOpen(true);
        }
    };
    
    // Add function to submit the rating
    const submitRating = async () => {
        if (!ratingValue || !selectedConversation) return;
        
        setSubmittingRating(true);
        
        try {
            // Create a rating message to send
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                    type: 'message',
                    message: {
                        content: `Rating: ${ratingValue} stars`,
                        senderId: user?.id,
                        senderName: `${user?.first_name} ${user?.last_name}`,
                        timestamp: new Date().toISOString()
                    },
                    conversationId: selectedConversation.id
                }));
            }
            
            // You can also send to the API if needed
            await api.post(`/api/chat/conversations/${selectedConversation.id}/rating`, {
                rating: ratingValue
            });
            
            // Add the rating message to the UI
            const ratingMessage: Message = {
                id: Date.now(),
                conversation_id: selectedConversation.id,
                sender_id: user?.id || 0,
                content: `Rating: ${ratingValue} stars`,
                is_read: true,
                created_at: new Date().toISOString(),
                sender_first_name: user?.first_name || '',
                sender_last_name: user?.last_name || '',
                sender_role: 'rentee'
            };
            
            setMessages(prev => [...prev, ratingMessage]);
            setRatingDialogOpen(false);
            
        } catch (error) {
            console.error('Error submitting rating:', error);
            setError('Failed to submit rating');
        } finally {
            setSubmittingRating(false);
        }
    };
    
    if (!user) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>Please log in to use the chat</Typography>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/login')}
                    >
                        Login
                    </Button>
                </Paper>
            </Container>
        );
    }
    
    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 100px)' }}>
                <CircularProgress />
            </Container>
        );
    }
    
    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh',
            width: '100%',
            bgcolor: '#f5f5f5',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header Banner */}
            <Box
                sx={{
                    bgcolor: 'primary.main', 
                    color: 'white', 
                    py: 2, 
                    px: 3, 
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    zIndex: 1000
                }}
            >
                <IconButton
                    sx={{ mr: 2, color: 'white' }} 
                    onClick={() => navigate('/dashboard')}
                    aria-label="back"
                >
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" component="h1" sx={{ fontWeight: 500 }}>
                    Live Chat
                </Typography>
            </Box>

            {/* Main Content Area */}
            <Box 
                sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    overflow: 'hidden',
                    p: 3,
                    bgcolor: '#f5f5f5'
                }}
            >
                {/* Welcome Banner */}
                <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 3, width: '100%', bgcolor: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" component="h2">
                            Speak with the admin team with live chat here to solve your queries and issues!
                        </Typography>
                        
                        <Button 
                            variant="contained" 
                            color="primary" 
                            sx={{ ml: 'auto' }}
                            onClick={handleStartNewChat}
                            startIcon={<AddIcon />}
                            disabled={loading || conversationsLoading}
                        >
                            {loading ? 'Creating...' : 'New Conversation'}
                        </Button>
                    </Box>
                
                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ 
                                mb: 3,
                                '& .MuiAlert-message': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%'
                                }
                            }}
                        >
                            <Box sx={{ flex: 1 }}>{error}</Box>
                            <Button 
                                color="inherit" 
                                size="small" 
                                onClick={() => setError(null)}
                                sx={{ ml: 2 }}
                            >
                                Dismiss
                            </Button>
                        </Alert>
                    )}
                </Paper>
                
                {/* Conversation and Chat Area */}
                <Box sx={{ 
                    display: 'flex', 
                    width: '100%', 
                    flex: 1,
                    gap: 3,
                    height: 'calc(100% - 100px)',
                    overflow: 'hidden'
                }}>
                    {/* Conversations List */}
                    <Box sx={{ width: '33%', height: '100%' }}>
                        <Paper elevation={3} sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            borderRadius: 2, 
                            overflow: 'hidden',
                            bgcolor: 'white'
                        }}>
                            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', bgcolor: 'background.paper' }}>
                                <TextField
                                    placeholder="Search conversations..."
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Box>
                            
                            <Box sx={{ p: 1, display: 'flex', gap: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', bgcolor: 'background.paper' }}>
                                <Chip 
                                    label="All" 
                                    onClick={() => setStatusFilter('all')}
                                    color={statusFilter === 'all' ? 'primary' : 'default'}
                                    size="small"
                                    variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                                />
                                <Chip 
                                    label="Open" 
                                    onClick={() => setStatusFilter('open')}
                                    color={statusFilter === 'open' ? 'success' : 'default'}
                                    size="small"
                                    variant={statusFilter === 'open' ? 'filled' : 'outlined'}
                                />
                                <Chip 
                                    label="Closed" 
                                    onClick={() => setStatusFilter('closed')}
                                    color={statusFilter === 'closed' ? 'default' : 'default'}
                                    size="small"
                                    variant={statusFilter === 'closed' ? 'filled' : 'outlined'}
                                />
                            </Box>
                            
                            <Box sx={{ p: 1, display: 'flex', gap: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', bgcolor: 'background.paper', flexWrap: 'wrap' }}>
                                <Chip 
                                    label="All time" 
                                    onClick={() => setDateFilter('all')}
                                    color={dateFilter === 'all' ? 'primary' : 'default'}
                                    size="small"
                                    icon={<CalendarIcon />}
                                    variant={dateFilter === 'all' ? 'filled' : 'outlined'}
                                />
                                <Chip 
                                    label="Today" 
                                    onClick={() => setDateFilter('today')}
                                    color={dateFilter === 'today' ? 'primary' : 'default'}
                                    size="small"
                                    variant={dateFilter === 'today' ? 'filled' : 'outlined'}
                                />
                                <Chip 
                                    label="This week" 
                                    onClick={() => setDateFilter('week')}
                                    color={dateFilter === 'week' ? 'primary' : 'default'}
                                    size="small"
                                    variant={dateFilter === 'week' ? 'filled' : 'outlined'}
                                />
                                <Chip 
                                    label="This month" 
                                    onClick={() => setDateFilter('month')}
                                    color={dateFilter === 'month' ? 'primary' : 'default'}
                                    size="small"
                                    variant={dateFilter === 'month' ? 'filled' : 'outlined'}
                                />
                            </Box>
                            
                            {conversationsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, bgcolor: 'background.paper', flex: 1 }}>
                                    <CircularProgress size={30} />
                                </Box>
                            ) : filteredConversations.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper', flex: 1 }}>
                                    <Typography color="text.secondary">No conversations found</Typography>
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        sx={{ mt: 2 }}
                                        onClick={handleStartNewChat}
                                        disabled={loading || conversationsLoading}
                                    >
                                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Start New Chat'}
                                    </Button>
                                </Box>
                            ) : (
                                <List sx={{ overflow: 'auto', flex: 1, bgcolor: 'background.paper' }}>
                                    {filteredConversations.map((conversation) => (
                                        <React.Fragment key={conversation.id}>
                                            <ListItem
                                                alignItems="flex-start"
                                                button
                                                selected={selectedConversation?.id === conversation.id}
                                                onClick={() => setSelectedConversation(conversation)}
                                                sx={{ 
                                                    position: 'relative',
                                                    '&.Mui-selected': {
                                                        bgcolor: 'action.selected',
                                                    }
                                                }}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar sx={{ 
                                                        bgcolor: conversation.status === 'open' 
                                                            ? 'primary.main' 
                                                            : 'grey.400' 
                                                    }}>
                                                        <ChatIcon />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mr: 2 }}>
                                                            <Typography variant="subtitle2" fontWeight={conversation.status === 'open' ? 600 : 400}>
                                                                {conversation.subject || 'Support Chat'}
                                                            </Typography>
                                                            <Chip
                                                                label={conversation.status}
                                                                size="small"
                                                                color={conversation.status === 'open' ? 'success' : 'default'}
                                                                variant={conversation.status === 'open' ? 'filled' : 'outlined'}
                                                                sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0, fontSize: '0.7rem' } }}
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <>
                                                            <Typography variant="body2" component="span" color="text.primary" sx={{ display: 'block' }}>
                                                                {conversation.last_message?.length > 35 
                                                                    ? conversation.last_message.substring(0, 35) + '...' 
                                                                    : conversation.last_message}
                                                            </Typography>
                                                            <Typography variant="caption" component="span" color="text.secondary">
                                                                Last updated: {format(new Date(conversation.updated_at), 'MMM d, yyyy')}
                                                            </Typography>
                                                        </>
                                                    }
                                                />
                                            </ListItem>
                                            <Divider component="li" />
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </Paper>
                    </Box>
                    
                    {/* Chat Messages */}
                    <Box sx={{ width: '67%', height: '100%' }}>
                        <Paper elevation={3} sx={{ 
                            height: '100%', 
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: 'white'
                        }}>
                            <Box sx={{ 
                                p: 2, 
                                borderBottom: 1, 
                                borderColor: 'divider',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                bgcolor: 'white'
                            }}>
                                <Typography variant="h6">
                                    {selectedConversation?.subject || "Support Chat"}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Chip 
                                        label={selectedConversation?.status}
                                        color={selectedConversation?.status === 'open' ? 'success' : 'default'}
                                        size="small"
                                    />
                                    {selectedConversation?.status === 'open' && (
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            color="error"
                                            onClick={() => setEndChatDialogOpen(true)}
                                            startIcon={<CloseIcon />}
                                        >
                                            End Chat
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                            
                            {/* Messages container */}
                            <Box sx={{ 
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: '#f9f9f9',
                                overflow: 'hidden'
                            }}>
                                {/* Scrollable message area */}
                                <Box sx={{ 
                                    p: 2,
                                    flex: 1,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2
                                }}>
                                    {messages.map((message) => {
                                        const isAdmin = message.sender_role === 'admin' || message.isAdmin;
                                        const isSystem = message.is_system;
                                        
                                        if (isSystem) {
                                            // System message
                                            return (
                                                <Box
                                                    key={message.id}
                                                    sx={{
                                                        display: 'flex', 
                                                        justifyContent: 'center',
                                                        mb: 2
                                                    }}
                                                >
                                                    <Paper
                                                        elevation={0}
                                                        sx={{
                                                            p: 1.5,
                                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                            borderRadius: 3,
                                                            maxWidth: '80%'
                                                        }}
                                                    >
                                                        <Typography 
                                                            variant="body2" 
                                                            color="text.secondary"
                                                            align="center"
                                                        >
                                                            {message.content}
                                                        </Typography>
                                                    </Paper>
                                                </Box>
                                            );
                                        }
                                        
                                        return (
                                            <Box
                                                key={message.id}
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                                                    maxWidth: '70%',
                                                    alignSelf: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                                                    mb: 2
                                                }}
                                            >
                                                <Paper 
                                                    elevation={1}
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: message.sender_id === user?.id ? 'primary.main' : 'white',
                                                        color: message.sender_id === user?.id ? 'white' : 'text.primary',
                                                        borderRadius: 2
                                                    }}
                                                >
                                                    <Typography variant="body1">{message.content}</Typography>
                                                </Paper>
                                                <Typography 
                                                    variant="caption" 
                                                    color="text.secondary" 
                                                    sx={{ mt: 0.5 }}
                                                >
                                                    {message.created_at ? new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </Box>
                                
                                {/* Input area with explicit white background */}
                                <Box sx={{ 
                                    p: 2, 
                                    borderTop: 1, 
                                    borderColor: 'divider',
                                    backgroundColor: 'white'
                                }}>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }}>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <TextField
                                                fullWidth
                                                placeholder="Type your message..."
                                                variant="outlined"
                                                size="small"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                sx={{ backgroundColor: 'white', flex: 1 }}
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                endIcon={<SendIcon />}
                                                onClick={handleSendMessage}
                                            >
                                                Send
                                            </Button>
                                        </Box>
                                    </form>
                                </Box>
                            </Box>
                        </Paper>
                    </Box>
                </Box>
            </Box>

            {/* Dialogs - still within the main Box container */}
            <Dialog
                open={endChatDialogOpen}
                onClose={() => setEndChatDialogOpen(false)}
                PaperProps={{
                    sx: { borderRadius: 2 }
                }}
            >
                <DialogTitle>End Conversation</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to end this conversation? You won't be able to send more messages to this chat thread.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setEndChatDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleEndChat}
                        color="error"
                        variant="contained"
                    >
                        End Chat
                    </Button>
                </DialogActions>
            </Dialog>
            
            <Dialog open={ratingDialogOpen} onClose={() => setRatingDialogOpen(false)}>
                <DialogTitle>Rate Your Experience</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                        <Typography gutterBottom>
                            Please rate your chat experience from 1-10 stars
                        </Typography>
                        <Rating
                            value={ratingValue}
                            onChange={(event, newValue) => {
                                setRatingValue(newValue);
                            }}
                            max={10}
                            size="large"
                            precision={1}
                            icon={<StarIcon fontSize="inherit" />}
                            emptyIcon={<StarIcon fontSize="inherit" />}
                            sx={{ mt: 2, mb: 2 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRatingDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={submitRating} 
                        variant="contained" 
                        color="primary"
                        disabled={ratingValue === null || submittingRating}
                    >
                        {submittingRating ? 'Submitting...' : 'Submit Rating'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EnhancedChat; 