import { getDoctorById } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Stethoscope, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';

const availableSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', 
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
];

export default async function DoctorProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const doctorId = Number(params.id);
  const doctor = await getDoctorById(doctorId);
  if (!doctor) {
    notFound();
  }

  const doctorImage = placeholderImages.find(p => p.id === doctor.imageId);

  return (
    <div className="bg-muted/20">
        <div className="container py-12">
        <Card className="overflow-hidden shadow-2xl">
            <div className="grid md:grid-cols-3">
            <div className="md:col-span-1 p-8 bg-primary/10 flex flex-col items-center justify-center text-center">
                <Avatar className="h-32 w-32 mb-4 border-4 border-primary/50">
                {doctorImage && <AvatarImage src={doctorImage.imageUrl} alt={doctor.name} data-ai-hint={doctorImage.imageHint} />}
                <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <h1 className="font-headline text-3xl font-bold text-primary-foreground">{doctor.name}</h1>
                <Badge variant="outline" className="mt-2 text-lg bg-background">
                    <Stethoscope className="mr-2 h-4 w-4" />
                    {doctor.specialty}
                </Badge>
            </div>
            <div className="md:col-span-2 p-8">
                <div className="mb-8">
                <h2 className="font-headline text-2xl font-semibold mb-2">About</h2>
                <p className="text-muted-foreground">{doctor.bio}</p>
                </div>

                <div>
                <h2 className="font-headline text-2xl font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-6 w-6 text-accent-foreground" />
                    Available Slots
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {availableSlots.map(slot => (
                    <Link
                        key={slot}
                        href={`/book/${doctor.id}?slot=${encodeURIComponent(slot)}`}
                        className="rounded-md border bg-card text-center text-sm font-medium py-3 px-2 transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        {slot}
                    </Link>
                    ))}
                </div>
                </div>
            </div>
            </div>
        </Card>
        </div>
    </div>
  );
}
