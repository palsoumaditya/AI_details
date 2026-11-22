"use client";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@oneatlas/backend/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (newPage: number) => void;
  itemLabel?: string;
}

export function Pagination({
  pagination,
  onPageChange,
  itemLabel = "items",
}: PaginationProps) {
  const { page, totalPages, total, limit, hasNextPage, hasPreviousPage } =
    pagination;

  if (total === 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-border mt-8">
      {/* Range summary */}
      <p className="text-xs text-text-secondary">
        Showing <span className="font-medium text-text-primary">{startItem}</span> to{" "}
        <span className="font-medium text-text-primary">{endItem}</span> of{" "}
        <span className="font-medium text-text-primary">{total}</span> {itemLabel}
      </p>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="gap-1 h-8 px-2.5 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </Button>

        <span className="text-xs text-text-secondary px-2">
          Page <span className="font-medium text-text-primary">{page}</span> of{" "}
          <span className="font-medium text-text-primary">{totalPages}</span>
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="gap-1 h-8 px-2.5 text-xs"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
