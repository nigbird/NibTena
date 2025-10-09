'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--destructive))'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface SuperAdminDashboardClientProps {
    chartData: { name: string; doctors: number; appointments: number; }[];
    appointmentStatusData: { name: string; value: number }[];
}

export default function SuperAdminDashboardClient({ chartData, appointmentStatusData }: SuperAdminDashboardClientProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <LineChart className="h-5 w-5" />
                        Hospital Activity
                    </CardTitle>
                    <CardDescription>A summary of doctors and appointments per hospital.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))'
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '14px' }} />
                            <Bar dataKey="doctors" fill="hsl(var(--secondary))" name="Doctors" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="appointments" fill="hsl(var(--primary))" name="Appointments" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5" />
                        Overall Appointment Status
                    </CardTitle>
                    <CardDescription>A platform-wide breakdown of all appointment statuses. "Confirmed" includes rescheduled bookings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={appointmentStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {appointmentStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))'
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '14px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
