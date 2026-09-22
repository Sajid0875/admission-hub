import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table ref={ref} className={cn("w-full caption-bottom text-sm text-left", className)} {...props}>
          {children}
        </table>
      </div>
    );
  }
);
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead ref={ref} className={cn("bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider", className)} {...props}>
        {children}
      </thead>
    );
  }
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody ref={ref} className={cn("divide-y divide-slate-100 bg-white", className)} {...props}>
        {children}
      </tbody>
    );
  }
);
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <tr ref={ref} className={cn("transition-colors hover:bg-slate-50/60", className)} {...props}>
        {children}
      </tr>
    );
  }
);
TableRow.displayName = "TableRow";

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sortDirection, onSort, ...props }, ref) => {
    return (
      <th
        ref={ref}
        onClick={sortable ? onSort : undefined}
        className={cn(
          "h-11 px-4 text-xs font-semibold text-slate-600 select-none",
          sortable && "cursor-pointer hover:text-slate-900 transition-colors",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-1.5">
          <span>{children}</span>
          {sortable && (
            <span className="text-slate-400">
              {sortDirection === "asc" ? (
                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
              ) : sortDirection === "desc" ? (
                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>
      </th>
    );
  }
);
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <td ref={ref} className={cn("p-4 text-slate-700 text-sm align-middle", className)} {...props}>
        {children}
      </td>
    );
  }
);
TableCell.displayName = "TableCell";

export function TableLoadingState({ colSpan = 5 }: { colSpan?: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-6">
        <TableSkeleton rows={4} cols={colSpan} />
      </TableCell>
    </TableRow>
  );
}

export function TableEmptyState({
  colSpan = 5,
  title = "No data found",
  description = "There are no records matching your criteria.",
  action,
}: {
  colSpan?: number;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-8">
        <EmptyState title={title} description={description} action={action} />
      </TableCell>
    </TableRow>
  );
}
