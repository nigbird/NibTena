
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
import type { Hospital } from '@/lib/definitions';
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
import { deleteHospital, updateHospitalStatus } from '@/app/super-admin/hospitals/actions';
import { useToast } from '@/hooks/use-toast';

type HospitalListProps = {
  hospitals: Hospital[];
  onEdit: (hospital: Hospital) => void;
  onActionSuccess: () => void;
};

export default function HospitalList({ hospitals, onEdit, onActionSuccess }: HospitalListProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const { toast } = useToast();

  const handleDeleteClick = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedHospital) return;
    const result = await deleteHospital(selectedHospital.id);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      onActionSuccess();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
    setIsAlertOpen(false);
    setSelectedHospital(null);
  };

  const handleToggleStatus = async (hospital: Hospital) => {
    const newStatus = hospital.status === 'active' ? 'inactive' : 'active';
    const result = await updateHospitalStatus(hospital.id, newStatus);
     if (result.success) {
      toast({ title: "Success", description: result.message });
      onActionSuccess();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
  };

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden lg:table-cell">Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hospitals.map((hospital) => {
              const isInactive = hospital.status === 'inactive';
              return (
                <TableRow key={hospital.id} className={isInactive ? 'bg-muted/50' : ''}>
                  <TableCell className="hidden sm:table-cell">
                    <Avatar className="h-12 w-12 rounded-md">
                        {hospital.imageUrl && <AvatarImage src={hospital.imageUrl} alt={hospital.name} />}
                        <AvatarFallback className="rounded-md">{hospital.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{hospital.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{hospital.city}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-sm">{hospital.contactEmail}</div>
                    <div className="text-xs text-muted-foreground">{hospital.contactPhone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isInactive ? 'outline' : 'accent'}>{hospital.status}</Badge>
                  </TableCell>
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
                        <DropdownMenuItem onClick={() => onEdit(hospital)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(hospital)}>
                          {hospital.status === 'active' ? <PowerOff className="mr-2 h-4 w-4 text-orange-500" /> : <Power className="mr-2 h-4 w-4 text-green-500" />}
                          <span>{hospital.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(hospital)} className="text-destructive">
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
      </div>
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the hospital "{selectedHospital?.name}" and all associated doctors and appointments.
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
