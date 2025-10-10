
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

  const handlePrev = () => {
    router.push(`/super-admin/hospitals?page=${Number(page) - 1}&per_page=${perPage}`)
  }
  const handleNext = () => {
    router.push(`/super-admin/hospitals?page=${Number(page) + 1}&per_page=${perPage}`)
  }

  return (
    <div className='flex items-center gap-4'>
      <Button
        variant="outline"
        disabled={!hasPrevPage}
        onClick={handlePrev}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
      </Button>
      
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="outline"
        disabled={!hasNextPage}
        onClick={handleNext}>
        Next <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

export default PaginationControls
