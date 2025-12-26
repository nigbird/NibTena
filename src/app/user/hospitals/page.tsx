
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Hospital as HospitalIcon, Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getHospitalsAndCities } from './actions';
import type { Hospital } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';


function HospitalCard({ hospital }: { hospital: Hospital }) {
    return (
        <Card className="flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="aspect-video relative overflow-hidden bg-muted">
                {hospital.imageUrl ? (
                    <Image
                        src={hospital.imageUrl}
                        alt={hospital.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                    <HospitalIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                )}
            </div>
            <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
                <HospitalIcon className="h-5 w-5 text-accent flex-shrink-0" />
                <span className="truncate">{hospital.name}</span>
            </CardTitle>
            <CardDescription>{hospital.city}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-2">
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
    )
}

function HospitalListSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="flex flex-col overflow-hidden shadow-lg">
                    <Skeleton className="aspect-video w-full" />
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6 mt-2" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}


export default function HospitalsPage() {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCity, setSelectedCity] = useState('all');

    useEffect(() => {
        setIsLoading(true);
        getHospitalsAndCities()
            .then(({ hospitals, cities }) => {
                setHospitals(hospitals as Hospital[]);
                setCities(cities);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const filteredHospitals = useMemo(() => {
        return hospitals.filter(hospital => {
            const cityMatch = selectedCity === 'all' || hospital.city === selectedCity;
            const searchTermMatch = searchTerm === '' || hospital.name.toLowerCase().includes(searchTerm.toLowerCase());
            return cityMatch && searchTermMatch;
        });
    }, [hospitals, searchTerm, selectedCity]);
    
    return (
        <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search hospitals by name..."
                        className="w-full h-11 pl-10 rounded-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-11 rounded-lg">
                        <SelectValue placeholder="Filter by city..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        {cities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {isLoading ? (
                <HospitalListSkeleton />
            ) : filteredHospitals.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredHospitals.map((hospital) => (
                        <HospitalCard key={hospital.id} hospital={hospital} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-12">
                    <HospitalIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold font-headline">No Hospitals Found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        No hospitals match your search criteria. Try a different search or filter.
                    </p>
                </div>
            )}
      </div>
    );
}
