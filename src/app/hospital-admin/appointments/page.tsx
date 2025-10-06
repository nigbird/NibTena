import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardPlus, PlusCircle } from "lucide-react";

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Appointment Management</h1>
                <p className="text-lg text-muted-foreground">View and manage all appointments.</p>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Appointment
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>A list of all upcoming and past appointments.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <ClipboardPlus className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold font-headline">No appointments found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Appointments will appear here as they are booked.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  )
}
