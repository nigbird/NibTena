'use client';

import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
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
import { placeholderImages } from '@/lib/placeholder-images';

type DoctorListProps = {
  doctors: Doctor[];
};

export default function DoctorList({ doctors }: DoctorListProps) {
  return (
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
          const doctorImage = placeholderImages.find(p => p.id === doctor.imageId);
          return (
            <TableRow key={doctor.id}>
              <TableCell className="hidden sm:table-cell">
                <Avatar className="h-12 w-12">
                    {doctorImage && <AvatarImage src={doctorImage.imageUrl} alt={doctor.name} />}
                    <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{doctor.name}</TableCell>
              <TableCell>{doctor.specialty}</TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={doctor.status === 'active' ? 'accent' : 'outline'}>{doctor.status}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">${doctor.consultationFee}</TableCell>
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
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Deactivate</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
