
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDoctorsAndHospitalsByQuery } from './actions';
import type { Doctor, Hospital } from '@/lib/definitions';
import { Search as SearchIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DoctorRow, EmptyState, HospitalCard, PageShell, SectionTitle } from '@/components/patient-portal/ui';

function SearchSkeleton() {
  return (
    <PageShell>
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </PageShell>
  );
}

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
    return <SearchSkeleton />;
  }

  if (!query) {
    return (
      <PageShell>
        <EmptyState icon={SearchIcon} title="Search for care" description="Enter a doctor, hospital or specialty to get started." />
      </PageShell>
    );
  }

  const hasResults = filteredDoctors.length > 0 || filteredHospitals.length > 0;

  return (
    <PageShell>
      <p className="text-sm text-muted-foreground">
        Results for <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
      </p>
      {hasResults ? (
        <>
          {filteredHospitals.length > 0 && (
            <section className="space-y-4">
              <SectionTitle title="Hospitals" subtitle={`${filteredHospitals.length} found`} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredHospitals.map((hospital) => (
                  <HospitalCard key={hospital.id} hospital={hospital} />
                ))}
              </div>
            </section>
          )}

          {filteredDoctors.length > 0 && (
            <section className="space-y-4">
              <SectionTitle title="Doctors" subtitle={`${filteredDoctors.length} found`} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredDoctors.map((doctor) => (
                  <DoctorRow key={doctor.id} doctor={doctor} href={`/user/doctors/${doctor.id}`} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          description="We couldn't find any doctors or hospitals matching your search. Try a different term."
        />
      )}
    </PageShell>
  );
}


export default function SearchPage() {
    return (
        <Suspense fallback={<SearchSkeleton />}>
            <SearchResults />
        </Suspense>
    )
}
