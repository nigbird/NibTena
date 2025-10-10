
'use client'

import { FC } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  hasNextPage: boolean
  hasPrevPage: boolean
  totalCount: number
  itemsPerPage: number
}

const PaginationControls: FC<PaginationControlsProps> = (
  {
    hasNextPage,
    hasPrevPage,
    totalCount,
    itemsPerPage,
  }
) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = searchParams.get('page') ?? '1'
  const perPage = searchParams.get('per_page') ?? itemsPerPage.toString();

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    params.set('per_page', perPage);
    router.push(`/super-admin/hospitals?${params.toString()}`);
  }

  return (
    <div className='flex items-center gap-4'>
      <Button
        variant="outline"
        disabled={!hasPrevPage}
        onClick={() => handlePageChange(Number(page) - 1)}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
      </Button>
      
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="outline"
        disabled={!hasNextPage}
        onClick={() => handlePageChange(Number(page) + 1)}>
        Next <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

export default PaginationControls
