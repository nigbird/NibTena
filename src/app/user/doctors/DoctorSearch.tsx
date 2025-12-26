
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name..."
          className="w-full h-11 pl-10 rounded-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
        <SelectTrigger className="w-full h-11 text-base rounded-lg">
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
