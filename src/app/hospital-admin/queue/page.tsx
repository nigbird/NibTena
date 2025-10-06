import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListOrdered } from "lucide-react";

export default function QueueManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Queue Management</h1>
        <p className="text-lg text-muted-foreground">Manage the daily patient queue for walk-in and scheduled appointments.</p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Today's Queue</CardTitle>
            <CardDescription>Live view of patients waiting and being served.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold font-headline">Coming Soon</h3>
                <p className="mt-2 text-sm text-muted-foreground">Live queue management is under development.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
