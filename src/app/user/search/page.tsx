
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getDoctorsAndHospitalsByQuery } from './actions';
import type { Doctor, Hospital } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Hospital as HospitalIcon, Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { placeholderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!query) {
        setFilteredDoctors([]);
        setFilteredHospitals([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { doctors, hospitals } = await getDoctorsAndHospitalsByQuery(query);
      setFilteredDoctors(doctors as Doctor[]);
      setFilteredHospitals(hospitals as Hospital[]);
      setIsLoading(false);
    };
    fetchData();
  }, [query]);

  if (isLoading) {
    return (
        <div className="p-4 space-y-8">
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    );
  }

  if (!query) {
    return <p className="text-center text-muted-foreground mt-8">Please enter a search term.</p>;
  }

  const hasResults = filteredDoctors.length > 0 || filteredHospitals.length > 0;

  return (
    <>
      <div className="p-4 space-y-8">
        {hasResults ? (
          <>
            {filteredHospitals.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 font-headline">Hospitals</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredHospitals.map((hospital) => {
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
                          </CardHeader>
                           <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground">{hospital.city}</p>
                          </CardContent>
                          <CardFooter>
                            <Button asChild className="w-full" variant="accent">
                                <Link href={`/user/hospitals/${hospital.id}`}>View Details</Link>
                            </Button>
                          </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {filteredDoctors.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 font-headline">Doctors</h2>
                <div className="space-y-4">
                  {filteredDoctors.map((doctor) => {
                    const doctorImage = placeholderImages.find((p) => p.id === doctor.imageId);
                    return (
                        <Card key={doctor.id} className="flex items-start p-4 gap-4 shadow-md">
                           <Avatar className="h-20 w-20 border-2 border-primary/20">
                              {doctorImage && (
                                <AvatarImage
                                  src={doctorImage.imageUrl}
                                  alt={doctor.name}
                                  data-ai-hint={doctorImage.imageHint}
                                />
                              )}
                              <AvatarFallback><User /></AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{doctor.name}</h3>
                                <Badge variant="secondary" className="mt-1">{doctor.specialty}</Badge>
                                <Button asChild size="sm" variant="accent" className="rounded-full mt-3">
                                    <Link href={`/user/doctors/${doctor.id}`}>View Profile</Link>
                                </Button>
                            </div>
                        </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-12">
            <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No Results Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't find any doctors or hospitals matching your search. Try a different term.
            </p>
          </div>
        )}
      </div>
    </>
  );
}


export default function SearchPage() {
    return (
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
            <SearchResults />
        </Suspense>
    )
}
