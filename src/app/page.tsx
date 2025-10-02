import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ClipboardPenLine,
  Search,
  Stethoscope,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { placeholderImages } from '@/lib/placeholder-images';

const features = [
  {
    icon: <Search className="h-8 w-8 text-primary-foreground" />,
    title: 'Find a Doctor',
    description: 'Easily search for hospitals and doctors by specialty and location.',
  },
  {
    icon: <ClipboardPenLine className="h-8 w-8 text-primary-foreground" />,
    title: 'Book an Appointment',
    description: 'Choose a convenient time slot and book your appointment online.',
  },
  {
    icon: <Stethoscope className="h-8 w-8 text-primary-foreground" />,
    title: 'Consult with Experts',
    description: 'Get professional healthcare from the comfort of your home.',
  },
];

export default function Home() {
  const heroImage = placeholderImages.find(p => p.id === 'mediverse-hero');

  return (
    <>
      <section className="relative w-full bg-muted/30 py-20 md:py-32 lg:py-40">
        {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
              priority
              data-ai-hint={heroImage.imageHint}
            />
        )}
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Your Health, Simplified.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              MediVerse connects you with the best doctors and hospitals. Book
              appointments, manage your health records, and get the care you need,
              all in one place.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg" variant="accent">
                <Link href="/hospitals">
                  Book an Appointment <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/doctor-dashboard">I'm a Doctor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="w-full bg-background py-12 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Booking your next doctor's appointment is just a few clicks away.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="flex flex-col items-center text-center shadow-lg">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                    {feature.icon}
                  </div>
                  <CardTitle className="font-headline">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
