
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Hospital as HospitalIcon } from 'lucide-react';
import type { Doctor } from '@/lib/definitions';
import { getHospitalData } from './actions';
import HospitalDoctorsList from '@/components/patient-portal/hospital-doctors-list';
import HospitalMapDisplay from '@/components/patient-portal/hospital-map-display';

export default async function HospitalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hospitalId = Number(id);
  const { hospital, doctors, specialties } = await getHospitalData(hospitalId);

  if (!hospital) {
    notFound();
  }
  
  return (
    <div className="flex flex-col">
        <div className="relative h-48 w-full bg-muted">
          {hospital.imageUrl ? (
            <Image
              src={hospital.imageUrl}
              alt={hospital.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <HospitalIcon className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
           <div className="absolute bottom-0 left-0 p-4">
                <h1 className="font-headline text-3xl font-bold text-foreground shadow-black/50 text-shadow-lg">
                  {hospital.name}
                </h1>
                <p className="text-md font-semibold text-foreground/90 shadow-black/50 text-shadow">
                  {hospital.city}
                </p>
            </div>
        </div>
        
      <div className="p-4 space-y-6">
        {/* Hospital Location and Map */}
        <HospitalMapDisplay
          latitude={(hospital as any).latitude}
          longitude={(hospital as any).longitude}
          mapDisplayAddress={(hospital as any).mapDisplayAddress}
          city={hospital.city}
          address={(hospital as any).address}
          contactEmail={hospital.contactEmail}
          contactPhone={hospital.contactPhone}
        />

        {/* Doctors List */}
        <HospitalDoctorsList 
          hospitalId={hospitalId}
          doctors={doctors as Doctor[]} 
          specialties={specialties} 
        />
      </div>
    </div>
  );
}
