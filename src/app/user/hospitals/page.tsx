
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Hospital as HospitalIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { placeholderImages } from '@/lib/placeholder-images';

async function getHospitals() {
    return await prisma.hospital.findMany();
}

export default async function HospitalsPage() {
  const hospitals = await getHospitals();

  return (
    <>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {hospitals.map((hospital) => {
            const hospitalImage = placeholderImages.find(p => p.id === hospital.imageId);
            return (
            <Card key={hospital.id} className="flex flex-col overflow-hidden shadow-lg">
                {hospitalImage && (
                    <div className="aspect-video relative overflow-hidden">
                        <Image
                            src={hospitalImage.imageUrl}
                            alt={hospitalImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={hospitalImage.imageHint}
                        />
                    </div>
                )}
                <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <HospitalIcon className="h-5 w-5 text-primary-foreground" />
                    {hospital.name}
                </CardTitle>
                <CardDescription>{hospital.city}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                    A leading healthcare provider in {hospital.city}, offering a wide range of medical services.
                </p>
                </CardContent>
                <CardFooter>
                <Button asChild className="w-full" variant="accent">
                    <Link href={`/user/hospitals/${hospital.id}`}>
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                </CardFooter>
            </Card>
            )})}
        </div>
      </div>
    </>
  );
}
