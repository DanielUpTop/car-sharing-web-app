import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Avatar,
    IconButton,
    Divider,
    CircularProgress,
    Badge
} from '@mui/material';
import {
    Send as SendIcon,
    AttachFile as AttachFileIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/config';

interface Message {
    id: number;
    content: string;
    senderId: number;
    senderName: string;
    timestamp: string;
    isAdmin: boolean;
}

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isWsConnected, setIsWsConnected] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const ws = useRef<WebSocket | null>(null);

    console.log('[Render] Chat component rendering. isWsConnected:', isWsConnected);

    // Effect specifically to log isWsConnected changes
    useEffect(() => {
        console.log(`[Effect] isWsConnected changed to: ${isWsConnected}`);
    }, [isWsConnected]);

    // Effect for WebSocket connection management
    useEffect(() => {
        let localIsMounted = true; // Flag for async operations

        const connectWebSocket = () => {
            // Prevent multiple connections
            if (ws.current && ws.current.readyState !== WebSocket.CLOSED && ws.current.readyState !== WebSocket.CLOSING) {
                console.log('WebSocket already connecting or open.');
                return; 
            }
            
            console.log('Attempting to connect to WebSocket...');
            // Important: Fixed WebSocket URL to match exactly what the backend expects
            ws.current = new WebSocket('ws://localhost:5001/ws/chat');
            console.log('WebSocket object created. Initial readyState:', ws.current?.readyState);

            // Assign handlers
            ws.current.onopen = () => {
                if (!localIsMounted) return;
                console.log('WebSocket opened! readyState:', ws.current?.readyState);
                console.log('>>> ABOUT TO SET isWsConnected to true <<<'); 
                setIsWsConnected(true);
                // Ensure connection is open before sending
                if (ws.current && ws.current.readyState === WebSocket.OPEN && token) {
                    try {
                        console.log('Sending authentication token...');
                        ws.current.send(JSON.stringify({ type: 'auth', token }));
                        console.log('Sent authentication token successfully.');
                    } catch (error) {
                        console.error('Error sending auth message:', error);
                    }
                } else {
                    console.warn('WebSocket not open or token missing when trying to send auth.');
                }
            };

            ws.current.onmessage = (event) => {
                 if (!localIsMounted) return;
                 console.log('[onmessage] Received data. Current isWsConnected:', isWsConnected);
                 try {
                     const data = JSON.parse(event.data);
                     console.log('Received raw websocket data:', data);

                     if (data.type === 'message' && data.message) {
                         const receivedMsg = data.message;
                         console.log('Processing received message object:', receivedMsg);

                         // Validate expected message structure (add more checks as needed)
                         if (typeof receivedMsg === 'object' && receivedMsg.id && receivedMsg.content) {
                             // Ensure correct types before adding to state
                             const formattedMsg: Message = {
                                 id: Number(receivedMsg.id),
                                 content: String(receivedMsg.content),
                                 senderId: Number(receivedMsg.senderId),
                                 senderName: String(receivedMsg.senderName || 'Unknown'),
                                 timestamp: String(receivedMsg.timestamp || new Date().toISOString()),
                                 isAdmin: Boolean(receivedMsg.isAdmin)
                             };
                             
                             console.log('Adding formatted message to state:', formattedMsg);
                             setMessages(prev => {
                                 console.log('Previous messages state:', prev);
                                 const newState = [...prev, formattedMsg];
                                 console.log('New messages state:', newState);
                                 return newState;
                             });
                         } else {
                             console.error('Received message object has unexpected structure:', receivedMsg);
                         }
                     } else if (data.type === 'auth_success') {
                         console.log('WebSocket authentication successful.');
                     } else if (data.type === 'typing') {
                         setIsTyping(data.isTyping);
                     } else if (data.type === 'error') {
                         console.error('Received error message from WebSocket:', data.message);
                         setError(data.message || 'An error occurred via WebSocket.');
                     } else {
                         console.warn('Received unknown WebSocket message type:', data.type);
                     }
                 } catch (error) {
                     console.error('Error parsing websocket message or updating state:', error);
                 }
            };

            ws.current.onerror = (error) => {
                 if (!localIsMounted) return;
                console.error('WebSocket error event! readyState:', ws.current?.readyState, error);
                console.log('Setting isWsConnected to false due to error');
                setError('Connection error. Please try again.');
                setIsWsConnected(false);
            };

            ws.current.onclose = (event) => {
                 if (!localIsMounted) return;
                console.log(`WebSocket connection closed. readyState: ${ws.current?.readyState}, Code: ${event.code}, Reason: ${event.reason}`);
                 console.log('Setting isWsConnected to false due to close');
                setIsWsConnected(false);
            };
        };

        // Connect immediately on effect run
        if (!token) {
             navigate('/login');
        } else {
             loadChatHistory();
             connectWebSocket();
        }

        return () => {
            localIsMounted = false;
            console.log('>>> Running useEffect cleanup...');
             // Use the previous refined cleanup logic (check state before closing)
             if (ws.current && 
                (ws.current.readyState === WebSocket.OPEN || 
                 ws.current.readyState === WebSocket.CONNECTING)) 
             {
                 console.log('   Cleanup: Closing WebSocket connection.');
                 ws.current.close(1000); 
             } else {
                 console.log('   Cleanup: WebSocket already closed or closing/closed. State:', ws.current?.readyState);
             }
        };
    }, [token]); // Keep only token dependency

    // Effect for scrolling to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]); // This is CORRECTLY placed outside the main useEffect

    // Add a debug function to check message state
    useEffect(() => {
        // Debug logging for messages array
        if (messages.length > 0) {
            console.log('Current messages:', messages.length);
            console.log('Last message:', messages[messages.length - 1]);
        }
    }, [messages]);

    const loadChatHistory = async () => {
        // Reset states at the beginning of the load attempt
        setIsLoading(true); 
        setError(null); 
        console.log('Attempting to load chat history...');
        let historyLoaded = false;

        // --- Try Primary Endpoint --- 
        try {
            console.log('Fetching primary chat history...');
            const response = await fetch('http://localhost:5001/api/chat/history', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000) // Add a timeout
            });
            
            if (response.ok) {
                const data = await response.json();
                // Basic validation of received data
                if (Array.isArray(data)) { 
                    console.log('Primary chat history loaded:', data.length, 'messages');
                    setMessages(data);
                    historyLoaded = true;
                } else {
                    console.warn('Primary history endpoint returned non-array data:', data);
                    // Don't set error yet, try fallback
                }
            } else {
                console.warn('Primary chat history response not ok:', response.status, response.statusText);
                // Don't set error yet, try fallback
            }
        } catch (mainError) {
            // Type guard for error object
            if (mainError instanceof Error && mainError.name === 'AbortError') {
                console.warn('Primary history fetch timed out.');
            } else {
                console.error('Error fetching from primary endpoint:', mainError);
            }
             // Don't set error yet, try fallback
        }

        // --- Try Fallback Endpoint (if primary failed) --- 
        if (!historyLoaded) {
            try {
                console.log('Trying simplified chat history endpoint...');
                const fallbackResponse = await fetch('http://localhost:5001/api/simple-chat-history', {
                     signal: AbortSignal.timeout(5000) // Add a timeout
                });
                
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                     if (Array.isArray(fallbackData)) { 
                        console.log('Simplified chat history loaded:', fallbackData.length, 'messages');
                        setMessages(fallbackData);
                        historyLoaded = true; // Mark as loaded even if fallback
                    } else {
                         console.warn('Simplified history endpoint returned non-array data:', fallbackData);
                         setError('Failed to process chat history format.');
                    }
                } else {
                    console.error('Simplified endpoint also failed:', fallbackResponse.status);
                    setError('Could not load initial chat history.'); // Set error only if both fail
                }
            } catch (fallbackError) {
                 // Type guard for error object
                 if (fallbackError instanceof Error && fallbackError.name === 'AbortError') {
                    console.warn('Simplified history fetch timed out.');
                } else {
                    console.error('Error loading simplified chat history:', fallbackError);
                }
                setError('Failed to load chat history data.'); // Set error only if both fail
            }
        }

        // --- Final State Update --- 
        // Always set loading to false after attempts are complete
        console.log('Finished loading history attempts. Setting isLoading to false.');
        setIsLoading(false); 
        // Scroll to bottom only if history was actually loaded
        if (historyLoaded) { 
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !ws.current || !isWsConnected) {
            console.warn('Send blocked: Message empty or WS not connected.');
            return;
        }

        try {
            const messageContent = newMessage.trim();
            setNewMessage('');
            
            // Create a message object for the UI
            const userMessage: Message = {
                id: Date.now(),
                content: messageContent,
                senderId: user?.id || 0,
                senderName: `${user?.first_name || ''} ${user?.last_name || ''}`,
                timestamp: new Date().toISOString(),
                isAdmin: false
            };
            
            // Add user message to UI immediately
            setMessages(prevMessages => [...prevMessages, userMessage]);
            scrollToBottom();
            
            // Send the message via WebSocket
            const messageToSend = {
                type: 'message',
                message: {
                    content: messageContent,
                    senderId: user?.id,
                    senderName: `${user?.first_name} ${user?.last_name}`,
                    timestamp: new Date().toISOString(),
                    isAdmin: false
                }
            };
            console.log('Sending message via WebSocket:', messageToSend);
            ws.current.send(JSON.stringify(messageToSend));
            
            // Add system message after a short delay
            setTimeout(() => {
                console.log('Adding system message...');
                const systemMessage: Message = {
                    id: Date.now() + 1000, // Ensure unique ID
                    content: "The admin team will get back to you as soon as possible",
                    senderId: 0,
                    senderName: "System",
                    timestamp: new Date().toISOString(),
                    isAdmin: true
                };
                console.log('System message:', systemMessage);
                setMessages(prevMessages => {
                    console.log('Previous messages before adding system:', prevMessages.length);
                    const newMessages = [...prevMessages, systemMessage];
                    console.log('New messages after adding system:', newMessages.length);
                    return newMessages;
                });
                scrollToBottom();
            }, 1000);

            // Also send via REST API as fallback (optional, keep if needed)
            try {
                 fetch('http://localhost:5001/api/simple-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        content: messageContent,
                        userId: user?.id,
                        userName: `${user?.first_name} ${user?.last_name}`
                    })
                });
            } catch (restError) {
                console.log('REST fallback send failed, but message sent via WebSocket');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            if (error instanceof DOMException && error.name === 'InvalidStateError') {
                 setError('Cannot send message: Connection is not open.');
                 setIsWsConnected(false);
            } else {
                 setError('Failed to send message. Please try again.');
            }
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    console.log('[Render] Preparing to return JSX. isWsConnected:', isWsConnected, 'ws.current readyState:', ws.current?.readyState);

    if (!user) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Please log in to use the chat.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper 
                elevation={2} 
                sx={{ 
                    p: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    bgcolor: '#1976d2',
                    color: 'white'
                }}
            >
                <IconButton color="inherit" onClick={() => navigate('/dashboard')}>
                    <ArrowBackIcon />
                </IconButton>
                <Avatar sx={{ bgcolor: '#fff', color: '#1976d2' }}>S</Avatar>
                <Box>
                    <Typography variant="h6">Support Chat</Typography>
                    {isTyping && (
                        <Typography variant="caption">Support agent is typing...</Typography>
                    )}
                </Box>
            </Paper>

            {/* Messages */}
            <Box sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                bgcolor: '#f9f9f9',
                backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.01) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress sx={{ color: '#1976d2', mb: 3 }} />
                        <Typography variant="body1" sx={{ mb: 2 }}>Connecting to chat service...</Typography>
                        <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => {
                                // Force reload with explicit error handling
                                setError(null);
                                loadChatHistory();
                                
                                // Force WebSocket reconnection
                                if (ws.current) {
                                    ws.current.close();
                                }
                                
                                // Try to set up WebSocket again
                                const wsUrl = 'ws://localhost:5001/ws/chat';
                                ws.current = new WebSocket(wsUrl);
                                
                                // Basic handlers
                                ws.current.onopen = () => {
                                    setIsWsConnected(true);
                                    setIsLoading(false);
                                    if (token) {
                                        ws.current?.send(JSON.stringify({ type: 'auth', token }));
                                    }
                                };
                                
                                ws.current.onerror = () => {
                                    setError('Unable to connect to chat service. Try again later.');
                                    setIsLoading(false);
                                };
                            }}
                        >
                            Reconnect
                        </Button>
                    </Box>
                ) : error ? (
                    <Box sx={{ 
                        p: 3, 
                        textAlign: 'center', 
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 2,
                        boxShadow: 1
                    }}>
                        <Typography color="error">{error}</Typography>
                        <Button 
                            variant="outlined" 
                            color="primary" 
                            sx={{ mt: 2 }}
                            onClick={loadChatHistory}
                        >
                            Try Again
                        </Button>
                    </Box>
                ) : (
                    <>
                        {messages.length === 0 && (
                            <Box 
                                sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    height: '100%',
                                    opacity: 0.8
                                }}
                            >
                                <Typography variant="h6" color="text.secondary">No messages yet</Typography>
                                <Typography variant="body2" color="text.secondary">Start a conversation with our support team</Typography>
                            </Box>
                        )}
                        {messages.map((message) => (
                            message.senderId === 0 ? (
                                // Special System Message Component
                                <Box
                                    key={message.id}
                                    sx={{
                                        width: '100%',
                                        my: 2,
                                        display: 'flex',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Paper
                                        elevation={1}
                                        sx={{
                                            p: 2,
                                            bgcolor: '#e8f5e9',
                                            border: '1px dashed #4caf50',
                                            borderRadius: 2,
                                            textAlign: 'center',
                                            maxWidth: '80%',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <Typography variant="body2" fontStyle="italic" color="text.secondary">
                                            {message.content}
                                        </Typography>
                                    </Paper>
                                </Box>
                            ) : (
                                // Regular User/Admin Message
                            <Box
                                key={message.id}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: message.isAdmin ? 'flex-start' : 'flex-end',
                                    maxWidth: '70%',
                                    alignSelf: message.isAdmin ? 'flex-start' : 'flex-end',
                                }}
                            >
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'flex-start',
                                    flexDirection: message.isAdmin ? 'row' : 'row-reverse',
                                    gap: 1
                                }}>
                                    <Avatar 
                                        sx={{ 
                                            width: 32, 
                                            height: 32,
                                                bgcolor: message.senderId === 0 ? '#4caf50' : (message.isAdmin ? '#1976d2' : '#8bc34a'),
                                            fontSize: '0.875rem',
                                            mt: 0.5
                                }}
                            >
                                            {message.senderId === 0 ? 'S' : (message.isAdmin ? 'S' : user?.first_name?.charAt(0) || 'U')}
                                    </Avatar>
                                <Paper
                                    elevation={1}
                                    sx={{
                                        p: 2,
                                                bgcolor: message.senderId === 0 ? '#e8f5e9' : (message.isAdmin ? 'white' : '#e3f2fd'),
                                            color: 'text.primary',
                                            borderRadius: 2,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            position: 'relative',
                                                fontStyle: message.senderId === 0 ? 'italic' : 'normal',
                                                width: message.senderId === 0 ? '100%' : 'auto',
                                            '&::before': message.isAdmin ? {
                                                content: '""',
                                                position: 'absolute',
                                                top: 10,
                                                left: -8,
                                                borderStyle: 'solid',
                                                borderWidth: '8px 8px 8px 0',
                                                    borderColor: `transparent ${message.senderId === 0 ? '#e8f5e9' : 'white'} transparent transparent`,
                                            } : {
                                                content: '""',
                                                position: 'absolute',
                                                top: 10,
                                                right: -8,
                                                borderStyle: 'solid',
                                                borderWidth: '8px 0 8px 8px',
                                                borderColor: 'transparent transparent transparent #e3f2fd',
                                            }
                                    }}
                                >
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {message.content}
                                        </Typography>
                                </Paper>
                                </Box>
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        mt: 0.5,
                                        px: 1.5,
                                        color: 'text.secondary',
                                        alignSelf: message.isAdmin ? 'flex-start' : 'flex-end',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5
                                    }}
                                >
                                    {message.timestamp && format(new Date(message.timestamp), 'MMM d, h:mm a')}
                                </Typography>
                            </Box>
                            )
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </Box>

            {/* Message Input */}
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 2, 
                    display: 'flex', 
                    gap: 1.5, 
                    alignItems: 'center',
                    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                    bgcolor: 'white',
                    borderRadius: 0
                }}
            >
                <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isWsConnected ? "Type your message..." : "Connecting..."}
                    variant="outlined"
                    size="small"
                    disabled={!isWsConnected}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '20px',
                            backgroundColor: '#f5f5f5',
                            '&:hover': {
                                backgroundColor: '#f0f0f0',
                            },
                            '&.Mui-focused': {
                                backgroundColor: '#fff',
                            }
                        }
                    }}
                />
                <Button
                    variant="contained"
                    sx={{ 
                        borderRadius: '50%', 
                        minWidth: '50px', 
                        width: '50px', 
                        height: '50px',
                        boxShadow: 2
                    }}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !isWsConnected}
                >
                    <SendIcon />
                </Button>
            </Paper>
        </Box>
    );
};

export default Chat; 