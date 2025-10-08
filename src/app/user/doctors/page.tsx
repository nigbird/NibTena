
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  getDoctors,
  getSpecialties,
  getHospitalById,
} from '@/lib/data';
import type { Doctor, Hospital } from '@/lib/definitions';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { placeholderImages } from '@/lib/placeholder-images';
import Header from '@/components/header';

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const doctorImage = placeholderImages.find((p) => p.id === doctor.imageId);
  const [hospital, setHospital] = useState<Hospital | undefined>();

  useEffect(() => {
    if (doctor.hospitalIds.length > 0) {
      getHospitalById(doctor.hospitalIds[0]).then(setHospital);
    }
  }, [doctor.hospitalIds]);

  return (
    <Card className="flex items-start p-4 gap-4 shadow-md">
       <Avatar className="h-20 w-20 border-2 border-primary/20">
          {doctorImage && (
            <AvatarImage
              src={doctorImage.imageUrl}
              alt={doctor.name}
              data-ai-hint={doctorImage.imageHint}
            />
          )}
          <AvatarFallback>
            <User />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <h3 className="font-bold text-lg">{doctor.name}</h3>
            <Badge variant="secondary" className="mt-1">{doctor.specialty}</Badge>
            {hospital && (
            <p className="text-sm text-muted-foreground mt-1">{hospital.name}</p>
            )}
            <Button asChild size="sm" variant="accent" className="rounded-full mt-3">
                <Link href={`/user/doctors/${doctor.id}`}>View Profile</Link>
            </Button>
        </div>
    </Card>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const specialtyQuery = searchParams.get('specialty');

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(specialtyQuery || 'all');
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    getDoctors().then((data) => {
      setDoctors(data);
    });
    getSpecialties().then(setSpecialties);
  }, []);
  
  useEffect(() => {
    // If a specialty is in the URL, set it as the selected filter
    const initialSpecialty = specialtyQuery || 'all';
    setSelectedSpecialty(initialSpecialty);
  }, [specialtyQuery]);


  useEffect(() => {
    if (selectedSpecialty === 'all') {
      setFilteredDoctors(doctors);
    } else {
      setFilteredDoctors(
        doctors.filter((doc) => doc.specialty === selectedSpecialty)
      );
    }
  }, [selectedSpecialty, doctors]);

  return (
    <>
      <Header title="Doctors" />
      <div className="p-4 space-y-8">
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

        {filteredDoctors.length > 0 ? (
            <div className="space-y-4">
            {filteredDoctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center mt-12">
            <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">
                No Doctors Found
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
                Try selecting a different specialty or check back later.
            </p>
            </div>
        )}
      </div>
    </>
  );
}
