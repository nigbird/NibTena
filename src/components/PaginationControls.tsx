
'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
  totalCount: number;
}

const PaginationControls = ({ totalCount }: PaginationControlsProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const perPage = Number(searchParams.get('per_page') ?? '10');
  const query = searchParams.get('query') ?? '';

  const totalPages = Math.ceil(totalCount / perPage);
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/super-admin/hospitals?${params.toString()}`);
  };

  const handlePerPageChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    params.set('per_page', value);
    router.push(`/super-admin/hospitals?${params.toString()}`);
  };

  const paginationNumbers = useMemo(() => {
    const pages = [];
    const delta = 1; // Number of pages to show around the current page
    const left = page - delta;
    const right = page + delta;
    let l;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= left && i <= right)) {
            if (l && i - l !== 1) {
                pages.push('...');
            }
            pages.push(i);
            l = i;
        }
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
        <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages > 0 ? totalPages : 1} ({totalCount} hospital(s) found)
        </div>
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={!hasPrevPage}
            >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
            </Button>
            
            <div className="flex items-center gap-1">
                {paginationNumbers.map((p, i) =>
                    typeof p === 'number' ? (
                    <Button
                        key={i}
                        variant={p === page ? 'accent' : 'ghost'}
                        size="sm"
                        className="h-9 w-9 px-0"
                        onClick={() => handlePageChange(p)}
                    >
                        {p}
                    </Button>
                    ) : (
                    <span key={i} className="px-2 py-1">
                        ...
                    </span>
                    )
                )}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={!hasNextPage}
            >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Rows:</span>
            <Select value={perPage.toString()} onValueChange={handlePerPageChange}>
                <SelectTrigger className="w-[70px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
  );
};

export default PaginationControls;
