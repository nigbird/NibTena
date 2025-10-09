
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Hospital as HospitalIcon, Search } from "lucide-react";
import { Input } from '@/components/ui/input';
import prisma from '@/lib/prisma';
import type { Hospital } from '@/lib/definitions';
import HospitalList from '@/components/super-admin/hospital-list';
import HospitalFormDrawer from '@/components/super-admin/hospital-form-drawer';

async function getHospitals(): Promise<Hospital[]> {
  const hospitals = await prisma.hospital.findMany();
  return hospitals.map(h => ({ ...h, status: h.status as 'active' | 'inactive'}));
}

export default function SuperAdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);

  const fetchHospitals = useCallback(async () => {
    const data = await getHospitals();
    setHospitals(data);
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = hospitals.filter(hospital =>
      hospital.name.toLowerCase().includes(lowercasedFilter) ||
      hospital.city.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredHospitals(filtered);
  }, [searchTerm, hospitals]);

  const handleAddClick = () => {
    setEditingHospital(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setIsDrawerOpen(true);
  };
  
  const handleActionSuccess = () => {
    fetchHospitals();
    setIsDrawerOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Hospital Management</h1>
          <p className="text-lg text-muted-foreground">Add, edit, and manage all hospitals on the platform.</p>
        </div>
        <Button onClick={handleAddClick} variant="accent">
          <PlusCircle className="mr-2" />
          Add Hospital
        </Button>
      </div>
      
       <HospitalFormDrawer
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
        onActionSuccess={handleActionSuccess}
        hospitalToEdit={editingHospital}
      />


      <Card>
        <CardHeader>
          <CardTitle>All Hospitals</CardTitle>
          <CardDescription>A list of all hospitals registered in Mediverse.</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search hospitals by name or city..."
              className="w-full appearance-none bg-background pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredHospitals.length > 0 ? (
            <HospitalList 
              hospitals={filteredHospitals}
              onEdit={handleEditClick}
              onActionSuccess={handleActionSuccess}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
              <HospitalIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold font-headline">No hospitals found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Click "Add Hospital" to get started or try a different search term.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
