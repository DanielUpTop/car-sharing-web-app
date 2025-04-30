import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import CarMarker from './CarMarker';
import ReactDOM from 'react-dom';
import CarListItem, { CarForListItem } from './CarListItem'; // Try correcting import path if needed
import BookingDialog from '../bookings/BookingDialog';
import { useAuth } from '../../contexts/AuthContext';

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

// Define Car type received from API (if different from ListItem/Marker)
interface Car {
    id: number;
    make: string;
    model: string;
    year: number;
    seats: number;
    type: 'electric' | 'hybrid' | 'petrol';
    price_per_hour: string | number; // API might send string
    daily_rate?: string | number;
    image_url: string;
    availability_status: string;
    latitude: number;
    longitude: number;
    address: string;
    rating?: number;
    required_membership?: string;
}

interface GeocodingResult {
    display_name: string;
    lat: string;
    lon: string;
    place_id: number;
}

// --- Define MapEvents component OUTSIDE MapView --- 
interface MapEventsProps {
    mapRef: React.MutableRefObject<L.Map | null>;
    updateCarsInView: () => void;
    isInitialLoad: React.MutableRefObject<boolean>;
}

const MapEvents: React.FC<MapEventsProps> = ({ mapRef, updateCarsInView, isInitialLoad }) => {
    const map = useMap();
    
    useEffect(() => {
        if (map) {
            console.log("MapEvents: Setting mapRef.current (from outside component)");
            mapRef.current = map; // Assign the map instance to the ref passed via props

            console.log("MapEvents: Triggering initial updateCarsInView (from outside component)");
            updateCarsInView(); 
            isInitialLoad.current = false; // Mark initial load as complete via props
        }
        return () => {
            console.log("MapEvents: Unmounted (from outside component)");
            // Optionally clear ref if needed, though usually not necessary
            // if (mapRef.current === map) { mapRef.current = null; } 
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, mapRef, updateCarsInView, isInitialLoad]); // Add props to dependency array
    
    return null; // This component doesn't render anything
};
// --- End of MapEvents definition ---

const MapView = () => {
    const { user } = useAuth();
    const [cars, setCars] = useState<Car[]>([]);
    const [carsInView, setCarsInView] = useState<Car[]>([]);
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
    const isInitialLoad = useRef(true);
    
    // State for Booking Dialog
    const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
    const [selectedCarForBooking, setSelectedCarForBooking] = useState<Car | null>(null);

    // --- State for Membership Check & Dialog ---
    const [userMembership, setUserMembership] = useState<string | null>(null);
    const [membershipLoading, setMembershipLoading] = useState(true);
    const [showMembershipDialog, setShowMembershipDialog] = useState(false);
    const [selectedCarForMembership, setSelectedCarForMembership] = useState<Car | null>(null);
    // --- End Membership State ---

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

    // Function to update carsInView based on map bounds
    const updateCarsInView = useCallback(() => {
        if (!mapRef.current) { // Check mapRef first
            console.warn("updateCarsInView: Map ref not ready.");
            // Don't clear here, wait for map ref
            return;
        }
        if (!cars.length) {
             console.log("updateCarsInView: No cars loaded yet.");
             setCarsInView([]); // Clear if cars are empty
             return;
         }

        const bounds = mapRef.current.getBounds();
        console.log("updateCarsInView: Current Map Bounds:", bounds);

        const visibleCars = cars.filter(car => {
            // Ensure car has valid coordinates
            if (typeof car.latitude !== 'number' || typeof car.longitude !== 'number') {
                console.warn(`Car ID ${car.id} has invalid coordinates:`, car.latitude, car.longitude);
                return false;
            }
            const carLatLng = L.latLng(car.latitude, car.longitude);
            const isVisible = bounds.contains(carLatLng);
            // Log check for each car (can be noisy, remove if needed)
            // console.log(` - Car ID ${car.id} at [${car.latitude}, ${car.longitude}]. Visible: ${isVisible}`);
            return isVisible;
        });
        
        console.log(`updateCarsInView: Found ${visibleCars.length} cars in bounds.`);
        setCarsInView(visibleCars);

    }, [cars]); // Dependency: only 'cars' needed as mapRef should be stable

    // Fetch initial car data
    useEffect(() => {
        const fetchCars = async () => {
            setLoading(true); // Start loading indicator
            try {
                // Fetch ALL available cars initially
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cars/available`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                // Map data to Car interface, ensure latitude/longitude are numbers
                const fetchedCars = data
                    .filter((car: any) => {
                        // Check availability status
                        const isAvailable = car.availability_status === 'available';
                        // Check if lat/lng exist and can be parsed to valid numbers
                        const hasValidCoords = car.latitude != null && car.longitude != null && 
                                             !isNaN(parseFloat(car.latitude)) && 
                                             !isNaN(parseFloat(car.longitude));
                        
                        if (!hasValidCoords) {
                            console.warn(`Car ID ${car.id} filtered out due to missing/invalid coords: lat=${car.latitude}, lng=${car.longitude}`);
                        }
                        
                        return isAvailable && hasValidCoords;
                    })
                    .map((car: any) => ({
                        ...car,
                        // Convert string coords/prices/ratings from DB/backend to numbers for frontend use
                        latitude: parseFloat(car.latitude), 
                        longitude: parseFloat(car.longitude),
                        price_per_hour: parseFloat(car.price_per_hour) || 0, 
                        daily_rate: parseFloat(car.daily_rate) || 0,         
                        rating: parseFloat(car.rating) || 0,                 
                        // Remove redundant image mapping (backend already does image: car.image_url)
                        // image: car.image_url, 
                        address: car.address || car.location || 'No location set' 
                    }));
                
                console.log(`Fetched ${fetchedCars.length} available cars.`);
                setCars(fetchedCars); 
                // Initial update of carsInView will happen in the MapContainer effect

            } catch (error) {
                console.error('Error fetching cars:', error);
                // TODO: Show error to user
            } finally {
                 setLoading(false); // Stop loading indicator
            }
        };

        fetchCars();

        // Try to get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    console.log("Got initial location:", latitude, longitude);
                    // Only set center if it's still the default London coordinates
                    // This prevents overriding a location selected via search before geolocation finishes
                    setMapCenter(currentCenter => 
                        currentCenter[0] === 51.5074 && currentCenter[1] === -0.1278 
                        ? [latitude, longitude] 
                        : currentCenter
                    );
                    setMapZoom(14); // Zoom in a bit more for current location
                },
                (error) => {
                    console.error("Error obtaining location", error);
                    // Keep default London center if geolocation fails
                }
            );
        } else {
             console.log("Geolocation not supported/enabled.");
             // Keep default London center
        }
    }, []); // Empty dependency array - run once on mount

    // Update cars in view when the map moves or zooms AFTER the initial load
     useEffect(() => {
         if (!mapRef.current) {
             console.log("Map move/zoom Effect: Map ref not ready yet.");
             return; // Exit if mapRef is not set
         }

         const map = mapRef.current;
         console.log("Map move/zoom Effect: Attaching listeners to map instance.");
         
         const handleMoveEnd = (e: L.LeafletEvent) => {
             const eventType = e.type; // 'moveend' or 'zoomend'
             console.log(`Map event: ${eventType} ended. Updating cars in view.`);
             if (mapRef.current) { // Double check ref inside handler
                 updateCarsInView();
                 setMapZoom(mapRef.current.getZoom()); // Update zoom state
                 setMapCenter([mapRef.current.getCenter().lat, mapRef.current.getCenter().lng]); // Update center state
             } else {
                 console.warn(`Map event ${eventType}: mapRef became null?`);
             }
         };

         // Attach event listeners
         map.on('moveend', handleMoveEnd);
         map.on('zoomend', handleMoveEnd); // Also update on zoom end

         // Initial update after map is ready - simplified
         // Rely on MapEvents component to set the ref and call updateCarsInView initially
         // console.log("Map move/zoom Effect: Scheduling initial update (commented out).");
         /*
         const initialUpdateTimeout = setTimeout(() => {
              if(mapRef.current) { // Check again inside timeout
                 console.log("Performing initial carsInView update (from move/zoom effect timeout).");
                 updateCarsInView();
                 isInitialLoad.current = false; 
              }
          }, 500); 
          */

         // Cleanup function
         return () => {
            // clearTimeout(initialUpdateTimeout);
             if (map) {
                 console.log("Map move/zoom Effect: Cleaning up listeners.");
                 map.off('moveend', handleMoveEnd);
                 map.off('zoomend', handleMoveEnd);
             }
         };
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [updateCarsInView]); // Re-run if updateCarsInView changes (due to 'cars' changing)


    // Update cars in view when the main car list changes (e.g., after initial fetch)
    // This ensures the list updates even if the map hasn't moved yet.
    useEffect(() => {
        if (mapRef.current && !isInitialLoad.current) {
            console.log("Cars state updated, re-calculating cars in view.");
            updateCarsInView();
        }
    }, [cars, updateCarsInView]); // Depend on cars and the updater function

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
        console.log(`Centering map at [${lat}, ${lng}], zoom: ${zoom}`);
        if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], zoom); // Use flyTo for smooth transition
             // Manually trigger update after flying
             mapRef.current.once('moveend', () => {
                  console.log("FlyTo finished, updating cars in view.");
                 updateCarsInView();
             });
        } else {
             // If map isn't ready yet, just update the state
             setMapCenter([lat, lng]);
             setMapZoom(zoom);
        }
        setSelectedLocation([lat, lng]); // Also mark the location
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

    // --- Fetch User Membership --- 
    useEffect(() => {
        const fetchMembership = async () => {
            setMembershipLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!user || !token) { // Check both user context and token
                    setUserMembership(null);
                    console.log("MapView: No user/token found for membership check.");
                    return; 
                }

                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/memberships`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (response.status === 404) {
                    setUserMembership(null);
                    console.log("MapView: User has no membership record.");
                } else if (response.ok) {
                    const data = await response.json();
                    setUserMembership(data ? data.type : null);
                    console.log("MapView: Fetched user membership:", data ? data.type : null);
                } else {
                     console.error('MapView: Failed to fetch membership status:', response.status);
                     setUserMembership(null); // Assume none on error
                }
            } catch (err) {
                console.error('MapView: Error fetching membership:', err);
                setUserMembership(null);
            } finally {
                setMembershipLoading(false);
            }
        };

        fetchMembership();
    }, [user]); // Re-fetch if user changes
    // --- End Fetch User Membership ---

    // --- Helper: Check Membership --- 
    const isMembershipSufficient = (requiredMembership?: string) => {
        const required = requiredMembership?.toLowerCase() || 'none';
        if (required === 'none') return true; // No requirement

        // If still loading, assume insufficient to prevent accidental booking
        if (membershipLoading) return false; 

        const membershipLevels: { [key: string]: number } = {
            none: 0,
            basic: 1,
            premium: 2,
            platinum: 3
        };

        // Default to basic if userMembership is null (non-member)
        const userLevel = membershipLevels[userMembership?.toLowerCase() || 'basic'] ?? 1; 
        const requiredLevel = membershipLevels[required] ?? 0;
        
        console.log(`Membership Check: User=${userMembership}(${userLevel}), Required=${required}(${requiredLevel}) -> Sufficient: ${userLevel >= requiredLevel}`);
        return userLevel >= requiredLevel;
    };
    // --- End Helper ---

    // --- Dialog Handlers --- (Booking + Membership)
    const handleOpenBookingDialog = (car: Car) => {
        // This function now assumes the membership check has passed
        console.log("Opening booking dialog for:", car);
        setSelectedCarForBooking(car);
        setIsBookingDialogOpen(true);
    };

    const handleCloseBookingDialog = () => {
        console.log("Closing booking dialog");
        setIsBookingDialogOpen(false);
        setSelectedCarForBooking(null); 
    };
    
    const handleCloseMembershipDialog = () => {
        setShowMembershipDialog(false);
        setSelectedCarForMembership(null);
    };
    
    const navigateToMembershipPage = () => {
        handleCloseMembershipDialog();
        navigate('/dashboard/membership');
    };
    // --- End Dialog Handlers ---
    
    // --- Core Logic: Check Membership then Open Correct Dialog ---
    const checkAndOpenBookingOrMembershipDialog = (car: Car) => {
        if (isMembershipSufficient(car.required_membership)) {
            handleOpenBookingDialog(car); // Open booking dialog if sufficient
        } else {
            // Open membership required dialog if insufficient
            console.log("Membership insufficient, opening membership dialog.");
            setSelectedCarForMembership(car);
            setShowMembershipDialog(true);
        }
    };
    // --- End Core Logic ---

    // --- Booking Completion Handler ---
    const handleBookingCompleted = (bookedCarId: number) => {
        console.log(`Booking completed for car ID: ${bookedCarId}. Removing from map.`);
        // Update the main cars list to remove the booked car
        setCars(prevCars => prevCars.filter(car => car.id !== bookedCarId));
        // carsInView will update automatically based on the new 'cars' state
    };
    // --- End Booking Completion Handler ---

    return (
        <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column', bgcolor: 'grey.100' }}>
            {/* Top Bar */}
            <AppBar position="static" sx={{ 
                // Use primary theme color for background
                backgroundColor: 'primary.main', 
                // Set text color to white for contrast
                color: 'common.white', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="back">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 1 }}>
                        Find a car
                    </Typography>
                    {/* Maybe add filters button here later */}
                </Toolbar>
            </AppBar>

            {/* Main Content Area (List + Map) */}
            <Box className="map-view-container" sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                
                {/* Left Panel: Search and Car List */}
                <Paper 
                    elevation={2} 
                    className="car-list-panel" 
                    sx={{ 
                        width: '400px', // Adjust width as needed
                        height: '100%', // Take full height of the container
                        display: 'flex', 
                        flexDirection: 'column',
                        overflow: 'hidden', // Prevent panel overflow
                        borderRight: '1px solid',
                        borderColor: 'divider'
                    }}
                >
                    {/* Search Bar Area */}
                    <Box 
                        ref={searchContainerRef} // Ref for click outside detection
                        sx={{ 
                            p: 2, 
                            position: 'relative', // Needed for absolute positioning of dropdown
                            borderBottom: '1px solid', 
                            borderColor: 'divider' 
                        }}
                    >
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Enter location (e.g., postcode, address)"
                            value={searchLocation}
                            onChange={handleSearchChange}
                            onFocus={handleSearchFocus} 
                            // onBlur={handleSearchBlur} // Replaced by click outside
                            inputRef={searchInputRef}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={getCurrentLocation} edge="end" aria-label="find my location">
                                            <MyLocationIcon color="primary" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: '8px', backgroundColor: 'white' }
                            }}
                            sx={{ mb: 1 }}
                        />
                        {/* Inline Dropdown */}
                        <SearchDropdown
                            results={searchResults}
                            visible={showResults}
                            onSelect={handleLocationSelect}
                             // Position is now handled by CSS relative to parent
                            position={{ top: 0, left: 0, width: 0 }} // Dummy position, not used for styling
                        />
                        {/* Loading indicator */}
                        {loading && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                                <CircularProgress size={24} />
                            </Box>
                        )}
                    </Box>

                    {/* Car List Area */}
                    <Box 
                        className="car-list-scroll" 
                        sx={{ 
                            flexGrow: 1, // Take remaining space
                            overflowY: 'auto', // Make list scrollable
                            p: 1,
                            bgcolor: 'grey.50' 
                        }}
                    >
                         {nearbyMessage && (
                            <Alert severity="info" sx={{ m: 1 }}>{nearbyMessage}</Alert>
                         )}
                        {/* Conditionally render based on loading state */}
                        {loading && cars.length === 0 ? ( // Show loading only if no cars are fetched yet
                             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <CircularProgress />
                                <Typography sx={{ ml: 1 }}>Loading cars...</Typography>
                            </Box>
                        ) : carsInView.length > 0 ? (
                            <List disablePadding>
                                {carsInView.map((car: Car) => ( // Explicitly type car here
                                    <CarListItem
                                        key={car.id}
                                        // Map API car data to CarForListItem structure
                                        car={{
                                            id: car.id,
                                            make: car.make,
                                            model: car.model,
                                            year: car.year,
                                            seats: car.seats,
                                            type: car.type,
                                            price_per_hour: Number(car.price_per_hour) || 0, // Ensure number
                                            image: car.image_url, // Map image_url to image
                                            address: car.address,
                                            rating: car.rating,
                                            required_membership: car.required_membership,
                                            daily_rate: car.daily_rate ? Number(car.daily_rate) : undefined // Ensure number or undefined
                                        }}
                                        onSelect={checkAndOpenBookingOrMembershipDialog} // Prop name matches CarListItem expectation
                                        userMembership={userMembership}
                                        membershipLoading={membershipLoading}
                                        // Pass the specific check function for *this* car
                                        isMembershipSufficient={() => isMembershipSufficient(car.required_membership)}
                                    />
                                ))}
                            </List>
                        ) : !loading ? ( // Only show "no cars" if not loading
                            <Typography sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>
                                No cars available in this area. Try searching or moving the map.
                            </Typography>
                        ) : null /* Don't show anything while loading and cars exist */} 
                    </Box>
                </Paper>

                {/* Right Panel: Map */}
                <Box className="map-container-panel" sx={{ flexGrow: 1, height: '100%', position: 'relative' }}>
                    <MapContainer 
                        center={mapCenter} 
                        zoom={mapZoom} 
                        style={{ height: "100%", width: "100%" }}
                    >
                         {/* Pass props to the externally defined MapEvents component */}
                         <MapEvents 
                             mapRef={mapRef} 
                             updateCarsInView={updateCarsInView} 
                             isInitialLoad={isInitialLoad} 
                         /> 
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />

                        {/* Render markers for cars IN THE CURRENT VIEW */}
                        {carsInView.map(car => (
                            <CarMarker 
                                key={car.id} 
                                car={{
                                    ...car, 
                                    image: car.image_url, 
                                    location: [car.latitude, car.longitude], 
                                    price_per_hour: Number(car.price_per_hour)
                                }}
                                onOpenBooking={checkAndOpenBookingOrMembershipDialog} 
                             />
                        ))}
                        
                        {/* Marker for searched/selected location */}
                        {selectedLocation && <LocationMarker position={selectedLocation} />}
                        
                    </MapContainer>
                    {/* Button to re-center map on selected location */}
                     {selectedLocation && (
                         <Button 
                             variant="contained" 
                             size="small"
                             onClick={() => centerMapAt(selectedLocation[0], selectedLocation[1], mapZoom)}
                             sx={{ 
                                 position: 'absolute', 
                                 bottom: 70, // Adjust position to avoid overlap with zoom
                                 right: 10, 
                                 zIndex: 1000, // Ensure it's above map layers
                                 backgroundColor: 'white',
                                 color: 'black',
                                 '&:hover': { backgroundColor: 'grey.200' }
                             }}
                             startIcon={<LocationOnIcon />}
                         >
                             Center on Location
                         </Button>
                     )}
                     {/* Button to search within the current map view */}
                     <Button 
                         variant="contained" 
                         size="small"
                         onClick={updateCarsInView} // Re-run the filter logic
                         sx={{ 
                             position: 'absolute', 
                             top: 10, 
                             left: '50%', 
                             transform: 'translateX(-50%)', 
                             zIndex: 1000, // Ensure it's above map layers
                             backgroundColor: 'white',
                             color: 'black',
                             '&:hover': { backgroundColor: 'grey.200' }
                         }}
                         startIcon={<SearchIcon />}
                     >
                         Search this area
                     </Button>
                </Box>
            </Box>
            
            {/* Booking Dialog */}
            {selectedCarForBooking && (
                <BookingDialog
                    car={{
                        id: selectedCarForBooking.id,
                        make: selectedCarForBooking.make,
                        model: selectedCarForBooking.model,
                        type: selectedCarForBooking.type,
                        pricePerHour: Number(selectedCarForBooking.price_per_hour) || 0, 
                        image: selectedCarForBooking.image_url, 
                        address: selectedCarForBooking.address,
                        required_membership: selectedCarForBooking.required_membership
                    }}
                    open={isBookingDialogOpen}
                    onClose={handleCloseBookingDialog}
                    onBookingComplete={handleBookingCompleted}
                />
            )}

            {/* Membership Required Dialog */}
            {selectedCarForMembership && (
                 <Dialog 
                    open={showMembershipDialog} 
                    onClose={handleCloseMembershipDialog}
                    PaperProps={{
                        sx: { borderRadius: 2, maxWidth: 500 }
                    }}
                >
                    <DialogTitle sx={{ pt: 3, pb: 1 }}>
                        <Typography variant="h5" fontWeight="bold" color="warning.main">
                            Membership Required
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            This vehicle requires a {selectedCarForMembership.required_membership} membership.
                        </Alert>
                        <Typography variant="body1" paragraph>
                            To book the {selectedCarForMembership.make} {selectedCarForMembership.model}, you need to upgrade your membership to {selectedCarForMembership.required_membership} or higher.
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
                            {membershipLoading ? "Checking your membership..." : 
                             userMembership ? 
                                `Your current membership level (${userMembership}) doesn't meet the requirement.` : 
                                "You currently don't have an active membership."}
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={handleCloseMembershipDialog} variant="outlined">
                            Close
                        </Button>
                        <Button 
                            onClick={navigateToMembershipPage} 
                            variant="contained" 
                            color="warning"
                            sx={{ fontWeight: 'bold' }}
                            disabled={membershipLoading} // Disable while loading
                        >
                            View Memberships
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Snackbar for messages */}
            <Snackbar
                open={showMessage}
                autoHideDuration={4000}
                onClose={handleCloseMessage}
                message={nearbyMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default MapView; 