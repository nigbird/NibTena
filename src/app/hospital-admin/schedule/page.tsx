import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function ScheduleSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Schedule Settings</h1>
        <p className="text-lg text-muted-foreground">Configure hospital-wide availability and booking rules.</p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Schedule Configuration</CardTitle>
            <CardDescription>Define working hours and booking policies.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold font-headline">Coming Soon</h3>
                <p className="mt-2 text-sm text-muted-foreground">Advanced schedule management is under development.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
