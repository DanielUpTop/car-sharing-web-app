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
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    CircularProgress,
    Alert,
    Snackbar,
    Tabs,
    Tab,
    Divider,
    AppBar,
    Toolbar,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    ExpandMore as ExpandMoreIcon,
    Category as CategoryIcon,
    Help as HelpIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Define interfaces for our data types
interface Category {
    id: number;
    name: string;
    description: string;
    order: number;
}

interface Article {
    id: number;
    category_id: number;
    title: string;
    content: string;
    order: number;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

const AdminHelpCenter: React.FC = () => {
    const navigate = useNavigate();
    
    // State variables
    const [activeTab, setActiveTab] = useState(0);
    const [categories, setCategories] = useState<Category[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Category dialog states
    const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
    const [categoryFormMode, setCategoryFormMode] = useState<'add' | 'edit'>('add');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: '',
        order: 0
    });
    
    // Article dialog states
    const [openArticleDialog, setOpenArticleDialog] = useState(false);
    const [articleFormMode, setArticleFormMode] = useState<'add' | 'edit'>('add');
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [articleForm, setArticleForm] = useState({
        category_id: 0,
        title: '',
        content: '',
        order: 0,
        is_published: true
    });
    
    // Delete confirmation dialog states
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'article', id: number } | null>(null);
    
    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info' | 'warning'
    });

    // Load data when component mounts
    useEffect(() => {
        fetchCategories();
        fetchArticles();
    }, []);
    
    // Filter articles when search term or category changes
    const filteredArticles = articles.filter(article => {
        if (searchTerm) {
            return article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   article.content.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    // API calls
    const fetchCategories = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/help/categories`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            
            const data = await response.json();
            setCategories(data);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchArticles = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/help/articles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch articles');
            }
            
            const data = await response.json();
            setArticles(data);
        } catch (err) {
            console.error('Error fetching articles:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };
    
    const handleSaveCategory = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const url = categoryFormMode === 'add' 
                ? `${import.meta.env.VITE_API_URL}/api/help/categories` 
                : `${import.meta.env.VITE_API_URL}/api/help/categories/${selectedCategory?.id}`;
            
            const response = await fetch(url, {
                method: categoryFormMode === 'add' ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(categoryForm)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to ${categoryFormMode} category`);
            }
            
            await fetchCategories();
            setOpenCategoryDialog(false);
            setSnackbar({
                open: true,
                message: `Category ${categoryFormMode === 'add' ? 'added' : 'updated'} successfully`,
                severity: 'success'
            });
        } catch (err) {
            console.error(`Error ${categoryFormMode}ing category:`, err);
            setSnackbar({
                open: true,
                message: err instanceof Error ? err.message : `Failed to ${categoryFormMode} category`,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };
    
    const handleSaveArticle = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const url = articleFormMode === 'add' 
                ? `${import.meta.env.VITE_API_URL}/api/help/articles` 
                : `${import.meta.env.VITE_API_URL}/api/help/articles/${selectedArticle?.id}`;
            
            const response = await fetch(url, {
                method: articleFormMode === 'add' ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(articleForm)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to ${articleFormMode} article`);
            }
            
            await fetchArticles();
            setOpenArticleDialog(false);
            setSnackbar({
                open: true,
                message: `Article ${articleFormMode === 'add' ? 'added' : 'updated'} successfully`,
                severity: 'success'
            });
        } catch (err) {
            console.error(`Error ${articleFormMode}ing article:`, err);
            setSnackbar({
                open: true,
                message: err instanceof Error ? err.message : `Failed to ${articleFormMode} article`,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const url = itemToDelete.type === 'category' 
                ? `${import.meta.env.VITE_API_URL}/api/help/categories/${itemToDelete.id}` 
                : `${import.meta.env.VITE_API_URL}/api/help/articles/${itemToDelete.id}`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete ${itemToDelete.type}`);
            }
            
            if (itemToDelete.type === 'category') {
                await fetchCategories();
            } else {
                await fetchArticles();
            }
            
            setOpenDeleteDialog(false);
            setSnackbar({
                open: true,
                message: `${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} deleted successfully`,
                severity: 'success'
            });
        } catch (err) {
            console.error(`Error deleting ${itemToDelete.type}:`, err);
            setSnackbar({
                open: true,
                message: err instanceof Error ? err.message : `Failed to delete ${itemToDelete.type}`,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };
    
    // Helper functions for UI
    const handleAddCategory = () => {
        setCategoryFormMode('add');
        setCategoryForm({
            name: '',
            description: '',
            order: categories.length + 1
        });
        setOpenCategoryDialog(true);
    };
    
    const handleEditCategory = (category: Category) => {
        setCategoryFormMode('edit');
        setSelectedCategory(category);
        setCategoryForm({
            name: category.name,
            description: category.description,
            order: category.order
        });
        setOpenCategoryDialog(true);
    };
    
    const handleAddArticle = () => {
        setArticleFormMode('add');
        setArticleForm({
            category_id: categories.length > 0 ? categories[0].id : 0,
            title: '',
            content: '',
            order: articles.length + 1,
            is_published: true
        });
        setOpenArticleDialog(true);
    };
    
    const handleEditArticle = (article: Article) => {
        setArticleFormMode('edit');
        setSelectedArticle(article);
        setArticleForm({
            category_id: article.category_id,
            title: article.title,
            content: article.content,
            order: article.order,
            is_published: article.is_published
        });
        setOpenArticleDialog(true);
    };
    
    const handleRequestDelete = (type: 'category' | 'article', id: number) => {
        setItemToDelete({ type, id });
        setOpenDeleteDialog(true);
    };
    
    const getCategoryName = (categoryId: number) => {
        const category = categories.find(cat => cat.id === categoryId);
        return category ? category.name : 'Unknown Category';
    };

    // UI rendering
    if (loading && categories.length === 0 && articles.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <AppBar position="fixed" color="default">
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/admin/dashboard')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Help Center Management
                    </Typography>
                </Toolbar>
            </AppBar>
            <Toolbar /> {/* For spacing below AppBar */}
            
            <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}
                
                <Paper sx={{ mb: 4 }}>
                    <Tabs 
                        value={activeTab} 
                        onChange={(_, newValue) => setActiveTab(newValue)}
                        variant="fullWidth"
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label="Categories" icon={<CategoryIcon />} iconPosition="start" />
                        <Tab label="Articles" icon={<HelpIcon />} iconPosition="start" />
                    </Tabs>
                    
                    {/* Categories Tab */}
                    {activeTab === 0 && (
                        <Box sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                <Typography variant="h5" component="h2">
                                    Help Categories
                                </Typography>
                                <Button 
                                    variant="contained" 
                                    startIcon={<AddIcon />} 
                                    onClick={handleAddCategory}
                                >
                                    Add Category
                                </Button>
                            </Box>
                            
                            {categories.length === 0 ? (
                                <Alert severity="info">
                                    No categories yet. Create your first help category to get started.
                                </Alert>
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>ID</TableCell>
                                                <TableCell>Name</TableCell>
                                                <TableCell>Description</TableCell>
                                                <TableCell>Display Order</TableCell>
                                                <TableCell>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {categories.map((category) => (
                                                <TableRow key={category.id}>
                                                    <TableCell>{category.id}</TableCell>
                                                    <TableCell>{category.name}</TableCell>
                                                    <TableCell>{category.description}</TableCell>
                                                    <TableCell>{category.order}</TableCell>
                                                    <TableCell>
                                                        <IconButton 
                                                            onClick={() => handleEditCategory(category)}
                                                            size="small"
                                                            color="primary"
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                        <IconButton 
                                                            onClick={() => handleRequestDelete('category', category.id)}
                                                            size="small"
                                                            color="error"
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}
                    
                    {/* Articles Tab */}
                    {activeTab === 1 && (
                        <Box sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                <Typography variant="h5" component="h2">
                                    Help Articles
                                </Typography>
                                <Box display="flex" gap={2}>
                                    <TextField
                                        placeholder="Search articles..."
                                        variant="outlined"
                                        size="small"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                                        }}
                                    />
                                    <Button 
                                        variant="contained" 
                                        startIcon={<AddIcon />} 
                                        onClick={handleAddArticle}
                                        disabled={categories.length === 0}
                                    >
                                        Add Article
                                    </Button>
                                </Box>
                            </Box>
                            
                            {categories.length === 0 ? (
                                <Alert severity="warning">
                                    You need to create at least one category before you can add articles.
                                </Alert>
                            ) : articles.length === 0 ? (
                                <Alert severity="info">
                                    No articles yet. Add some help articles to assist your users.
                                </Alert>
                            ) : filteredArticles.length === 0 ? (
                                <Alert severity="info">
                                    No articles match your search criteria.
                                </Alert>
                            ) : (
                                <Box>
                                    {categories.map(category => {
                                        const categoryArticles = filteredArticles.filter(
                                            article => article.category_id === category.id
                                        );
                                        
                                        if (categoryArticles.length === 0) return null;
                                        
                                        return (
                                            <Accordion key={category.id} defaultExpanded sx={{ mb: 2 }}>
                                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                    <Typography variant="h6">
                                                        {category.name} ({categoryArticles.length})
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <TableContainer>
                                                        <Table>
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Title</TableCell>
                                                                    <TableCell>Status</TableCell>
                                                                    <TableCell>Order</TableCell>
                                                                    <TableCell>Last Updated</TableCell>
                                                                    <TableCell>Actions</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {categoryArticles.map((article) => (
                                                                    <TableRow key={article.id}>
                                                                        <TableCell>{article.title}</TableCell>
                                                                        <TableCell>
                                                                            <Chip 
                                                                                label={article.is_published ? 'Published' : 'Draft'} 
                                                                                color={article.is_published ? 'success' : 'default'}
                                                                                size="small"
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>{article.order}</TableCell>
                                                                        <TableCell>
                                                                            {new Date(article.updated_at).toLocaleDateString()}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <IconButton 
                                                                                onClick={() => handleEditArticle(article)}
                                                                                size="small"
                                                                                color="primary"
                                                                            >
                                                                                <EditIcon />
                                                                            </IconButton>
                                                                            <IconButton 
                                                                                onClick={() => handleRequestDelete('article', article.id)}
                                                                                size="small"
                                                                                color="error"
                                                                            >
                                                                                <DeleteIcon />
                                                                            </IconButton>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                </AccordionDetails>
                                            </Accordion>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    )}
                </Paper>
            </Container>
            
            {/* Category Dialog */}
            <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {categoryFormMode === 'add' ? 'Add New Category' : 'Edit Category'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Category Name"
                        fullWidth
                        margin="normal"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    />
                    <TextField
                        label="Description"
                        fullWidth
                        margin="normal"
                        multiline
                        rows={3}
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    />
                    <TextField
                        label="Display Order"
                        type="number"
                        fullWidth
                        margin="normal"
                        value={categoryForm.order}
                        onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCategoryDialog(false)} startIcon={<CancelIcon />}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSaveCategory} 
                        variant="contained" 
                        color="primary"
                        disabled={!categoryForm.name.trim()}
                        startIcon={<SaveIcon />}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Article Dialog */}
            <Dialog open={openArticleDialog} onClose={() => setOpenArticleDialog(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    {articleFormMode === 'add' ? 'Add New Article' : 'Edit Article'}
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={articleForm.category_id}
                            label="Category"
                            onChange={(e) => setArticleForm({ ...articleForm, category_id: Number(e.target.value) })}
                        >
                            {categories.map((category) => (
                                <MenuItem key={category.id} value={category.id}>
                                    {category.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    <TextField
                        label="Title"
                        fullWidth
                        margin="normal"
                        value={articleForm.title}
                        onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                    />
                    
                    <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Content</Typography>
                        <ReactQuill 
                            theme="snow" 
                            value={articleForm.content} 
                            onChange={(content) => setArticleForm({ ...articleForm, content })}
                            style={{ height: '300px', marginBottom: '50px' }}
                        />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mt: 6 }}>
                        <TextField
                            label="Display Order"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={articleForm.order}
                            onChange={(e) => setArticleForm({ ...articleForm, order: parseInt(e.target.value) || 0 })}
                        />
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={articleForm.is_published}
                                label="Status"
                                onChange={(e) => setArticleForm({ ...articleForm, is_published: Boolean(e.target.value) })}
                            >
                                <MenuItem value={true}>Published</MenuItem>
                                <MenuItem value={false}>Draft</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenArticleDialog(false)} startIcon={<CancelIcon />}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSaveArticle} 
                        variant="contained" 
                        color="primary"
                        disabled={!articleForm.title.trim() || !articleForm.content.trim()}
                        startIcon={<SaveIcon />}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Delete Confirmation Dialog */}
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteItem} 
                        variant="contained" 
                        color="error"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={() => setSnackbar({ ...snackbar, open: false })} 
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdminHelpCenter; 