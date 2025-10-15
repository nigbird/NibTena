
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Users, Search } from "lucide-react";
import type { Doctor } from '@/lib/definitions';
import { getDoctors, getDoctorsCount } from './actions';
import DoctorList from '@/components/hospital-admin/doctor-list';
import DoctorFormDrawer from '@/components/hospital-admin/doctor-form-drawer';
import PaginationControls from '@/components/PaginationControls';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';


function DoctorsPageContent({ hospitalId }: { hospitalId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = searchParams.get('page') ?? '1';
  const perPage = searchParams.get('per_page') ?? '10';
  const query = searchParams.get('query') ?? '';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [searchTerm, setSearchTerm] = useState(query);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDoctorsAndCount = useCallback(async () => {
    setIsLoading(true);
    const pageAsNumber = Number(page);
    const perPageAsNumber = Number(perPage);
    try {
      const [data, count] = await Promise.all([
        getDoctors(hospitalId, pageAsNumber, perPageAsNumber, query),
        getDoctorsCount(hospitalId, query),
      ]);
      setDoctors(data);
      setTotalDoctors(count);
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, query, hospitalId]);

  useEffect(() => {
    fetchDoctorsAndCount();
  }, [fetchDoctorsAndCount]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    params.set('query', searchTerm);
    router.push(`/hospital-admin/doctors?${params.toString()}`);
  }

  const handleAddClick = () => {
    setEditingDoctor(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setIsDrawerOpen(true);
  };

  const handleFormActionSuccess = useCallback(() => {
    fetchDoctorsAndCount();
    setIsDrawerOpen(false);
    setEditingDoctor(null);
  }, [fetchDoctorsAndCount]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Doctor Management</h1>
          <p className="text-lg text-muted-foreground">Manage your hospital's doctors.</p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      <DoctorFormDrawer
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
        hospitalId={hospitalId}
        onDoctorSaved={handleFormActionSuccess}
        doctorToEdit={editingDoctor}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Doctors</CardTitle>
          <CardDescription>A list of all doctors in your hospital.</CardDescription>
           <form onSubmit={handleSearch} className="relative pt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search doctors by name or specialty..."
              className="w-full appearance-none bg-background pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
          ) : doctors.length > 0 ? (
            <DoctorList 
              doctors={doctors} 
              onEdit={handleEditClick}
              onDelete={handleFormActionSuccess}
              onStatusChange={handleFormActionSuccess}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold font-headline">No doctors found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Click "Add Doctor" to get started or try a different search term.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t p-4">
             <PaginationControls totalCount={totalDoctors} resourceName="doctors" />
        </CardFooter>
      </Card>
    </div>
  );
}

import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function DoctorsPage() {
    const session = await getSession();
    if (!session.isLoggedIn || !session.hospitalId) {
        redirect('/hospital-admin/login');
    }

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DoctorsPageContent hospitalId={session.hospitalId} />
        </Suspense>
    )
}
