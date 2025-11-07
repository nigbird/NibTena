
'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2, Edit, PowerOff, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import type { Doctor } from '@/lib/definitions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteDoctor, updateDoctorStatus } from '@/app/hospital-admin/doctors/actions';
import { useToast } from '@/hooks/use-toast';

type DoctorListProps = {
  doctors: Doctor[];
  onEdit: (doctor: Doctor) => void;
  onDelete: () => void;
  onStatusChange: () => void;
};

export default function DoctorList({ doctors, onEdit, onDelete, onStatusChange }: DoctorListProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const { toast } = useToast();

  const handleDeleteClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDoctor) return;
    const result = await deleteDoctor(selectedDoctor.id);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      onDelete();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
    setIsAlertOpen(false);
    setSelectedDoctor(null);
  };

  const handleToggleStatus = async (doctor: Doctor) => {
    const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
    const result = await updateDoctorStatus(doctor.id, newStatus);
     if (result.success) {
      toast({ title: "Success", description: result.message });
      onStatusChange();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Image</span>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Specialty</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden md:table-cell">Fee</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {doctors.map((doctor) => {
            const isInactive = doctor.status === 'inactive';
            return (
              <TableRow key={doctor.id} className={isInactive ? 'bg-muted/50' : ''}>
                <TableCell className="hidden sm:table-cell">
                  <Avatar className="h-12 w-12">
                      {doctor.imageUrl && <AvatarImage src={doctor.imageUrl} alt={doctor.name} />}
                      <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{doctor.name}</TableCell>
                <TableCell>{doctor.specialty}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={doctor.status === 'active' ? 'accent' : 'outline'}>{doctor.status}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{doctor.consultationFee}ETB</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(doctor)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(doctor)}>
                        {doctor.status === 'active' ? <PowerOff className="mr-2 h-4 w-4 text-orange-500" /> : <Power className="mr-2 h-4 w-4 text-green-500" />}
                        {doctor.status === 'active' ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteClick(doctor)} className="text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete Dr. {selectedDoctor?.name}'s record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
