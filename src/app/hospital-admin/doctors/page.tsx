import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

export default function DoctorsPage() {
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Doctor Management</h1>
                <p className="text-lg text-muted-foreground">Manage your hospital's doctors.</p>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Doctor
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>All Doctors</CardTitle>
                <CardDescription>A list of all doctors in your hospital.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold font-headline">No doctors yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Click "Add Doctor" to get started.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  )
}

import { Users } from "lucide-react";
