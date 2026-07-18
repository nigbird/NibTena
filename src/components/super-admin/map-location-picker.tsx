'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
    country?: string;
  };
}

interface MapLocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  mapDisplayAddress?: string | null;
  city?: string;
  address?: string;
  onLocationChange: (data: {
    latitude: number;
    longitude: number;
    mapDisplayAddress: string;
  }) => void;
  className?: string;
}

// Component to update map view when location changes
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [map, center]);
  return null;
}

export default function MapLocationPicker({
  latitude,
  longitude,
  mapDisplayAddress,
  city,
  address,
  onLocationChange,
  className,
}: MapLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    mapDisplayAddress: string;
  } | null>(
    latitude && longitude
      ? {
          lat: latitude,
          lng: longitude,
          mapDisplayAddress: mapDisplayAddress || '',
        }
      : null
  );
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const mapContainerIdRef = useRef(`map-container-${Math.random().toString(36).substr(2, 9)}`);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);

  // Default center (Addis Ababa, Ethiopia)
  const defaultCenter: [number, number] = [9.145, 38.7667];
  const mapCenter: [number, number] = selectedLocation
    ? [selectedLocation.lat, selectedLocation.lng]
    : defaultCenter;

  // Ensure map only renders after component is mounted.
  // No unmount cleanup here: toggling isMapReady back to false on cleanup made the
  // whole MapContainer subtree fully unmount/remount under React StrictMode's
  // double-invoke, which left Leaflet's internal container marker behind and made
  // the second init throw "Map container is already initialized".
  useEffect(() => {
    setIsMapReady(true);
  }, []);

  // Leaflet measures its container at creation time. When this picker sits inside
  // a sliding Sheet/drawer, the container is still 0-sized (mid-animation) at that
  // point, so no tiles get requested. Re-measure once the container settles, and
  // keep re-measuring whenever the wrapper resizes (e.g. sheet finishes animating).
  useEffect(() => {
    if (!map) return;
    const timers = [50, 300, 600].map((delay) =>
      setTimeout(() => map.invalidateSize(), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [map]);

  useEffect(() => {
    if (!map || !mapWrapperRef.current) return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(mapWrapperRef.current);
    return () => observer.disconnect();
  }, [map]);

  // Geocoding function using Nominatim (OpenStreetMap)
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'NibTena Hospital Management System',
          },
        }
      );
      const data: GeocodeResult[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        searchLocation(searchQuery);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: GeocodeResult) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    // Create a shorter display address for the map
    const addr = suggestion.address;
    let displayAddress = suggestion.display_name;
    if (addr) {
      const parts: string[] = [];
      if (addr.road) parts.push(addr.road);
      if (addr.house_number) parts.push(addr.house_number);
      if (addr.city) parts.push(addr.city);
      if (parts.length > 0) {
        displayAddress = parts.join(', ');
      }
    }

    const locationData = {
      lat,
      lng,
      mapDisplayAddress: displayAddress,
    };

    setSelectedLocation(locationData);
    setSearchQuery(displayAddress);
    setShowSuggestions(false);
    onLocationChange({
      latitude: lat,
      longitude: lng,
      mapDisplayAddress: displayAddress,
    });
  };

  // Handle map click
  const handleMapClick = async (e: L.LeafletMouseEvent) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    try {
      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'NibTena Hospital Management System',
          },
        }
      );
      const data: any = await response.json();
      const addr = data.address || {};
      
      // Create display address for the map
      const parts: string[] = [];
      if (addr.road) parts.push(addr.road);
      if (addr.house_number) parts.push(addr.house_number);
      if (addr.city) parts.push(addr.city);
      const displayAddress = parts.length > 0 ? parts.join(', ') : (data.display_name || `${lat}, ${lng}`);

      const locationData = {
        lat,
        lng,
        mapDisplayAddress: displayAddress,
      };

      setSelectedLocation(locationData);
      setSearchQuery(displayAddress);
      onLocationChange({
        latitude: lat,
        longitude: lng,
        mapDisplayAddress: displayAddress,
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Still set location even if reverse geocoding fails
      const coordString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      const locationData = {
        lat,
        lng,
        mapDisplayAddress: coordString,
      };
      setSelectedLocation(locationData);
      setSearchQuery(coordString);
      onLocationChange({
        latitude: lat,
        longitude: lng,
        mapDisplayAddress: coordString,
      });
    }
  };

  // Initialize with existing city/address if available
  useEffect(() => {
    if (!selectedLocation && city && address) {
      const initialQuery = `${address}, ${city}`;
      setSearchQuery(initialQuery);
      searchLocation(initialQuery);
    } else if (!selectedLocation && city) {
      setSearchQuery(city);
      searchLocation(city);
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      <Label>Hospital Location</Label>
      <div className="relative" ref={suggestionsRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for hospital address or location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            className="pl-10"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-muted transition-colors border-b last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{suggestion.display_name}</p>
                    {suggestion.address?.city && (
                      <p className="text-xs text-muted-foreground">{suggestion.address.city}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-64 w-full rounded-md overflow-hidden border" id={mapContainerIdRef.current} ref={mapWrapperRef}>
        {isMapReady ? (
          <MapContainer
            key={mapContainerIdRef.current}
            ref={setMap}
            center={mapCenter}
            zoom={selectedLocation ? 15 : 10}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
                    {/* Ensure any previous Leaflet map instance is removed when this container unmounts.
                        This prevents "Map container is already initialized" errors when the component
                        is mounted/unmounted multiple times (e.g., in dialogs/drawers). */}
                    <MapLifecycle />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {selectedLocation && (
              <>
                <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
                <MapUpdater center={[selectedLocation.lat, selectedLocation.lng]} />
              </>
            )}
            <MapClickHandler onMapClick={handleMapClick} />
          </MapContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        )}
      </div>

      {selectedLocation && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">Selected Location:</p>
          <p>{selectedLocation.mapDisplayAddress}</p>
          <p className="text-xs">Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
        </div>
      )}
    </div>
  );
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);

  return null;
}

// Component that ensures the Leaflet map instance is properly removed on unmount.
function MapLifecycle() {
  // useMap must be called inside a MapContainer subtree
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map: any = (useMap as any)();

  useEffect(() => {
    return () => {
      // React-leaflet v4 handles map cleanup automatically.
      // Manual removal can cause issues with strict mode or re-renders.
    };
  }, [map]);

  return null;
}

