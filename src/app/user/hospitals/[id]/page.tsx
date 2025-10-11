
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { placeholderImages } from '@/lib/placeholder-images';
import type { Doctor } from '@/lib/definitions';
import { getHospitalData } from './actions';
import HospitalDoctorsList from '@/components/patient-portal/hospital-doctors-list';

export default async function HospitalDetailsPage({ params }: { params: { id: string }}) {
  const hospitalId = Number(params.id);
  const { hospital, doctors, specialties } = await getHospitalData(hospitalId);

  if (!hospital) {
    notFound();
  }

  const hospitalImage = placeholderImages.find(
    (p) => p.id === hospital.imageId
  );
  
  return (
    <div className="flex flex-col">
        <div className="relative h-48 w-full">
          {hospitalImage && (
            <Image
              src={hospitalImage.imageUrl}
              alt={hospital.name}
              fill
              className="object-cover"
              data-ai-hint={hospitalImage.imageHint}
            />
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
        
      <HospitalDoctorsList 
        hospitalId={hospitalId}
        doctors={doctors as Doctor[]} 
        specialties={specialties} 
      />
    </div>
  );
}
