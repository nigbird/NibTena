
"use client";
import { MapPin, Mail, Phone } from 'lucide-react';
import dynamic from 'next/dynamic';

// Leaflet touches `window` on import, so the map must never render on the server.
const HospitalMapClient = dynamic(() => import('./HospitalMapClient'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl bg-muted md:col-span-3" />,
});
import { DetailRow, PortalCard, SectionTitle } from './ui';

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
    <PortalCard className="p-5 sm:p-6">
      <SectionTitle title="Location & Contact" />
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="space-y-4 md:col-span-2">
          <DetailRow icon={MapPin} label="Address">
            {displayAddress}
            {mapDisplayAddress && mapDisplayAddress !== displayAddress && (
              <p className="mt-0.5 text-xs font-normal text-muted-foreground">Map location: {mapDisplayAddress}</p>
            )}
          </DetailRow>
          <DetailRow icon={Phone} label="Phone">
            <a href={`tel:${contactPhone}`} className="hover:text-secondary hover:underline">
              {contactPhone}
            </a>
          </DetailRow>
          <DetailRow icon={Mail} label="Email">
            <a href={`mailto:${contactEmail}`} className="break-all hover:text-secondary hover:underline">
              {contactEmail}
            </a>
          </DetailRow>
        </div>

        <HospitalMapClient latitude={latitude} longitude={longitude} />
      </div>
    </PortalCard>
  );
}
