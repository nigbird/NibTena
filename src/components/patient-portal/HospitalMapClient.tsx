"use client";

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Fix for default marker icons in environments where Leaflet expects browser globals
if (typeof window !== 'undefined') {
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  } catch (e) {
    // swallow if Leaflet cannot be initialized during server-side builds
  }
}

interface HospitalMapClientProps {
  latitude: number | null;
  longitude: number | null;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [map, center]);
  return null;
}

export default function HospitalMapClient({ latitude, longitude }: HospitalMapClientProps) {
  const mapContainerIdRef = useRef(`hospital-map-${Math.random().toString(36).substr(2, 9)}`);
  const [isMapReady, setIsMapReady] = useState(false);

  const defaultCenter: [number, number] = [9.145, 38.7667];
  const hasLocation = latitude !== null && longitude !== null;
  const mapCenter: [number, number] = hasLocation ? [latitude as number, longitude as number] : defaultCenter;

  useEffect(() => {
    setIsMapReady(true);
    return () => setIsMapReady(false);
  }, []);

  return (
    <div className="md:col-span-3 h-80 w-full rounded-md overflow-hidden border">
      {hasLocation ? (
        isMapReady ? (
          <MapContainer
            id={mapContainerIdRef.current}
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
            <Marker position={[latitude as number, longitude as number]} />
            <MapUpdater center={[latitude as number, longitude as number]} />
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
  );
}
