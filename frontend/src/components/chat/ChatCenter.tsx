import React, { useState, useEffect, useRef } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    TextField,
    Button,
    Divider,
    IconButton,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Badge,
    Chip
} from '@mui/material';
import {
    Send as SendIcon,
    Add as AddIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Message {
    id: number;
    content: string;
    sender_id: number;
    sender_email: string;
    sender_first_name: string;
    sender_last_name: string;
    sender_role: string;
    created_at: string;
}

interface Conversation {
    id: number;
    subject: string;
    status: string;
    created_at: string;
    updated_at: string;
    unread_count: number;
    last_message: string;
}

const ChatCenter = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openNewDialog, setOpenNewDialog] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
            const interval = setInterval(() => fetchMessages(selectedConversation.id), 5000);
            return () => clearInterval(interval);
        }
    }, [selectedConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch conversations');
            }

            const data = await response.json();
            setConversations(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const fetchMessages = async (conversationId: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/chat/conversations/${conversationId}/messages`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const data = await response.json();
            setMessages(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleSendMessage = async () => {
        if (!selectedConversation || !newMessage.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/chat/conversations/${selectedConversation.id}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: newMessage })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            setNewMessage('');
            await fetchMessages(selectedConversation.id);
            await fetchConversations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        }
    };

    const handleCreateConversation = async () => {
        if (!newSubject.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subject: newSubject })
            });

            if (!response.ok) {
                throw new Error('Failed to create conversation');
            }

            const conversation = await response.json();
            setConversations([conversation, ...conversations]);
            setSelectedConversation(conversation);
            setNewSubject('');
            setOpenNewDialog(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create conversation');
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Support Chat
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">Conversations</Typography>
                            <IconButton onClick={() => setOpenNewDialog(true)} color="primary">
                                <AddIcon />
                            </IconButton>
                        </Box>
                        <Divider />
                        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                            {conversations.map((conversation) => (
                                <ListItem
                                    key={conversation.id}
                                    button
                                    selected={selectedConversation?.id === conversation.id}
                                    onClick={() => setSelectedConversation(conversation)}
                                >
                                    <ListItemText
                                        primary={
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontWeight: conversation.unread_count > 0 ? 'bold' : 'normal'
                                                    }}
                                                >
                                                    {conversation.subject}
                                                </Typography>
                                                {conversation.unread_count > 0 && (
                                                    <Badge
                                                        badgeContent={conversation.unread_count}
                                                        color="primary"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.secondary" noWrap>
                                                    {conversation.last_message}
                                                </Typography>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" color="text.secondary">
                                                        {format(new Date(conversation.updated_at), 'PPp')}
                                                    </Typography>
                                                    <Chip
                                                        label={conversation.status}
                                                        size="small"
                                                        color={conversation.status === 'open' ? 'success' : 'default'}
                                                    />
                                                </Box>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
                        {selectedConversation ? (
                            <>
                                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                    <Typography variant="h6">{selectedConversation.subject}</Typography>
                                </Box>
                                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                                    {messages.map((message) => (
                                        <Box
                                            key={message.id}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: message.sender_role === 'admin' ? 'flex-start' : 'flex-end',
                                                mb: 2
                                            }}
                                        >
                                            <Paper
                                                sx={{
                                                    p: 2,
                                                    maxWidth: '70%',
                                                    bgcolor: message.sender_role === 'admin' ? 'grey.100' : 'primary.light',
                                                    color: message.sender_role === 'admin' ? 'text.primary' : 'white'
                                                }}
                                            >
                                                <Typography variant="body1">{message.content}</Typography>
                                                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                                    {message.sender_first_name} {message.sender_last_name} •{' '}
                                                    {format(new Date(message.created_at), 'PPp')}
                                                </Typography>
                                            </Paper>
                                        </Box>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </Box>
                                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs>
                                            <TextField
                                                fullWidth
                                                placeholder="Type your message..."
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage();
                                                    }
                                                }}
                                                multiline
                                                maxRows={4}
                                            />
                                        </Grid>
                                        <Grid item>
                                            <Button
                                                variant="contained"
                                                endIcon={<SendIcon />}
                                                onClick={handleSendMessage}
                                                disabled={!newMessage.trim()}
                                            >
                                                Send
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </>
                        ) : (
                            <Box
                                display="flex"
                                flexDirection="column"
                                alignItems="center"
                                justifyContent="center"
                                height="100%"
                            >
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Select a conversation or start a new one
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setOpenNewDialog(true)}
                                >
                                    New Conversation
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={openNewDialog} onClose={() => setOpenNewDialog(false)}>
                <DialogTitle>Start New Conversation</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Subject"
                        fullWidth
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenNewDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateConversation} variant="contained" disabled={!newSubject.trim()}>
                        Start
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ChatCenter; 