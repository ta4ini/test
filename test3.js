import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

// --- Helpers for Grouping ---
const countLeafRows = (row) => {
  if (!row.subRows || row.subRows.length === 0) return 1;
  return row.subRows.reduce((acc, r) => acc + countLeafRows(r), 0);
};

const getLeafValues = (row, columnId) => {
  if (row.subRows && row.subRows.length > 0) {
    return row.subRows.flatMap(r => getLeafValues(r, columnId));
  }
  const val = row.getValue(columnId);
  return typeof val === 'number' ? [val] : [];
};

const HeaderWithGrouping = ({ header, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    <span>{title}</span>
    {header.column.getCanGroup() && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          header.column.getToggleGroupingHandler()();
        }}
        style={{ fontSize: '0.8em', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        title={header.column.getIsGrouped() ? 'Ungroup' : 'Group by this column'}
      >
        {header.column.getIsGrouped() ? '❌' : '🗂️'}
      </button>
    )}
  </div>
);

// --- Mock Data Generator ---
const generateData = (count, depth = 0, startIndex = 0) => {
  return Array.from({ length: count }).map((_, i) => {
    const id = startIndex + i;
    const hasSubRows = depth < 2 && Math.random() > 0.5;
    return {
      id: `row-${id}`,
      firstName: `First ${id}`,
      lastName: `Last ${id}`,
      age: Math.floor(Math.random() * 40) + 20,
      status: ['Single', 'In a Relationship', 'Married', 'Divorced'][Math.floor(Math.random() * 4)],
      visits: Math.floor(Math.random() * 1000),
      subRows: hasSubRows ? generateData(Math.floor(Math.random() * 3) + 1, depth + 1, id * 100) : undefined,
    };
  });
};

