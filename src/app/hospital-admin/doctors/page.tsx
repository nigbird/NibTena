'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Users } from "lucide-react";
import type { Doctor } from '@/lib/definitions';
import { getDoctorsByHospitalId } from '@/lib/data';
import DoctorList from '@/components/hospital-admin/doctor-list';
import AddDoctorDrawer from '@/components/hospital-admin/add-doctor-drawer';

// Mocking a logged-in admin for Hospital ID 1
const MOCK_Hospital_ID = 1;

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    getDoctorsByHospitalId(MOCK_Hospital_ID).then(setDoctors);
  }, []);

  const handleDoctorAdded = (newDoctor: Doctor) => {
    // Refetch or just add to the list for optimistic update
     getDoctorsByHospitalId(MOCK_Hospital_ID).then(setDoctors);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Doctor Management</h1>
                <p className="text-lg text-muted-foreground">Manage your hospital's doctors.</p>
            </div>
            <AddDoctorDrawer
              hospitalId={MOCK_Hospital_ID}
              onDoctorAdded={handleDoctorAdded}
            >
              <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Doctor
              </Button>
            </AddDoctorDrawer>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>All Doctors</CardTitle>
                <CardDescription>A list of all doctors in your hospital.</CardDescription>
            </CardHeader>
            <CardContent>
                {doctors.length > 0 ? (
                    <DoctorList doctors={doctors} />
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
