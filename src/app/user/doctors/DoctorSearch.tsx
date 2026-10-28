
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { SearchField, filterTriggerClass } from '@/components/patient-portal/ui';

type DoctorSearchProps = {
  specialties: string[];
  initialSpecialty?: string;
  initialQuery?: string;
};

export default function DoctorSearch({
  specialties,
  initialSpecialty,
  initialQuery,
}: DoctorSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty || 'all');
  const [query, setQuery] = useState(initialQuery || '');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (selectedSpecialty === 'all') {
      current.delete('specialty');
    } else {
      current.set('specialty', selectedSpecialty);
    }

    if (debouncedQuery) {
        current.set('q', debouncedQuery);
    } else {
        current.delete('q');
    }

    current.set('page', '1');

    const search = current.toString();
    const newUrl = search ? `?${search}` : "";

    router.push(`/user/doctors${newUrl}`);
  }, [selectedSpecialty, debouncedQuery, router, searchParams]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_240px]">
      <SearchField
        placeholder="Search doctors or hospitals..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
        <SelectTrigger className={filterTriggerClass}>
          <SelectValue placeholder="Filter by specialty..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Specialties</SelectItem>
          {specialties.map((specialty) => (
            <SelectItem key={specialty} value={specialty}>
              {specialty}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
