
'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface HospitalMapDisplayProps {
  latitude: number | null;
  longitude: number | null;
  mapDisplayAddress: string | null;
  city: string;
  address?: string | null;
  contactEmail: string;
  contactPhone: string;
}

// Component to update map view when location changes
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [map, center]);
  return null;
}

export default function HospitalMapDisplay({
  latitude,
  longitude,
  mapDisplayAddress,
  city,
  address,
  contactEmail,
  contactPhone,
}: HospitalMapDisplayProps) {
  const mapContainerIdRef = useRef(`hospital-map-${Math.random().toString(36).substr(2, 9)}`);
  const [isMapReady, setIsMapReady] = useState(false);

  // Default center (Addis Ababa, Ethiopia) if no location
  const defaultCenter: [number, number] = [9.145, 38.7667];
  const hasLocation = latitude !== null && longitude !== null;
  const mapCenter: [number, number] = hasLocation ? [latitude, longitude] : defaultCenter;

  // Build full address display from existing address and city fields
  const displayAddress = address && city ? `${address}, ${city}` : city || 'Address not available';

  // Ensure map only renders after component is mounted
  useEffect(() => {
    setIsMapReady(true);
    return () => {
      setIsMapReady(false);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location & Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-2 space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Physical Address</h3>
              <p className="text-base">{displayAddress}</p>
              {mapDisplayAddress && mapDisplayAddress !== displayAddress && (
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">Map location:</span> {mapDisplayAddress}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm text-muted-foreground">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contactPhone}`} className="text-base hover:underline">
                    {contactPhone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contactEmail}`} className="text-base hover:underline break-all">
                    {contactEmail}
                  </a>
                </div>
              </div>
            </div>
        </div>

        <div className="md:col-span-3 h-80 w-full rounded-md overflow-hidden border">
          {hasLocation ? (
            isMapReady ? (
              <MapContainer
                key={mapContainerIdRef.current}
                center={mapCenter}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[latitude, longitude]} />
                <MapUpdater center={[latitude, longitude]} />
              </MapContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            )
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-muted border-2 border-dashed">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Map location not available.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
