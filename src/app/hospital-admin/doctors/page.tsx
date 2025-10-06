'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Users } from "lucide-react";
import type { Doctor } from '@/lib/definitions';
import { getDoctorsByHospitalId } from '@/lib/data';
import DoctorList from '@/components/hospital-admin/doctor-list';
import DoctorFormDrawer from '@/components/hospital-admin/doctor-form-drawer';

// Mocking a logged-in admin for Hospital ID 1
const MOCK_HOSPITAL_ID = 1;

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const fetchDoctors = useCallback(async () => {
    const doctorsData = await getDoctorsByHospitalId(MOCK_HOSPITAL_ID);
    setDoctors(doctorsData);
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleAddClick = () => {
    setEditingDoctor(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setIsDrawerOpen(true);
  };

  const handleFormAction = useCallback(() => {
    fetchDoctors(); // Re-fetch the doctors list
    setIsDrawerOpen(false); // Close the drawer
    setEditingDoctor(null); // Reset editing state
  }, [fetchDoctors]);


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
        hospitalId={MOCK_HOSPITAL_ID}
        onDoctorSaved={handleFormAction}
        doctorToEdit={editingDoctor}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Doctors</CardTitle>
          <CardDescription>A list of all doctors in your hospital.</CardDescription>
        </CardHeader>
        <CardContent>
          {doctors.length > 0 ? (
            <DoctorList 
              doctors={doctors} 
              onEdit={handleEditClick}
              onDelete={handleFormAction}
              onStatusChange={handleFormAction}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold font-headline">No doctors yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Click "Add Doctor" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
