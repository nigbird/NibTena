'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getDoctors,
  getSpecialties,
  getHospitalById,
} from '@/lib/data';
import type { Doctor, Hospital } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const doctorImage = placeholderImages.find((p) => p.id === doctor.imageId);
  const [hospital, setHospital] = useState<Hospital | undefined>();

  useEffect(() => {
    getHospitalById(doctor.hospitalId).then(setHospital);
  }, [doctor.hospitalId]);

  return (
    <Card className="flex flex-col text-center items-center pt-6 shadow-lg transition-transform hover:-translate-y-1 h-full">
      <CardHeader className="items-center p-4">
        <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
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
        <CardTitle className="font-headline">{doctor.name}</CardTitle>
        <Badge variant="secondary" className="mt-1">
          {doctor.specialty}
        </Badge>
        {hospital && (
          <p className="text-sm text-muted-foreground mt-2">{hospital.name}</p>
        )}
      </CardHeader>
      <CardContent className="flex-grow w-full">
        <Button asChild className="w-full" variant="accent">
          <Link href={`/doctors/${doctor.id}`}>View Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SearchPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    getDoctors().then((data) => {
      setDoctors(data);
      setFilteredDoctors(data);
    });
    getSpecialties().then(setSpecialties);
  }, []);

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
    <div className="container py-12">
      <div className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight">
          Find a Doctor
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Search for a doctor by their specialty to find the right care for you.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-8">
        <Select
          value={selectedSpecialty}
          onValueChange={setSelectedSpecialty}
        >
          <SelectTrigger className="w-full h-12 text-lg">
            <SearchIcon className="mr-3 h-5 w-5" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
  );
}
