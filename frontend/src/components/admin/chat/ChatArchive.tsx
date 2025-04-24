import React, { useState, useEffect } from 'react';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Search as SearchIcon,
    Delete as DeleteIcon,
    PersonOutline as PersonIcon,
    Archive as ArchiveIcon,
    FilterList as FilterIcon,
    CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../../api/axios';

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
    user: User;
    last_message: string;
    message_count: number;
    unread_count: number;
}

interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
    sender_email: string;
    sender_first_name: string;
    sender_last_name: string;
    sender_role: string;
}

const ChatArchive: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    useEffect(() => {
        filterConversations();
    }, [conversations, searchTerm, statusFilter, dateFilter]);

    const fetchConversations = async () => {
        try {
            setConversationsLoading(true);
            setError(null);

            const response = await api.get('/api/chat/admin/conversations');
            
            if (response.data) {
                setConversations(response.data);
                setFilteredConversations(response.data);
            }
        } catch (err: any) {
            console.error('Error fetching conversations:', err);
            setError(err?.response?.data?.message || 'Failed to load chat conversations');
        } finally {
            setConversationsLoading(false);
            setLoading(false);
        }
    };

    const fetchMessages = async (conversationId: number) => {
        try {
            setMessagesLoading(true);
            
            const response = await api.get(`/api/chat/admin/conversations/${conversationId}/messages`);
            
            if (response.data) {
                setMessages(response.data);
            }
        } catch (err: any) {
            console.error('Error fetching messages:', err);
            setError(err?.response?.data?.message || 'Failed to load chat messages');
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleDeleteConversation = async () => {
        if (!conversationToDelete) return;

        try {
            await api.delete(`/api/chat/admin/conversations/${conversationToDelete}`);
            
            // Update UI
            setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete));
            
            if (selectedConversation?.id === conversationToDelete) {
                setSelectedConversation(null);
                setMessages([]);
            }
            
            setDeleteDialogOpen(false);
            setConversationToDelete(null);
        } catch (err: any) {
            console.error('Error deleting conversation:', err);
            setError(err?.response?.data?.message || 'Failed to delete conversation');
        }
    };

    const handleOpenDeleteDialog = (conversationId: number) => {
        setConversationToDelete(conversationId);
        setDeleteDialogOpen(true);
    };

    const filterConversations = () => {
        let filtered = [...conversations];
        
        // Apply search filter
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(conv => 
                conv.user.first_name.toLowerCase().includes(term) ||
                conv.user.last_name.toLowerCase().includes(term) ||
                conv.user.email.toLowerCase().includes(term) ||
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

    const sendMessage = async () => {
        if (!selectedConversation || !newMessage.trim()) return;
        
        try {
            const response = await api.post(`/api/chat/admin/conversations/${selectedConversation.id}/messages`, { 
                content: newMessage
            });
            
            if (response.data) {
                // Add the new message to the messages list
                setMessages(prev => [...prev, response.data]);
                
                // Update the last message in the conversation list
                setConversations(prev => prev.map(conv => {
                    if (conv.id === selectedConversation.id) {
                        return {
                            ...conv,
                            last_message: newMessage,
                            updated_at: new Date().toISOString()
                        };
                    }
                    return conv;
                }));
                
                // Clear the input field
                setNewMessage('');
            }
        } catch (err: any) {
            console.error('Error sending message:', err);
            setError(err?.response?.data?.message || 'Failed to send message');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ 
            p: 0,
            height: '100%',
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <Box sx={{ p: 3, flexShrink: 0 }}>
                <Typography variant="h4" sx={{ mb: 3 }}>Live Chat Archive</Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}
            </Box>

            <Grid container spacing={2} sx={{ 
                flexGrow: 1,
                height: 'calc(100% - 100px)',
                overflow: 'hidden',
                p: 3,
                pt: 0
            }}>
                <Grid item xs={12} md={4} sx={{ height: '100%' }}>
                    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
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
                        <Box sx={{ p: 1, display: 'flex', gap: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                            <Chip 
                                label="All" 
                                onClick={() => setStatusFilter('all')}
                                color={statusFilter === 'all' ? 'primary' : 'default'}
                                size="small"
                            />
                            <Chip 
                                label="Open" 
                                onClick={() => setStatusFilter('open')}
                                color={statusFilter === 'open' ? 'primary' : 'default'}
                                size="small"
                            />
                            <Chip 
                                label="Closed" 
                                onClick={() => setStatusFilter('closed')}
                                color={statusFilter === 'closed' ? 'primary' : 'default'}
                                size="small"
                            />
                        </Box>
                        <Box sx={{ p: 1, display: 'flex', gap: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', flexWrap: 'wrap' }}>
                            <Chip 
                                label="All time" 
                                onClick={() => setDateFilter('all')}
                                color={dateFilter === 'all' ? 'primary' : 'default'}
                                size="small"
                                icon={<CalendarIcon />}
                            />
                            <Chip 
                                label="Today" 
                                onClick={() => setDateFilter('today')}
                                color={dateFilter === 'today' ? 'primary' : 'default'}
                                size="small"
                            />
                            <Chip 
                                label="This week" 
                                onClick={() => setDateFilter('week')}
                                color={dateFilter === 'week' ? 'primary' : 'default'}
                                size="small"
                            />
                            <Chip 
                                label="This month" 
                                onClick={() => setDateFilter('month')}
                                color={dateFilter === 'month' ? 'primary' : 'default'}
                                size="small"
                            />
                        </Box>
                        
                        {conversationsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, flex: 1 }}>
                                <CircularProgress size={30} />
                            </Box>
                        ) : (
                            <List sx={{ 
                                flex: 1,
                                overflowY: 'auto',
                                p: 0
                            }}>
                                {filteredConversations.length === 0 ? (
                                    <ListItem>
                                        <ListItemText primary="No conversations found" sx={{ textAlign: 'center', color: 'text.secondary' }} />
                                    </ListItem>
                                ) : (
                                    filteredConversations.map((conversation) => (
                                        <React.Fragment key={conversation.id}>
                                            <ListItem
                                                alignItems="flex-start"
                                                button
                                                selected={selectedConversation?.id === conversation.id}
                                                onClick={() => setSelectedConversation(conversation)}
                                                sx={{ position: 'relative' }}
                                                secondaryAction={
                                                    <IconButton 
                                                        edge="end" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenDeleteDialog(conversation.id);
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                }
                                            >
                                                <ListItemAvatar>
                                                    <Avatar>
                                                        <PersonIcon />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mr: 4 }}>
                                                            <Typography variant="subtitle2">
                                                                {conversation.user.first_name} {conversation.user.last_name}
                                                            </Typography>
                                                            <Chip
                                                                label={conversation.status}
                                                                size="small"
                                                                color={conversation.status === 'open' ? 'success' : 'default'}
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
                                    ))
                                )}
                            </List>
                        )}
                    </Paper>
                </Grid>
                
                <Grid item xs={12} md={8} sx={{ height: '100%' }}>
                    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {selectedConversation ? (
                            <>
                                <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                                    <Typography variant="h6">
                                        Chat with {selectedConversation.user.first_name} {selectedConversation.user.last_name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedConversation.user.email} • 
                                        Started on {format(new Date(selectedConversation.created_at), 'MMMM d, yyyy')}
                                    </Typography>
                                </Box>
                                
                                <Box sx={{ 
                                    flex: 1, 
                                    overflowY: 'auto',
                                    p: 2, 
                                    bgcolor: '#f9f9f9' 
                                }}>
                                    {messagesLoading ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                            <CircularProgress />
                                        </Box>
                                    ) : messages.length === 0 ? (
                                        <Box sx={{ p: 3, textAlign: 'center', flex: 1 }}>
                                            <Typography color="text.secondary">No messages in this conversation</Typography>
                                        </Box>
                                    ) : (
                                        messages.map((message) => {
                                            const isAdmin = message.sender_role === 'admin';
                                            
                                            return (
                                                <Box
                                                    key={message.id}
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: isAdmin ? 'flex-end' : 'flex-start',
                                                        mb: 2
                                                    }}
                                                >
                                                    <Paper
                                                        elevation={1}
                                                        sx={{
                                                            p: 2,
                                                            maxWidth: '70%',
                                                            bgcolor: isAdmin ? '#1976d2' : '#f5f5f5',
                                                            color: isAdmin ? 'white' : 'text.primary',
                                                            borderRadius: 2
                                                        }}
                                                    >
                                                        <Typography variant="body1">{message.content}</Typography>
                                                    </Paper>
                                                    <Typography 
                                                        variant="caption" 
                                                        sx={{ 
                                                            mt: 0.5, 
                                                            ml: isAdmin ? 0 : 1,
                                                            mr: isAdmin ? 1 : 0,
                                                            color: 'text.secondary'
                                                        }}
                                                    >
                                                        {message.sender_first_name} {message.sender_last_name} • 
                                                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                                                    </Typography>
                                                </Box>
                                            );
                                        })
                                    )}
                                </Box>
                                
                                <Box sx={{ 
                                    p: 2, 
                                    borderTop: '1px solid rgba(0, 0, 0, 0.12)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1 
                                }}>
                                    <TextField
                                        placeholder="Type your message..."
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        disabled={selectedConversation?.status === 'closed'}
                                        InputProps={{
                                            sx: { borderRadius: 2 }
                                        }}
                                    />
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim() || selectedConversation?.status === 'closed'}
                                        sx={{ borderRadius: 2, py: 1 }}
                                    >
                                        Send
                                    </Button>
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <Typography color="text.secondary">Select a conversation to view messages</Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
            
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Conversation</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this conversation? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleDeleteConversation} 
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ChatArchive; 