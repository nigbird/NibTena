import { getAppointmentsByDoctorId, getDoctorById } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Bot } from 'lucide-react';

// Mocking a logged-in doctor with ID 1
const MOCK_DOCTOR_ID = 1;

export default async function DoctorDashboardPage() {
  const doctor = await getDoctorById(MOCK_DOCTOR_ID);
  const appointments = await getAppointmentsByDoctorId(MOCK_DOCTOR_ID);

  return (
    <div className="container py-12">
      <div className="mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-tight">
          Welcome, {doctor?.name}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Here are your upcoming appointments for today.
        </p>
      </div>

      {appointments.length > 0 ? (
        <div className="space-y-6">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-headline">{appointment.patientName}</CardTitle>
                <Badge variant={appointment.status === 'confirmed' ? 'default' : 'destructive'} className="bg-accent text-accent-foreground">
                    {appointment.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <span className='flex items-center'><User className="mr-2 h-4 w-4" /> Age: {appointment.patientAge}, Gender: {appointment.patientGender}</span>
                        <span className='flex items-center'><Calendar className="mr-2 h-4 w-4" /> {appointment.appointmentDate}</span>
                        <span className='flex items-center'><Clock className="mr-2 h-4 w-4" /> {appointment.appointmentSlot}</span>
                    </div>
                     <div className="space-y-2 pt-2">
                        <h4 className="font-semibold text-foreground">Patient's Stated Symptoms</h4>
                        <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md border">{appointment.symptoms}</p>
                    </div>
                    <div className="space-y-2 pt-2">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary-foreground" />
                            AI-Generated Summary
                        </h4>
                        <p className="text-sm font-mono p-3 bg-primary/10 rounded-md border border-primary/20 text-primary-foreground">{appointment.summary}</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold font-headline">No appointments today</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your schedule is clear. Enjoy your day!</p>
        </div>
      )}
    </div>
  );
}
