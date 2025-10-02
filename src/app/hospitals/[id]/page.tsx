import { getDoctorsByHospitalId, getHospitalById } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Stethoscope, User, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { placeholderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';

export default async function HospitalDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const hospitalId = Number(params.id);
  const hospital = await getHospitalById(hospitalId);
  if (!hospital) {
    notFound();
  }
  const doctors = await getDoctorsByHospitalId(hospitalId);
  const hospitalImage = placeholderImages.find(p => p.id === hospital.imageId);


  return (
    <div className="container py-12">
      <div className="mb-12">
        <div className="relative h-64 w-full rounded-lg overflow-hidden mb-8">
        {hospitalImage && (
            <Image 
                src={hospitalImage.imageUrl} 
                alt={hospital.name} 
                fill
                className="object-cover"
                data-ai-hint={hospitalImage.imageHint}
            />
        )}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <h1 className="font-headline text-5xl font-bold text-white">
                {hospital.name}
            </h1>
        </div>
        </div>
        <p className="text-center text-lg text-muted-foreground">{hospital.city}</p>
      </div>

      <div className="text-center mb-12">
        <h2 className="font-headline text-3xl font-bold">Our Doctors</h2>
        <p className="mt-2 text-muted-foreground">Meet our team of dedicated medical professionals.</p>
      </div>

      {doctors.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {doctors.map((doctor) => {
            const doctorImage = placeholderImages.find(p => p.id === doctor.imageId);
            return (
            <Card key={doctor.id} className="flex flex-col text-center items-center pt-6 shadow-lg transition-transform hover:-translate-y-1">
              <CardHeader className="items-center p-4">
                <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
                  {doctorImage && <AvatarImage src={doctorImage.imageUrl} alt={doctor.name} data-ai-hint={doctorImage.imageHint} />}
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <CardTitle className="font-headline">{doctor.name}</CardTitle>
                <CardDescription>
                    <Badge variant="secondary" className="mt-1">{doctor.specialty}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                 <p className="text-sm text-muted-foreground line-clamp-3">{doctor.bio}</p>
              </CardContent>
              <CardFooter className="w-full">
                <Button asChild className="w-full" variant="accent">
                  <Link href={`/doctors/${doctor.id}`}>Book Appointment</Link>
                </Button>
              </CardFooter>
            </Card>
          )})}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">No doctors found for this hospital.</p>
      )}
    </div>
  );
}
