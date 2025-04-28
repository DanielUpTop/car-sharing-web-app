import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
    Box,
    TextField,
    InputAdornment,
    Paper,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Container,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    CircularProgress,
    Alert,
    Snackbar,
    Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import CarMarker from './CarMarker';
import ReactDOM from 'react-dom';

// Add custom styles to match Zipcar
import './MapView.css';

// Fix marker icon issues with Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Location marker to show the searched location
const LocationMarker = ({ position }: { position: [number, number] }) => {
    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: iconShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    return (
        <Marker position={position} icon={redIcon}>
            <Popup>
                Selected Location
            </Popup>
        </Marker>
    );
};

// Modify the search dropdown component - REMOVE PORTAL
const SearchDropdown = ({ 
    results, 
    visible, 
    onSelect,
    position // Keep position prop even if unused by style, for consistency
}: { 
    results: GeocodingResult[], 
    visible: boolean, 
    onSelect: (result: GeocodingResult) => void,
    position: { top: number, left: number, width: number } 
}) => {
    
    if (!visible || !results || results.length === 0) {
        return null;
    }
    
    console.log("Rendering dropdown INLINE with", results.length, "results");
    
    return (
        <div 
            style={{
                position: 'absolute', 
                top: '100%', 
                left: 0,
                width: '100%', 
                zIndex: 9999, 
                pointerEvents: 'auto',
                backgroundColor: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                borderRadius: '4px',
                marginTop: '8px',
                maxHeight: '300px',
                overflow: 'auto',
                color: 'black'
            }}
            className="search-dropdown-inline" 
        >
            <List>
                {results.map((result, index) => (
                    <React.Fragment key={result.place_id || index}>
                        <ListItem 
                            button 
                            onClick={() => {
                                console.log(`>>> Inline Dropdown item clicked: ${result.display_name}`); 
                                onSelect(result);
                            }}
                            sx={{
                                p: 1.5,
                                '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                },
                                color: 'black'
                            }}
                        >
                            <ListItemIcon>
                                <LocationOnIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                                primary={result.display_name.split(',')[0]}
                                secondary={result.display_name.split(',').slice(1, 4).join(',')}
                                primaryTypographyProps={{ fontWeight: 'medium', color: 'black' }}
                                secondaryTypographyProps={{ noWrap: true, fontSize: 12, color: 'rgba(0, 0, 0, 0.6)' }}
                            />
                        </ListItem>
                        {index < results.length - 1 && <Divider />}
                    </React.Fragment>
                ))}
            </List>
        </div>
    );
};

interface Car {
    id: number;
    make: string;
    model: string;
    type: 'electric' | 'hybrid' | 'petrol';
    price_per_hour: string | number;
    daily_rate: number;
    image_url: string;
    availability_status: 'available' | 'booked' | 'maintenance';
    latitude: number;
    longitude: number;
    address: string;
    location: string;
    required_membership?: 'none' | 'basic' | 'premium' | 'platinum';
}

interface GeocodingResult {
    display_name: string;
    lat: string;
    lon: string;
    place_id: number;
}

