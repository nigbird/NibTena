
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Hospital as HospitalIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getHospitalsAndCities } from './actions';
import type { Hospital } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, HospitalCard, PageShell, PortalCard, SearchField, filterTriggerClass } from '@/components/patient-portal/ui';


function HospitalListSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <PortalCard key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[16/10] w-full rounded-none" />
                    <div className="space-y-2 p-4">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </PortalCard>
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
        <PageShell>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
                <SearchField
                    placeholder="Search hospitals by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className={filterTriggerClass}>
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
                <>
                    <p className="text-sm text-muted-foreground">
                        {filteredHospitals.length} {filteredHospitals.length === 1 ? 'hospital' : 'hospitals'}
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredHospitals.map((hospital) => (
                            <HospitalCard key={hospital.id} hospital={hospital} />
                        ))}
                    </div>
                </>
            ) : (
                <EmptyState
                    icon={HospitalIcon}
                    title="No hospitals found"
                    description="No hospitals match your search. Try a different name or city."
                />
            )}
        </PageShell>
    );
}
