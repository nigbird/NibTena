'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Users, ClipboardPlus, Search } from "lucide-react";
import type { Appointment, Doctor } from '@/lib/definitions';
import { getAppointmentsByHospitalId, getDoctorsByHospitalId } from './actions';
import AppointmentList from '@/components/hospital-admin/appointment-list';
import AppointmentFormDrawer from '@/components/hospital-admin/appointment-form-drawer';
import { Input } from '@/components/ui/input';

// Mocking a logged-in admin for Hospital ID 1
const MOCK_HOSPITAL_ID = 1;

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAppointmentsAndDoctors = useCallback(async () => {
    const [appointmentsData, doctorsData] = await Promise.all([
      getAppointmentsByHospitalId(MOCK_HOSPITAL_ID),
      getDoctorsByHospitalId(MOCK_HOSPITAL_ID)
    ]);
    setAppointments(appointmentsData.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()));
    setDoctors(doctorsData);
  }, []);

  useEffect(() => {
    fetchAppointmentsAndDoctors();
  }, [fetchAppointmentsAndDoctors]);

  const handleAddClick = () => {
    setEditingAppointment(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsDrawerOpen(true);
  };

  const handleFormActionSuccess = useCallback(() => {
    fetchAppointmentsAndDoctors();
    setIsDrawerOpen(false);
    setEditingAppointment(null);
  }, [fetchAppointmentsAndDoctors]);

  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;
    
    const lowercasedFilter = searchTerm.toLowerCase();
    return appointments.filter(appointment => {
      const doctor = doctors.find(d => d.id === appointment.doctorId);
      return (
        appointment.patientName.toLowerCase().includes(lowercasedFilter) ||
        (doctor && doctor.name.toLowerCase().includes(lowercasedFilter))
      );
    });
  }, [searchTerm, appointments, doctors]);

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
      />

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>A list of all upcoming and past appointments.</CardDescription>
            <div className="relative pt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by patient or doctor..."
                  className="w-full appearance-none bg-background pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length > 0 ? (
            <AppointmentList 
              appointments={filteredAppointments}
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
      </Card>
    </div>
  );
}