const MapView = () => {
    const [cars, setCars] = useState<Car[]>([]);
    const [searchLocation, setSearchLocation] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([51.5074, -0.1278]); // London as default
    const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
    const [nearbyMessage, setNearbyMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const navigate = useNavigate();
    const [mapZoom, setMapZoom] = useState(13);

    // Debug map center changes
    useEffect(() => {
        console.log("MapView: mapCenter state changed to", mapCenter);
    }, [mapCenter]);

    // Debug selectedLocation changes
    useEffect(() => {
        console.log("MapView: selectedLocation state changed to", selectedLocation);
    }, [selectedLocation]);
    
    // Track map reference changes
    useEffect(() => {
        console.log("MapView: mapRef.current is", mapRef.current ? "set" : "null");
    }, [mapRef.current]);

    useEffect(() => {
        const fetchCars = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cars/available`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const availableCars = data
                    .filter((car: Car) => car.availability_status === 'available')
                    .map((car: Car) => ({
                        ...car,
                        location: [car.latitude, car.longitude] as [number, number],
                        image: car.image_url,
                        pricePerHour: car.price_per_hour,
                        address: car.address || car.location || 'No location set for this vehicle'
                    }));
                setCars(availableCars);
            } catch (error) {
                console.error('Error fetching cars:', error);
            }
        };
        fetchCars();
        
        // Try to get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMapCenter([latitude, longitude]);
                },
                (error) => {
                    console.error("Error obtaining location", error);
                }
            );
        }
    }, []);

    // Search for locations when typing
    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Safety check to prevent 'undefined is not an object' error
        if (!searchLocation || typeof searchLocation !== 'string') {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        if (searchLocation.trim().length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                // Using a proxy through our backend to avoid CSP issues
                const apiUrl = `${import.meta.env.VITE_API_URL}/api/geocode?q=${encodeURIComponent(searchLocation)}&limit=7`;
                console.log("Geocoding request URL:", apiUrl);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept-Language': 'en',
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
                }
                
                const data: GeocodingResult[] = await response.json();
                console.log("Raw search results:", data);
                setSearchResults(data);
                
                // Always show results if we have any
                setShowResults(data.length > 0);
                console.log("Search results:", data.length > 0 ? "Found results" : "No results");
            } catch (error) {
                console.error('Error searching for locations:', error);
                setSearchResults([]);
                setShowResults(false);
            } finally {
                setLoading(false);
            }
        }, 300); // Reduced timeout for faster response

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchLocation]);

    // Keep the centerMapAt function, but make it more robust with whenReady
    const centerMapAt = (lat: number, lng: number, zoom: number = 14) => {
         console.log(`Attempting to center map at [${lat}, ${lng}] with zoom ${zoom}`);
         if (!mapRef.current) {
             console.error('Map reference is null, cannot center map.');
             return;
         }
 
         const map = mapRef.current;
         
         // Use Leaflet's whenReady to ensure the map is fully initialized
         map.whenReady(() => {
             console.log('Map is ready (via whenReady). Proceeding with centering...');
             try {
                 // Force map invalidation first
                 map.invalidateSize(true);
                 
                 // Set the view using the map instance provided by whenReady
                 map.setView([lat, lng], zoom, {
                     animate: true,
                     duration: 1.0
                 });
                 console.log('Map centering command issued successfully inside whenReady.');
             } catch (error) {
                 console.error('Error centering map inside whenReady:', error);
             }
         });
     };

    // Handle selecting a location from search results - revert to calling centerMapAt
    const handleLocationSelect = (result: GeocodingResult) => {
        console.log('handleLocationSelect triggered for:', result.display_name);
        
        // Hide dropdown
        setShowResults(false);
        
        // Parse coordinates
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.error('Invalid coordinates in search result:', result);
            setNearbyMessage('Invalid location data. Please try a different search.');
            setShowMessage(true);
            return;
        }
        
        console.log(`Parsed coordinates: [${lat}, ${lng}].`);
        
        // Update UI state (Markers, text field)
        const newCenter: [number, number] = [lat, lng];
        setSelectedLocation(newCenter); 
        setMapCenter(newCenter); // Keep state updated
        setMapZoom(14); 
        
        // Update the search input display
        const displayParts = result.display_name.split(',');
        const primaryName = displayParts[0];
        const secondaryName = displayParts.slice(1, 3).join(',');
        setSearchLocation(`${primaryName}, ${secondaryName}`);

        // ** CRITICAL STEP: Directly center the map using the enhanced centerMapAt **
        centerMapAt(lat, lng, 14); 

        // Find nearby cars 
        const nearbyCars = findNearbyCars([lat, lng]);
        if (nearbyCars.length === 0) {
            setNearbyMessage('No cars available near this location.');
        } else {
            setNearbyMessage(`Found ${nearbyCars.length} car${nearbyCars.length === 1 ? '' : 's'} near this location.`);
        }
        setShowMessage(true);
    };

    // Find cars nearby to the selected location
    const findNearbyCars = (location: [number, number], radius: number = 5) => {
        if (cars.length === 0) return [];

        // Filter cars within the radius (in km)
        const nearbyCars = cars.filter(car => {
            const distance = calculateDistance(
                location[0], location[1], 
                car.latitude, car.longitude
            );
            return distance <= radius;
        });
        
        // Sort by distance
        nearbyCars.sort((a, b) => {
            const distA = calculateDistance(location[0], location[1], a.latitude, a.longitude);
            const distB = calculateDistance(location[0], location[1], b.latitude, b.longitude);
            return distA - distB;
        });
        
        return nearbyCars;
    };

    // Get user's current location - This uses centerMapAt and works, keep it for comparison
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    
                    // Update state
                    setSelectedLocation([latitude, longitude]);
                    setMapCenter([latitude, longitude]); // Update state
                    setMapZoom(14);
                    
                    // Directly center the map - KEEP THIS AS IS
                    centerMapAt(latitude, longitude, 14); 
                    
                    // Reverse geocode...
                    fetch(`${import.meta.env.VITE_API_URL}/api/geocode/reverse?lat=${latitude}&lon=${longitude}`)
                        .then(res => res.json())
                        .then(data => {
                            setSearchLocation(data.display_name);
                            const nearbyCars = findNearbyCars([latitude, longitude]);
                             if (nearbyCars.length === 0) {
                                setNearbyMessage('No cars available near your location.');
                            } else {
                                setNearbyMessage(`Found ${nearbyCars.length} car${nearbyCars.length === 1 ? '' : 's'} near your location.`);
                            }
                             setShowMessage(true);
                        })
                        .catch(err => console.error("Error reverse geocoding", err))
                        .finally(() => setLoading(false));
                },
                (error) => {
                     console.error("Error obtaining location", error);
                     setLoading(false);
                     setNearbyMessage('Unable to get your current location. Please check your browser permissions.');
                     setShowMessage(true);
                }
            );
        } else {
             setNearbyMessage('Geolocation is not supported by your browser.');
             setShowMessage(true);
        }
    };

    // Calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    const handleCloseMessage = () => {
        setShowMessage(false);
    };

    // Handle search field focus
    const handleSearchFocus = () => {
        console.log("Search field focused");
        if (!searchLocation || typeof searchLocation !== 'string') { return; }
        if (searchLocation.trim().length >= 2) {
            if (searchResults.length > 0) {
                console.log("Showing existing results on focus");
                setShowResults(true);
            } else {
                console.log("No results, triggering search on focus");
                const doSearchNow = async () => {
                    setLoading(true);
                    try {
                        const apiUrl = `${import.meta.env.VITE_API_URL}/api/geocode?q=${encodeURIComponent(searchLocation)}&limit=7`;
                        console.log("Focus search URL:", apiUrl);
                        
                        const response = await fetch(apiUrl, {
                            method: 'GET',
                            headers: {
                                'Accept-Language': 'en',
                            }
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            console.log("Focus search results:", data.length);
                            
                            if (data.length > 0) {
                                setSearchResults(data);
                                setShowResults(true);
                            }
                        }
                    } catch (error) {
                        console.error("Error in immediate search:", error);
                    } finally {
                        setLoading(false);
                    }
                };
                doSearchNow();
            }
        }
    };

    // Add click handler for search input
    const handleSearchClick = () => {
        if (!searchLocation || typeof searchLocation !== 'string') { return; }
        if (searchResults.length > 0) {
            setShowResults(true);
        } else if (searchLocation.trim().length >= 2) {
            console.log("No results yet, triggering search on click");
            const doSearchNow = async () => {
                setLoading(true);
                try {
                    const apiUrl = `${import.meta.env.VITE_API_URL}/api/geocode?q=${encodeURIComponent(searchLocation)}&limit=7`;
                    console.log("Click search URL:", apiUrl);
                    
                    const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                            'Accept-Language': 'en',
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log("Click search results:", data.length);
                        
                        if (data.length > 0) {
                            setSearchResults(data);
                            setShowResults(true);
                        }
                    }
                } catch (error) {
                    console.error("Error in immediate search:", error);
                } finally {
                    setLoading(false);
                }
            };
            doSearchNow();
        } else {
            handleSearchFocus();
        }
    };

    // Search field change handler
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchLocation(value);
        if (searchTimeout.current) { clearTimeout(searchTimeout.current); }
        if (!value || value.trim().length < 2) { return; }
        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                const apiUrl = `${import.meta.env.VITE_API_URL}/api/geocode?q=${encodeURIComponent(value)}&limit=7`;
                console.log("Searching for:", value, "URL:", apiUrl);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept-Language': 'en',
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log("Search results:", data.length);
                setSearchResults(data);
                
                // Always show results if we have any
                const shouldShow = data.length > 0;
                setShowResults(shouldShow);
                console.log("Setting showResults to:", shouldShow);
            } catch (error) {
                console.error('Error searching locations:', error);
                setSearchResults([]);
                setShowResults(false);
            } finally {
                setLoading(false);
            }
        }, 300);
    };

    // Add handler for clicking outside the search component
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showResults && searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showResults]);

    return (
        <>
            <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        sx={{ color: 'white', mr: 2 }}
                        onClick={() => navigate('/dashboard')}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ color: 'white' }}>
                        Available Cars
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    {/* Search Bar */}
                    <Box 
                        ref={searchContainerRef}
                        sx={{ p: 2, borderBottom: 1, borderColor: 'divider', position: 'relative', display: 'flex', alignItems: 'center' }}
                    >
                        <TextField 
                            onChange={handleSearchChange} 
                            onFocus={handleSearchFocus} 
                            onClick={handleSearchClick} 
                            fullWidth
                            placeholder="Search for a street, city, or location"
                            value={searchLocation}
                            variant="outlined"
                            size="small"
                            className="map-search-field"
                            inputRef={searchInputRef}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: loading && (
                                    <InputAdornment position="end">
                                        <CircularProgress size={20} className="loading-spinner" />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <IconButton 
                            onClick={getCurrentLocation} 
                            color="primary"
                            sx={{ ml: 1 }}
                            title="Use current location"
                            className="current-location-button"
                        >
                            <MyLocationIcon />
                        </IconButton>
                        
                        {/* Render Inline Search Dropdown - Ensure position prop is correctly handled or removed if type is updated */}
                        {showResults && searchResults.length > 0 && (
                            <SearchDropdown 
                                results={searchResults}
                                visible={showResults}
                                onSelect={handleLocationSelect}
                                position={{ top: 0, left: 0, width: 0 }} // Pass dummy/default position
                            />
                        )}
                    </Box>

                    {/* Map Container */}
                    <Box 
                        sx={{ height: '600px', width: '100%', position: 'relative', zIndex: 1 }} 
                        className="map-container"
                    >
                        <MapContainer
                            center={mapCenter}
                            zoom={mapZoom}
                            style={{ height: '100%', width: '100%' }}
                            ref={mapRef}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            
                            {selectedLocation && (
                                <LocationMarker position={selectedLocation} />
                            )}
                            
                            {cars.map((car) => (
                                <CarMarker 
                                    key={car.id} 
                                    car={{
                                        id: car.id,
                                        make: car.make,
                                        model: car.model,
                                        type: car.type,
                                        price_per_hour: Number(car.price_per_hour),
                                        location: [car.latitude, car.longitude],
                                        image: car.image_url,
                                        address: car.address,
                                        required_membership: car.required_membership
                                    }}
                                />
                            ))}
                        </MapContainer>
                    </Box>
                </Paper>
            </Container>
            
            <Snackbar 
                open={showMessage} 
                autoHideDuration={5000} 
                onClose={handleCloseMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseMessage} severity="info" sx={{ width: '100%' }} className="location-notification">
                    {nearbyMessage}
                </Alert>
            </Snackbar>
        </>
    );
};

export default MapView; 