
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hospital } from "lucide-react";

export default function SuperAdminHospitalsPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Hospital Management</h1>
        <p className="text-lg text-muted-foreground">Add, edit, and manage all hospitals on the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Hospitals</CardTitle>
          <CardDescription>A list of all hospitals registered in Mediverse.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <Hospital className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No hospitals found</h3>
            <p className="mt-2 text-sm text-muted-foreground">The hospital management interface will be here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
