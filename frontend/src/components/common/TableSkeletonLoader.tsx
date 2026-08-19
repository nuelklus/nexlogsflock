"use client";

import { Skeleton, TableCell, TableRow } from "@mui/material";

export interface TableSkeletonLoaderProps {
  rows?: number;
  columns?: number;
}

export function TableSkeletonLoader({ rows = 5, columns = 3 }: TableSkeletonLoaderProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton width={80 + ((rowIndex + colIndex) % 4) * 18} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
