import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

export const Table: React.FC<TableProps> = ({ className = '', ...props }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
    <table className={`w-full text-sm ${className}`} {...props} />
  </div>
);

interface TableSectionProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}
interface TableCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}
interface TableDataCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableHead: React.FC<TableSectionProps> = ({ className = '', ...props }) => (
  <thead className={`bg-[#1E3A8A] text-white ${className}`} {...props} />
);

export const TableBody: React.FC<TableSectionProps> = ({ className = '', ...props }) => (
  <tbody className={`divide-y divide-slate-100 ${className}`} {...props} />
);

export const TableRow: React.FC<TableRowProps> = ({ className = '', ...props }) => (
  <tr className={`hover:bg-slate-50 ${className}`} {...props} />
);

export const TableHeaderCell: React.FC<TableCellProps> = ({ className = '', ...props }) => (
  <th className={`px-4 py-3 text-left font-medium ${className}`} {...props} />
);

export const TableCell: React.FC<TableDataCellProps> = ({ className = '', ...props }) => (
  <td className={`px-4 py-3 text-slate-700 ${className}`} {...props} />
);
