
'use client';

import { useContext } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DoctorPortalContext } from './doctor-portal-context';
import { Hospital } from 'lucide-react';

export default function HospitalSwitcher() {
  const { doctorHospitals, activeHospitalId, setActiveHospitalId, doctor } = useContext(DoctorPortalContext);

  if (!doctor || !doctorHospitals || doctorHospitals.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
       <Hospital className="h-5 w-5 text-muted-foreground" />
        <Select
            value={activeHospitalId?.toString()}
            onValueChange={(value) => setActiveHospitalId(Number(value))}
        >
            <SelectTrigger className="w-[180px] h-9 border-muted-foreground/50">
                <SelectValue placeholder="Select Hospital" />
            </SelectTrigger>
            <SelectContent>
                {doctorHospitals.map((hospital) => (
                <SelectItem key={hospital.id} value={hospital.id.toString()}>
                    {hospital.name}
                </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
  );
}
