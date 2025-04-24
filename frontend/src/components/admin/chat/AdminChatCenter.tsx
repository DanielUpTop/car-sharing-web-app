import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    List,
    ListItem,
    ListItemText,
    Chip,
    Button,
    Grid,
    TextField,
    CircularProgress,
    Divider,
    IconButton,
    Badge
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Close as CloseIcon,
    Reply as ReplyIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Conversation {
    id: number;
    user_email: string;
    first_name: string;
    last_name: string;
    subject: string;
    status: string;
    unread_count: number;
    last_message: string;
    updated_at: string;
}

interface Message {
    id: number;
    content: string;
    sender_email: string;
    sender_first_name: string;
    sender_last_name: string;
    sender_role: string;
    created_at: string;
}

const AdminChatCenter = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/admin/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch conversations');
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

            if (!response.ok) throw new Error('Failed to fetch messages');
            const data = await response.json();
            setMessages(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleSendReply = async () => {
        if (!selectedConversation || !reply.trim()) return;

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
                    body: JSON.stringify({ content: reply })
                }
            );

            if (!response.ok) throw new Error('Failed to send message');
            setReply('');
            await fetchMessages(selectedConversation.id);
            await fetchConversations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        }
    };

    const handleCloseConversation = async (conversationId: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/chat/conversations/${conversationId}/close`,
                {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (!response.ok) throw new Error('Failed to close conversation');
            await fetchConversations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to close conversation');
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Support Management
            </Typography>

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">Conversations</Typography>
                            <IconButton onClick={fetchConversations}>
                                <RefreshIcon />
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
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="subtitle2">
                                                    {conversation.first_name} {conversation.last_name}
                                                </Typography>
                                                <Badge badgeContent={conversation.unread_count} color="primary" />
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.secondary" noWrap>
                                                    {conversation.subject}
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
                                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="h6">
                                            {selectedConversation.subject}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedConversation.first_name} {selectedConversation.last_name} ({selectedConversation.user_email})
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<CloseIcon />}
                                        onClick={() => handleCloseConversation(selectedConversation.id)}
                                        disabled={selectedConversation.status === 'closed'}
                                    >
                                        Close Ticket
                                    </Button>
                                </Box>

                                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                                    {messages.map((message) => (
                                        <Box
                                            key={message.id}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: message.sender_role === 'admin' ? 'flex-end' : 'flex-start',
                                                mb: 2
                                            }}
                                        >
                                            <Paper
                                                sx={{
                                                    p: 2,
                                                    maxWidth: '70%',
                                                    bgcolor: message.sender_role === 'admin' ? 'primary.light' : 'grey.100',
                                                    color: message.sender_role === 'admin' ? 'white' : 'text.primary'
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
                                </Box>

                                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs>
                                            <TextField
                                                fullWidth
                                                placeholder="Type your reply..."
                                                value={reply}
                                                onChange={(e) => setReply(e.target.value)}
                                                disabled={selectedConversation.status === 'closed'}
                                                multiline
                                                maxRows={4}
                                            />
                                        </Grid>
                                        <Grid item>
                                            <Button
                                                variant="contained"
                                                endIcon={<ReplyIcon />}
                                                onClick={handleSendReply}
                                                disabled={!reply.trim() || selectedConversation.status === 'closed'}
                                            >
                                                Reply
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </>
                        ) : (
                            <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                height="100%"
                            >
                                <Typography variant="h6" color="text.secondary">
                                    Select a conversation to view messages
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default AdminChatCenter; 