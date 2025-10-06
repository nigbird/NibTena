import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Reports & Analytics</h1>
        <p className="text-lg text-muted-foreground">View insights into your hospital's performance.</p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Performance Reports</CardTitle>
            <CardDescription>Analytics on appointments, revenue, and doctor utilization.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                <LineChart className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold font-headline">Coming Soon</h3>
                <p className="mt-2 text-sm text-muted-foreground">Detailed reports and analytics are under development.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
