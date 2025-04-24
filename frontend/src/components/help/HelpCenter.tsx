import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    CircularProgress,
    Alert,
    AlertTitle,
    IconButton,
    Tabs,
    Tab,
    Chip,
    FormControl,
    InputLabel,
    Select
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Help as HelpIcon,
    Chat as ChatIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Article as ArticleIcon,
    LiveHelp as LiveHelpIcon,
    ArrowBack as ArrowBackIcon,
    QuestionAnswer as FAQIcon,
    Book as GuideIcon,
    Support as SupportIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

interface FAQ {
    id: number;
    question: string;
    answer: string;
    category: string;
}

interface Guide {
    id: number;
    title: string;
    content: string;
    category: string;
}

interface Ticket {
    id?: number;
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status?: string;
    created_at?: string;
    updated_at?: string;
    resolution_message?: string;
}

interface TicketMessage {
    id: number;
    ticket_id: number;
    user_id: number | null;
    admin_id: number | null;
    is_admin: boolean;
    message: string;
    created_at: string;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const HelpCenter: React.FC = () => {
    console.log('HelpCenter component rendering');

    const navigate = useNavigate();
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState<number>(0);
    const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
    const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [guides, setGuides] = useState<Guide[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [openTicketDialog, setOpenTicketDialog] = useState<boolean>(false);
    const [ticketData, setTicketData] = useState<Ticket>({
        subject: '',
        description: '',
        priority: 'medium'
    });
    
    // New states for ticket details dialog
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

    useEffect(() => {
        console.log('HelpCenter useEffect running');
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('Fetching help center data...');

                const [faqsResponse, guidesResponse, ticketsResponse] = await Promise.all([
                    api.get('/api/help/faqs'),
                    api.get('/api/help/guides'),
                    api.get('/api/help/tickets')
                ]);

                console.log('FAQs Response:', faqsResponse.data);
                console.log('Guides Response:', guidesResponse.data);
                console.log('Tickets Response:', ticketsResponse.data);

                setFaqs(faqsResponse.data);
                setGuides(guidesResponse.data);
                setTickets(ticketsResponse.data);
            } catch (err: any) {
                console.error('Error fetching help center data:', err);
                setError(err?.response?.data?.message || 'Failed to fetch help center data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleCreateTicket = async () => {
        try {
            setError(null);
            const response = await api.post('/api/help/tickets', ticketData);

            const newTicket = response.data;
            setTickets(prev => [...prev, newTicket]);
            setOpenTicketDialog(false);
            setTicketData({
                subject: '',
                description: '',
                priority: 'medium'
            });
        } catch (err: any) {
            console.error('Error creating ticket:', err);
            setError(err?.response?.data?.message || 'Failed to create ticket');
        }
    };

    // Add function to fetch ticket messages
    const fetchTicketMessages = async (ticketId: number) => {
        try {
            setLoadingMessages(true);
            console.log(`Fetching messages for ticket ${ticketId}...`);
            
            // First check if the ticket_messages table exists using the debug endpoint
            const tableCheckResponse = await api.get('/api/help/debug/ticket-messages');
            console.log('Ticket messages table check:', tableCheckResponse.data);
            
            const tableExists = tableCheckResponse.data?.tableExists;
            
            if (!tableExists) {
                console.log('The ticket_messages table does not exist! Creating it...');
                
                // Try to initialize the table and add a message for this ticket
                const initResponse = await api.post('/api/help/debug/initialize-tickets', {
                    ticketId: ticketId,
                    message: "Your issue has been resolved by our support team."
                });
                console.log('Initialization response:', initResponse.data);
                
                if (initResponse.data.messageAdded) {
                    console.log('Successfully added an admin message to the ticket');
                }
            }
            
            // Now try to fetch the messages
            const response = await api.get(`/api/help/tickets/${ticketId}/messages`);
            console.log('Ticket messages response:', response.data);
            setTicketMessages(response.data);
            
            // If no resolution message in ticket but we have admin messages, check for them
            if (!selectedTicket?.resolution_message && response.data.length > 0) {
                const adminMessages = response.data.filter((msg: TicketMessage) => msg.is_admin);
                console.log('Admin messages found:', adminMessages.length, adminMessages);
                
                // If still no messages and the ticket is resolved/closed, add a fallback message
                if (adminMessages.length === 0 && 
                    selectedTicket && 
                    ['resolved', 'closed'].includes(selectedTicket.status as string)) {
                    console.log('No admin messages found, but ticket is resolved/closed');
                    
                    // Try to add a message for this resolved ticket
                    try {
                        await api.post('/api/help/debug/initialize-tickets', {
                            ticketId: ticketId,
                            message: "Your issue has been resolved by our support team."
                        });
                        
                        // Fetch messages again after adding the message
                        const refreshResponse = await api.get(`/api/help/tickets/${ticketId}/messages`);
                        console.log('Refreshed ticket messages:', refreshResponse.data);
                        setTicketMessages(refreshResponse.data);
                    } catch (err) {
                        console.error('Failed to add fallback message:', err);
                    }
                }
            }
        } catch (err: any) {
            console.error('Error fetching ticket messages:', err.response?.data || err.message || err);
        } finally {
            setLoadingMessages(false);
        }
    };

    // Add function to handle ticket selection
    const handleViewTicket = (ticket: Ticket) => {
        console.log('Opening ticket details:', ticket);
        setSelectedTicket(ticket);
        
        // Clear previous messages
        setTicketMessages([]);
        
        // Only fetch messages if the ticket has an ID
        if (ticket.id) {
            // Slight delay to ensure state is updated before fetching messages
            setTimeout(() => {
                fetchTicketMessages(ticket.id as number);
            }, 100);
        } else {
            console.error('Selected ticket has no ID, cannot fetch messages');
        }
    };

    // Fetch ticket messages whenever selectedTicket changes
    useEffect(() => {
        if (selectedTicket && selectedTicket.id) {
            console.log('Selected ticket changed, fetching messages for:', selectedTicket.id);
            fetchTicketMessages(selectedTicket.id);
        }
    }, [selectedTicket?.id]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <Alert severity="error">
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: '#f7f9fc', minHeight: '100vh' }}>
            {/* Header Banner - Keeping as requested but improving spacing */}
            <Box 
                sx={{
                    bgcolor: '#1976d2',
                    color: 'white',
                    py: 2,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton 
                            color="inherit" 
                            onClick={() => navigate('/dashboard')}
                            sx={{ ml: -1.5, mr: 2 }} // Moved more to the left as requested
                            aria-label="Back to dashboard"
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <LiveHelpIcon sx={{ fontSize: 32, mr: 2 }} />
                        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                            Help Center
                        </Typography>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ py: 4 }}>
                {/* Quick Access Cards - Added for better UX */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={4}>
                        <Card 
                            sx={{ 
                                height: '100%', 
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                borderRadius: 2,
                                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'pointer',
                                '&:hover': {
                                    transform: 'translateY(-5px)',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
                                }
                            }}
                            onClick={() => setTabValue(0)}
                        >
                            <FAQIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                Frequently Asked Questions
                            </Typography>
                            <Typography variant="body2" color="text.secondary" align="center">
                                Find quick answers to common questions about our car sharing service.
                            </Typography>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card 
                            sx={{ 
                                height: '100%', 
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                borderRadius: 2,
                                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'pointer',
                                '&:hover': {
                                    transform: 'translateY(-5px)',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
                                }
                            }}
                            onClick={() => setTabValue(1)}
                        >
                            <GuideIcon sx={{ fontSize: 60, color: '#2e7d32', mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                Help Guides
                            </Typography>
                            <Typography variant="body2" color="text.secondary" align="center">
                                Detailed guides to help you navigate our platform and services.
                            </Typography>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card 
                            sx={{ 
                                height: '100%', 
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                borderRadius: 2,
                                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'pointer',
                                '&:hover': {
                                    transform: 'translateY(-5px)',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
                                }
                            }}
                            onClick={() => navigate('/dashboard/chat')}
                        >
                            <ChatIcon sx={{ fontSize: 60, color: '#d32f2f', mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                Live Support
                            </Typography>
                            <Typography variant="body2" color="text.secondary" align="center">
                                Chat with our support team for immediate assistance.
                            </Typography>
                        </Card>
                    </Grid>
                </Grid>

                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 0, 
                        borderRadius: 3, 
                        overflow: 'hidden',
                        boxShadow: '0 2px 20px rgba(0,0,0,0.08)'
                    }}
                >
                    <Box 
                        sx={{ 
                            bgcolor: '#f0f4f8', 
                            p: 2, 
                            borderBottom: '1px solid rgba(0,0,0,0.08)'
                        }}
                    >
                    <Tabs
                        value={tabValue}
                        onChange={(_, newValue) => setTabValue(newValue)}
                            variant="fullWidth"
                            sx={{ 
                                '& .MuiTab-root': {
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    '&.Mui-selected': {
                                        color: '#1976d2',
                                    }
                                },
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    borderRadius: 1.5
                                }
                            }}
                    >
                            <Tab 
                                icon={<FAQIcon />} 
                                label="FAQs" 
                                iconPosition="start" 
                                sx={{ 
                                    borderRadius: 1,
                                    '&.Mui-selected': { bgcolor: 'rgba(25, 118, 210, 0.08)' }
                                }}
                            />
                            <Tab 
                                icon={<GuideIcon />} 
                                label="Help Guides" 
                                iconPosition="start" 
                                sx={{ 
                                    borderRadius: 1,
                                    '&.Mui-selected': { bgcolor: 'rgba(25, 118, 210, 0.08)' }
                                }}
                            />
                            <Tab 
                                icon={<SupportIcon />} 
                                label="Support Tickets" 
                                iconPosition="start" 
                                sx={{ 
                                    borderRadius: 1,
                                    '&.Mui-selected': { bgcolor: 'rgba(25, 118, 210, 0.08)' }
                                }}
                            />
                    </Tabs>
                    </Box>

                    {/* FAQs Section - Improved UI */}
                    <TabPanel value={tabValue} index={0}>
                        <Box sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 600, mb: 3 }}>
                                Frequently Asked Questions
                            </Typography>
                            {faqs.map((faq, index) => (
                            <Accordion 
                                key={faq.id} 
                                sx={{ 
                                        mb: 2,
                                        borderRadius: '8px!important',
                                        overflow: 'hidden',
                                    '&:before': {
                                        display: 'none',
                                    },
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        '&.Mui-expanded': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{ 
                                        bgcolor: 'white',
                                            '&:hover': { bgcolor: '#f8f9fc' },
                                            '&.Mui-expanded': {
                                                bgcolor: '#f0f7ff',
                                            },
                                            p: 1.5,
                                    }}
                                >
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography sx={{ 
                                                color: 'text.primary', 
                                                fontWeight: 500, 
                                                fontSize: '1.05rem' 
                                            }}>
                                                {faq.question}
                                            </Typography>
                                        </Box>
                                </AccordionSummary>
                                    <AccordionDetails sx={{ p: 3, pb: 2, bgcolor: 'white' }}>
                                        <Typography sx={{ color: 'text.primary', mb: 2 }}>
                                        {faq.answer}
                                    </Typography>
                                    <Chip
                                        label={faq.category}
                                        size="small"
                                            sx={{ 
                                                mt: 1,
                                                bgcolor: '#e3f2fd',
                                                color: '#1976d2',
                                                fontWeight: 500
                                            }}
                                    />
                                </AccordionDetails>
                            </Accordion>
                        ))}
                        </Box>
                    </TabPanel>

                    {/* Help Guides Section - Improved UI */}
                    <TabPanel value={tabValue} index={1}>
                        <Box sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 600, mb: 3 }}>
                                Help Guides
                            </Typography>
                        <Grid container spacing={3}>
                            {guides.map((guide) => (
                                    <Grid item xs={12} sm={6} md={4} key={guide.id}>
                                        <Card sx={{ 
                                            height: '100%', 
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 6px 16px rgba(0,0,0,0.1)'
                                            }
                                        }}>
                                            <Box sx={{ 
                                                p: 1, 
                                                bgcolor: '#e3f2fd',
                                                borderBottom: '1px solid #e0e0e0'
                                            }}>
                                            <Chip
                                                label={guide.category}
                                                size="small"
                                                    sx={{ 
                                                        bgcolor: 'white',
                                                        fontWeight: 500,
                                                        color: '#1976d2'
                                                    }}
                                            />
                                            </Box>
                                            <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                                <Typography 
                                                    variant="h6" 
                                                    gutterBottom 
                                                    sx={{ 
                                                        color: 'text.primary', 
                                                        fontWeight: 600,
                                                        mb: 2
                                                    }}
                                                >
                                                    {guide.title}
                                                </Typography>
                                                <Typography 
                                                    variant="body2"
                                                    sx={{ 
                                                        color: 'text.secondary',
                                                        mb: 2,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient: 'vertical',
                                                    }}
                                                >
                                                    {guide.content}
                                                </Typography>
                                        </CardContent>
                                            <CardActions sx={{ p: 2, pt: 0 }}>
                                            <Button 
                                                    size="medium" 
                                                    variant="outlined"
                                                color="primary"
                                                onClick={() => setSelectedGuide(guide)}
                                                    sx={{ 
                                                        fontWeight: 500, 
                                                        borderRadius: 1.5,
                                                        textTransform: 'none'
                                                    }}
                                            >
                                                    Read Guide
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                        </Box>
                    </TabPanel>

                    {/* Support Tickets Section - Improved UI */}
                    <TabPanel value={tabValue} index={2}>
                        <Box sx={{ p: 2 }}>
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                mb: 3
                            }}>
                                <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 600 }}>
                                    Your Support Tickets
                                </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setOpenTicketDialog(true)}
                                    startIcon={<SupportIcon />}
                                    sx={{ 
                                        fontWeight: 500, 
                                        px: 3, 
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)'
                                    }}
                        >
                            Create New Ticket
                        </Button>
                            </Box>

                            {tickets.length === 0 ? (
                                <Box 
                                    sx={{ 
                                        p: 6, 
                                        textAlign: 'center', 
                                        bgcolor: '#f8f9fa',
                                        borderRadius: 2
                                    }}
                                >
                                    <SupportIcon sx={{ fontSize: 60, color: '#9e9e9e', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        No Support Tickets Yet
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                        Create a new ticket if you need assistance with our services.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => setOpenTicketDialog(true)}
                                        sx={{ 
                                            fontWeight: 500, 
                                            px: 3, 
                                            py: 1,
                                            borderRadius: 2,
                                            textTransform: 'none'
                                        }}
                                    >
                                        Create Your First Ticket
                                    </Button>
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                            {tickets.map((ticket) => (
                                <Grid item xs={12} key={ticket.id}>
                                            <Card sx={{ 
                                                p: 0, 
                                                borderRadius: 2,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                '&:hover': {
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                }
                                            }}>
                                                <CardContent sx={{ p: 0 }}>
                                                    <Box sx={{ 
                                                        p: 2, 
                                                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        bgcolor: '#f8f9fa'
                                                    }}>
                                                        <Typography 
                                                            variant="h6" 
                                                            sx={{ 
                                                                fontWeight: 500,
                                                                color: 'text.primary'
                                                            }}
                                                        >
                                                {ticket.subject}
                                            </Typography>
                                                        <Chip
                                                            label={ticket.status || 'Open'}
                                                            color={
                                                                ticket.status === 'resolved' ? 'success' :
                                                                ticket.status === 'in progress' ? 'info' :
                                                                ticket.status === 'closed' ? 'default' :
                                                                'warning'
                                                            }
                                                            sx={{ fontWeight: 500 }}
                                                        />
                                                    </Box>
                                                    <Box sx={{ p: 3 }}>
                                                        <Typography 
                                                            variant="body1" 
                                                            color="text.secondary"
                                                            sx={{ mb: 2 }}
                                                        >
                                                {ticket.description}
                                            </Typography>
                                                        <Box sx={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}>
                                                <Chip
                                                                label={`Priority: ${ticket.priority}`}
                                                                size="small"
                                                    color={
                                                        ticket.priority === 'urgent' ? 'error' :
                                                        ticket.priority === 'high' ? 'warning' :
                                                                    ticket.priority === 'medium' ? 'info' :
                                                        'default'
                                                    }
                                                                sx={{ fontWeight: 500 }}
                                                />
                                                            
                                                            <Typography variant="caption" color="text.secondary">
                                                                {ticket.created_at ? `Created: ${new Date(ticket.created_at).toLocaleDateString()}` : ''}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Button 
                                                                variant="outlined" 
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => handleViewTicket(ticket)}
                                                                sx={{ borderRadius: 2, textTransform: 'none' }}
                                                            >
                                                                View Details
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                </Grid>
                            ))}
                        </Grid>
                            )}
                        </Box>
                    </TabPanel>
                </Paper>
            </Container>

            {/* Guide Dialog - Improved UI */}
            <Dialog
                open={Boolean(selectedGuide)}
                onClose={() => setSelectedGuide(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden'
                    }
                }}
            >
                {selectedGuide && (
                    <>
                        <DialogTitle 
                            sx={{ 
                                bgcolor: '#1976d2',
                                color: 'white',
                                py: 2.5
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <GuideIcon sx={{ mr: 1 }} />
                                <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                                    {selectedGuide.title}
                                </Typography>
                            </Box>
                        </DialogTitle>
                        <DialogContent sx={{ p: 4 }}>
                            <Typography 
                                sx={{ 
                                    color: 'text.primary', 
                                    whiteSpace: 'pre-line',
                                    fontSize: '1rem',
                                    lineHeight: 1.7
                                }}
                            >
                                {selectedGuide.content}
                                {selectedGuide.title === "Booking Process" && `
                                
                                Step 1: Search for Available Cars
                                - Enter your location and desired rental dates
                                - Browse through available vehicles in your area
                                - Use filters to narrow down your search

                                Step 2: Select Your Car
                                - Review vehicle details, features, and pricing
                                - Check availability for your desired dates
                                - View car photos and specifications

                                Step 3: Book and Confirm
                                - Select your rental duration
                                - Review the total cost
                                - Confirm your booking
                                - Receive booking confirmation via email

                                Step 4: Pick Up
                                - Follow the pick-up instructions
                                - Complete the vehicle inspection
                                - Start your journey

                                Step 5: Return
                                - Return the car to the designated location
                                - Complete the return inspection
                                - End your booking
                                `}

                                {selectedGuide.title === "Getting Started Guide" && `
                                
                                1. Create Your Account
                                - Sign up with your email
                                - Verify your identity
                                - Add your driver's license
                                - Complete your profile

                                2. Payment Setup
                                - Add a payment method
                                - Verify your payment details
                                - Set up automatic payments

                                3. First Booking
                                - Search for available cars
                                - Choose your preferred vehicle
                                - Make your first reservation
                                - Get familiar with the booking process

                                4. Using the Service
                                - Download our mobile app
                                - Learn about our features
                                - Understand our policies
                                - Know where to get help
                                `}

                                {selectedGuide.title === "Insurance Guide" && `
                                
                                Understanding Your Coverage
                                - Basic insurance included with every booking
                                - Additional coverage options
                                - What's covered and what's not
                                - Liability limits

                                Insurance Options
                                1. Standard Coverage (Included)
                                - Third-party liability
                                - Basic collision coverage
                                - Minimum deductible

                                2. Premium Coverage (Optional)
                                - Reduced deductible
                                - Additional driver coverage
                                - Personal accident insurance
                                - Personal effects coverage

                                3. Super Premium (Optional)
                                - Zero deductible
                                - Full coverage
                                - Roadside assistance
                                - Glass and tire protection

                                Making a Claim
                                - How to report an incident
                                - Required documentation
                                - Claims process
                                - Emergency contacts
                                `}
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                            <Button 
                                onClick={() => setSelectedGuide(null)} 
                                variant="contained"
                                sx={{ 
                                    fontWeight: 500, 
                                    px: 3, 
                                    borderRadius: 2,
                                    textTransform: 'none'
                                }}
                            >
                                Close Guide
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Support Ticket Dialog - Improved UI */}
            <Dialog 
                open={openTicketDialog} 
                onClose={() => setOpenTicketDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle 
                    sx={{ 
                        bgcolor: '#1976d2',
                        color: 'white',
                        py: 2.5
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SupportIcon sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            Create Support Ticket
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 3, pt: 4 }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Subject"
                        placeholder="Brief description of your issue"
                        fullWidth
                        value={ticketData.subject}
                        onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                        sx={{ mb: 3 }}
                        InputProps={{
                            sx: { borderRadius: 1.5 }
                        }}
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        placeholder="Please provide details about your issue..."
                        fullWidth
                        multiline
                        rows={5}
                        value={ticketData.description}
                        onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                        sx={{ mb: 3 }}
                        InputProps={{
                            sx: { borderRadius: 1.5 }
                        }}
                    />
                    <FormControl fullWidth sx={{ mb: 1 }}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                            value={ticketData.priority}
                        label="Priority"
                        onChange={(e) => setTicketData({ ...ticketData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                            sx={{ borderRadius: 1.5 }}
                    >
                            <MenuItem value="low">Low Priority</MenuItem>
                            <MenuItem value="medium">Medium Priority</MenuItem>
                            <MenuItem value="high">High Priority</MenuItem>
                            <MenuItem value="urgent">Urgent Priority</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                    <Button 
                        onClick={() => setOpenTicketDialog(false)}
                        variant="outlined"
                        sx={{ 
                            px: 3, 
                            borderRadius: 2,
                            textTransform: 'none'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleCreateTicket} 
                        variant="contained"
                        disabled={!ticketData.subject || !ticketData.description}
                        sx={{ 
                            px: 3, 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            boxShadow: 2
                        }}
                    >
                        Create Ticket
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add this Ticket Detail Dialog near the end of the component, before the closing tag */}
            <Dialog
                open={Boolean(selectedTicket)}
                onClose={() => setSelectedTicket(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden'
                    }
                }}
            >
                {selectedTicket && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">Ticket: {selectedTicket.subject}</Typography>
                            <Chip 
                                label={selectedTicket.status} 
                                color={
                                    (() => {
                                        const status = selectedTicket.status as string;
                                        switch(status) {
                                            case 'open': return 'primary';
                                            case 'in progress': return 'warning';
                                            case 'resolved': return 'success';
                                            case 'closed': return 'default';
                                            default: return 'default';
                                        }
                                    })()
                                }
                                size="small" 
                            />
                        </DialogTitle>
                        <DialogContent sx={{ p: 0 }}>
                            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                    Description
                                </Typography>
                                <Typography variant="body1">
                                    {selectedTicket.description}
                                </Typography>
                            </Box>
                            
                            {/* Display Admin's Resolution Message if ticket is resolved or closed */}
                            {(['resolved', 'closed'].includes(selectedTicket.status as string)) && (
                                <Box sx={{ p: 3, bgcolor: '#f8f9fa', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                        Admin Resolution
                                    </Typography>
                                    <Alert severity={(selectedTicket.status as string) === 'resolved' ? 'success' : 'info'} sx={{ mb: 2 }}>
                                        <AlertTitle>This ticket has been {selectedTicket.status}</AlertTitle>
                                        {(selectedTicket.status as string) === 'resolved' 
                                            ? 'The issue has been resolved by our support team.' 
                                            : 'This ticket has been closed by our support team.'}
                                    </Alert>
                                    
                                    {/* Admin message box - Always visible for resolved/closed tickets */}
                                    <Box sx={{ 
                                        p: 3, 
                                        bgcolor: '#e3f2fd', 
                                        borderRadius: 2,
                                        borderLeft: '4px solid #1976d2',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}>
                                        <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>
                                            Message from support team:
                                        </Typography>
                                        <Typography variant="body1">
                                            {(selectedTicket.status as string) === 'resolved' 
                                                ? 'The issue has been resolved by our support team. Thank you for your patience!' 
                                                : 'This ticket has been closed. If you need further assistance, please create a new ticket.'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                            Sent: {selectedTicket.updated_at ? new Date(selectedTicket.updated_at).toLocaleString() : new Date().toLocaleString()}
                                        </Typography>
                                    </Box>
                                    
                                    {/* Dynamic messages from backend if available */}
                                    {loadingMessages ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : (
                                        <>
                                            {/* Display any available messages */}
                                            {ticketMessages && ticketMessages.length > 0 && ticketMessages.some(msg => msg.is_admin) && (
                                                <Paper 
                                                    elevation={1} 
                                                    sx={{ 
                                                        p: 2, 
                                                        mt: 2,
                                                        bgcolor: 'white', 
                                                        borderRadius: 2, 
                                                        borderLeft: '4px solid #4caf50',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                                                        Additional messages from support:
                                                    </Typography>
                                                    {ticketMessages
                                                        .filter(msg => msg.is_admin)
                                                        .map((message, index) => (
                                                            <Box key={index} sx={{ mb: 2 }}>
                                                                <Typography variant="body1">{message.message}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {new Date(message.created_at).toLocaleString()}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                </Paper>
                                            )}
                                        </>
                                    )}
                                </Box>
                            )}
                            
                            <Box sx={{ p: 3 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Ticket Information
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" color="text.secondary">Created:</Typography>
                                                <Typography variant="body2">
                                                    {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : 'N/A'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" color="text.secondary">Last Updated:</Typography>
                                                <Typography variant="body2">
                                                    {selectedTicket.updated_at ? new Date(selectedTicket.updated_at).toLocaleString() : 'N/A'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="text.secondary">Priority:</Typography>
                                                <Chip
                                                    label={selectedTicket.priority}
                                                    size="small"
                                                    color={
                                                        selectedTicket.priority === 'urgent' ? 'error' :
                                                        selectedTicket.priority === 'high' ? 'warning' :
                                                        selectedTicket.priority === 'medium' ? 'info' :
                                                        'default'
                                                    }
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                What's Next?
                                            </Typography>
                                            <Typography variant="body2" paragraph>
                                                {selectedTicket.status === 'open' && 'Your ticket is being reviewed by our support team. We will respond as soon as possible.'}
                                                {selectedTicket.status === 'in progress' && 'Our team is currently working on your ticket. We will update you soon.'}
                                                {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && 'This ticket has been resolved. If you need further assistance, please create a new ticket.'}
                                            </Typography>
                                            {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                                                <Button 
                                                    variant="contained" 
                                                    size="small" 
                                                    fullWidth
                                                    onClick={() => {
                                                        setSelectedTicket(null);
                                                        setOpenTicketDialog(true);
                                                    }}
                                                    sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}
                                                >
                                                    Create New Ticket
                                                </Button>
                                            )}
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Box>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                            <Button 
                                onClick={() => setSelectedTicket(null)} 
                                variant="contained"
                                sx={{ 
                                    fontWeight: 500, 
                                    px: 3, 
                                    borderRadius: 2,
                                    textTransform: 'none'
                                }}
                            >
                                Close
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default HelpCenter; 