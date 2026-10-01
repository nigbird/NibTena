
"use client";
import { MapPin, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HospitalMapClient from './HospitalMapClient';

interface HospitalMapDisplayProps {
  latitude: number | null;
  longitude: number | null;
  mapDisplayAddress: string | null;
  city: string;
  address?: string | null;
  contactEmail: string;
  contactPhone: string;
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
  // Build full address
  const displayAddress = address && city ? `${address}, ${city}` : city || 'Address not available';

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

        {/* Client-only map: dynamically imported to avoid server-side Leaflet import */}
        <HospitalMapClient latitude={latitude} longitude={longitude} />
      </CardContent>
    </Card>
  );
}
