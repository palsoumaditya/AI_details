"use client";

import { Pagination } from "@/components/ui/pagination";
import type { PaginationMeta } from "@oneatlas/backend/shared";

export interface LeaderboardPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function LeaderboardPagination({
  pagination,
  onPageChange,
}: LeaderboardPaginationProps) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <Pagination
      pagination={pagination}
      onPageChange={onPageChange}
      itemLabel="models"
    />
  );
}
