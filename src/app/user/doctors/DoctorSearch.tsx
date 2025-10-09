
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

type DoctorSearchProps = {
  specialties: string[];
  initialSpecialty?: string;
};

export default function DoctorSearch({ specialties, initialSpecialty }: DoctorSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty || 'all');

  // Update URL when specialty changes
  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (selectedSpecialty === 'all') {
      current.delete('specialty');
    } else {
      current.set('specialty', selectedSpecialty);
    }
    
    const search = current.toString();
    const query = search ? `?${search}` : "";

    router.push(`/user/doctors${query}`);

  }, [selectedSpecialty, router, searchParams]);

  return (
    <div className="max-w-md mx-auto">
      <Select
        value={selectedSpecialty}
        onValueChange={setSelectedSpecialty}
      >
        <SelectTrigger className="w-full h-12 text-base rounded-full">
          <SearchIcon className="mr-3 h-5 w-5 text-muted-foreground" />
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
