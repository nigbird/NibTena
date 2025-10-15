
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, ClipboardPlus, Search } from "lucide-react";
import type { Appointment, Doctor } from '@/lib/definitions';
import { getAppointments, getAppointmentsCount, getDoctorsByHospitalId } from './actions';
import AppointmentList from '@/components/hospital-admin/appointment-list';
import AppointmentFormDrawer from '@/components/hospital-admin/appointment-form-drawer';
import { Input } from '@/components/ui/input';
import PaginationControls from '@/components/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton';

type EnrichedAppointment = Appointment & { patient: { name: string; phone: string; age: number; gender: string; } };

export default function AppointmentsPageContent({ hospitalId }: { hospitalId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = searchParams.get('page') ?? '1';
  const perPage = searchParams.get('per_page') ?? '10';
  const query = searchParams.get('query') ?? '';

  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<EnrichedAppointment | null>(null);
  const [searchTerm, setSearchTerm] = useState(query);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointmentsAndDoctors = useCallback(async () => {
    setIsLoading(true);
    const pageAsNumber = Number(page);
    const perPageAsNumber = Number(perPage);
    try {
      const [appointmentsData, count, doctorsData] = await Promise.all([
        getAppointments(hospitalId, pageAsNumber, perPageAsNumber, query),
        getAppointmentsCount(hospitalId, query),
        getDoctorsByHospitalId(hospitalId)
      ]);
      setAppointments(appointmentsData as EnrichedAppointment[]);
      setTotalAppointments(count);
      setDoctors(doctorsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, query, hospitalId]);

  useEffect(() => {
    fetchAppointmentsAndDoctors();
  }, [fetchAppointmentsAndDoctors]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    params.set('query', searchTerm);
    router.push(`/hospital-admin/appointments?${params.toString()}`);
  }

  const handleAddClick = () => {
    setEditingAppointment(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (appointment: EnrichedAppointment) => {
    setEditingAppointment(appointment);
    setIsDrawerOpen(true);
  };

  const handleFormActionSuccess = useCallback(() => {
    fetchAppointmentsAndDoctors();
    setIsDrawerOpen(false);
    setEditingAppointment(null);
  }, [fetchAppointmentsAndDoctors]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Appointment Management</h1>
          <p className="text-lg text-muted-foreground">View and manage all appointments.</p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Appointment
        </Button>
      </div>

      <AppointmentFormDrawer
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
        onAppointmentSaved={handleFormActionSuccess}
        appointmentToEdit={editingAppointment}
        doctors={doctors}
        hospitalId={hospitalId}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>A list of all upcoming and past appointments.</CardDescription>
            <form onSubmit={handleSearch} className="relative pt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by patient or doctor..."
                  className="w-full appearance-none bg-background pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
          ) : appointments.length > 0 ? (
            <AppointmentList 
              appointments={appointments}
              doctors={doctors}
              onEdit={handleEditClick}
              onActionSuccess={handleFormActionSuccess}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
              <ClipboardPlus className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold font-headline">No appointments found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Appointments will appear here as they are booked.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t p-4">
            <PaginationControls totalCount={totalAppointments} resourceName="appointments" />
        </CardFooter>
      </Card>
    </div>
  );
}

    