// --- Column Definitions ---
const columns = [
  {
    id: 'expander',
    header: '',
    cell: ({ row }) => {
      if (row.getCanExpand()) {
        return (
          <button
            onClick={row.getToggleExpandedHandler()}
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem' }}
          >
            {row.getIsExpanded() ? '▼' : '▶'}
          </button>
        );
      }
      return null;
    },
    size: 40,
    enableSorting: false,
    enableGrouping: false,
  },
  {
    accessorKey: 'firstName',
    header: (header) => <HeaderWithGrouping header={header} title="First Name" />,
    enableGrouping: true,
    cell: (info) => {
      if (info.row.getIsGrouped()) {
        return (
          <span style={{ paddingLeft: `${info.row.depth * 1.5}rem` }}>
            <strong>{info.getValue()}</strong> ({countLeafRows(info.row)})
          </span>
        );
      }
      if (info.row.getIsAggregated()) {
        return flexRender(info.column.columnDef.aggregatedCell, info.getContext());
      }
      if (info.row.getIsPlaceholder()) {
        return null;
      }
      return <span style={{ paddingLeft: `${info.row.depth * 1.5}rem` }}>{info.getValue()}</span>;
    },
    aggregatedCell: ({ row }) => <span>({countLeafRows(row)} items)</span>,
  },
  {
    accessorKey: 'lastName',
    header: (header) => <HeaderWithGrouping header={header} title="Last Name" />,
    enableGrouping: true,
    cell: (info) => {
      if (info.row.getIsGrouped()) {
        return (
          <span style={{ paddingLeft: `${info.row.depth * 1.5}rem` }}>
            <strong>{info.getValue()}</strong> ({countLeafRows(info.row)})
          </span>
        );
      }
      if (info.row.getIsAggregated()) {
        return flexRender(info.column.columnDef.aggregatedCell, info.getContext());
      }
      if (info.row.getIsPlaceholder()) {
        return null;
      }
      return info.getValue();
    },
    aggregatedCell: ({ row }) => <span>({countLeafRows(row)} items)</span>,
  },
  {
    accessorKey: 'age',
    header: (header) => <HeaderWithGrouping header={header} title="Age" />,
    enableGrouping: true,
    cell: (info) => {
      if (info.row.getIsGrouped()) {
        return (
          <span style={{ paddingLeft: `${info.row.depth * 1.5}rem` }}>
            <strong>{info.getValue()}</strong> ({countLeafRows(info.row)})
          </span>
        );
      }
      if (info.row.getIsAggregated()) {
        return flexRender(info.column.columnDef.aggregatedCell, info.getContext());
      }
      if (info.row.getIsPlaceholder()) {
        return null;
      }
      return info.getValue();
    },
    aggregatedCell: ({ row }) => {
      const ages = getLeafValues(row, 'age');
      const avg = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
      return <span>Avg: {avg}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: (header) => <HeaderWithGrouping header={header} title="Status" />,
    enableGrouping: true,
    cell: (info) => {
      if (info.row.getIsGrouped()) {
        return (
          <span style={{ paddingLeft: `${info.row.depth * 1.5}rem` }}>
            <strong>{info.getValue()}</strong> ({countLeafRows(info.row)})
          </span>
        );
      }
      if (info.row.getIsAggregated()) {
        return flexRender(info.column.columnDef.aggregatedCell, info.getContext());
      }
      if (info.row.getIsPlaceholder()) {
        return null;
      }
      return info.getValue();
    },
    aggregatedCell: ({ row }) => <span>({countLeafRows(row)} items)</span>,
  },
  {
    accessorKey: 'visits',
    header: (header) => <HeaderWithGrouping header={header} title="Visits" />,
    enableGrouping: true,
    cell: (info) => {
      if (info.row.getIsGrouped()) {
        return (
          <span style={{ paddingLeft: `${info.row.depth * 1.5}rem` }}>
            <strong>{info.getValue()}</strong> ({countLeafRows(info.row)})
          </span>
        );
      }
      if (info.row.getIsAggregated()) {
        return flexRender(info.column.columnDef.aggregatedCell, info.getContext());
      }
      if (info.row.getIsPlaceholder()) {
        return null;
      }
      return info.getValue();
    },
    aggregatedCell: ({ row }) => {
      const visits = getLeafValues(row, 'visits');
      const total = visits.reduce((a, b) => a + b, 0);
      return <span>Total: {total}</span>;
    },
  },
];

// --- Main Component ---
export default function InfiniteScrollTable() {
  const [data, setData] = useState(() => generateData(20));
  const [expanded, setExpanded] = useState({});
  const [sorting, setSorting] = useState([]);
  const [columnGrouping, setColumnGrouping] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const parentRef = useRef(null);
  const fetchLockRef = useRef(false); // Prevent duplicate fetches

  // --- Fetch More Root Rows ---
  const fetchMoreData = useCallback(async () => {
    if (fetchLockRef.current || !hasMore) return;
    fetchLockRef.current = true;
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const newData = generateData(20, 0, page * 20);
      
      if (newData.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...newData]);
        setPage(p => p + 1);
      }
    } finally {
      setIsLoading(false);
      fetchLockRef.current = false;
    }
  }, [hasMore, page]);

  // --- Table Instance ---
  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
      sorting,
      grouping: columnGrouping,
    },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onGroupingChange: setColumnGrouping,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    debugTable: false,
  });

  const { rows } = table.getRowModel();

  // --- Virtualizer ---
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 5,
  });

  // --- Reset on Sort/Group Change ---
  useEffect(() => {
    // When sorting or grouping changes, reset to first page
    // (since infinite scroll assumes append-only; global sort/group breaks that)
    setData(generateData(20));
    setExpanded({});
    setPage(1);
    setHasMore(true);
  }, [sorting, columnGrouping]);

  // --- Infinite Scroll Trigger ---
  useEffect(() => {
    if (!hasMore || isLoading) return;

    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];

    if (lastItem && lastItem.index >= rows.length - 5) {
      fetchMoreData();
    }
  }, [rows.length, hasMore, isLoading, fetchMoreData]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>TanStack Table: Infinite Scroll (Root) + Subrows + Multi-Sort + Multi-Group</h2>

      <div
        ref={parentRef}
        style={{
          height: '500px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          borderRadius: '8px',
          position: 'relative',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f8f9fa' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      padding: '12px',
                      borderBottom: '2px solid #ddd',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      width: header.getSize(),
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted()] ?? null}
                      {header.column.getCanSort() && (
                        <span style={{ fontSize: '0.8em', color: '#888' }}>
                          {header.column.getIsSorted() ? '' : ' (click to sort)'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody
            style={{
              display: 'block',
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    transform: `translateY(${virtualRow.start}px)`,
                    width: '100%',
                    background: virtualRow.index % 2 === 0 ? '#fff' : '#fafafa',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        flex: `0 0 ${cell.column.getSize()}px`,
                        padding: '12px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Loading & End Indicators */}
        {isLoading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Loading more root rows...
          </div>
        )}
        {!hasMore && !isLoading && rows.length > 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
            All root rows loaded.
          </div>
        )}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
        Total visible rows: <strong>{rows.length}</strong> | 
        Sorted by: <strong>{sorting.map(s => `${s.id} ${s.desc ? 'DESC' : 'ASC'}`).join(', ') || 'None'}</strong> |
        Grouped by: <strong>{columnGrouping.join(', ') || 'None'}</strong>
      </div>
    </div>
  );
}
