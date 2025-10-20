
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Hospital as HospitalIcon, Search } from "lucide-react";
import { Input } from '@/components/ui/input';
import { getHospitals, getHospitalsCount } from './actions';
import type { Hospital } from '@/lib/definitions';
import HospitalList from '@/components/super-admin/hospital-list';
import HospitalFormDrawer from '@/components/super-admin/hospital-form-drawer';
import PaginationControls from '@/components/PaginationControls';

function HospitalsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = searchParams.get('page') ?? '1';
  const perPage = searchParams.get('per_page') ?? '10';
  const query = searchParams.get('query') ?? '';
  
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [totalHospitals, setTotalHospitals] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [searchTerm, setSearchTerm] = useState(query);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHospitalsAndCount = useCallback(async () => {
    setIsLoading(true);
    const pageAsNumber = Number(page);
    const perPageAsNumber = Number(perPage);
    try {
        const [data, count] = await Promise.all([
          getHospitals(pageAsNumber, perPageAsNumber, query),
          getHospitalsCount(query),
        ]);
        setHospitals(data);
        setTotalHospitals(count);
    } catch (error) {
        console.error("Failed to fetch hospitals:", error);
        // Handle error, e.g., show a toast notification
    } finally {
        setIsLoading(false);
    }
  }, [page, perPage, query]);
  
  useEffect(() => {
    fetchHospitalsAndCount();
  }, [fetchHospitalsAndCount]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    params.set('query', searchTerm);
    router.push(`/super-admin/hospitals?${params.toString()}`);
  }

  const handleAddClick = () => {
    setEditingHospital(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setIsDrawerOpen(true);
  };

  const handleActionSuccess = useCallback(() => {
    fetchHospitalsAndCount();
    setIsDrawerOpen(false);
  }, [fetchHospitalsAndCount])

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
          <CardDescription>A list of all hospitals registered in NibTena.</CardDescription>
          <form onSubmit={handleSearch} className="relative pt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search hospitals by name or city..."
              className="w-full appearance-none bg-background pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
                <p>Loading...</p>
            </div>
          ) : hospitals.length > 0 ? (
            <HospitalList
              hospitals={hospitals}
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
        {totalHospitals > 0 && (
          <CardFooter className="border-t p-4">
             <PaginationControls totalCount={totalHospitals} />
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function SuperAdminHospitalsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HospitalsPageContent />
        </Suspense>
    )
}
