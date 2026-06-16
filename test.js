import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

// --- 1. Mock Data Generator (Replace with your API call) ---
const generateData = (count, depth = 0, startIndex = 0) => {
  return Array.from({ length: count }).map((_, i) => {
    const id = startIndex + i;
    const hasSubRows = depth < 2 && Math.random() > 0.5; // Limit depth to 2 for demo
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

// --- 2. Column Definitions ---
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
  },
  {
    accessorKey: 'firstName',
    header: 'First Name',
    cell: (info) => <span style={{ paddingLeft: `${info.row.depth * 1.5}rem` }}>{info.getValue()}</span>,
  },
  {
    accessorKey: 'lastName',
    header: 'Last Name',
  },
  {
    accessorKey: 'age',
    header: 'Age',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'visits',
    header: 'Visits',
  },
];

// --- 3. Main Component ---
export default function InfiniteScrollTable() {
  const [data, setData] = useState(() => generateData(20)); // Initial 20 rows
  const [expanded, setExpanded] = useState({});
  const [sorting, setSorting] = useState([]); // Array for multi-column sorting
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const parentRef = useRef(null);

  // --- Infinite Scroll Fetch Logic ---
  const fetchMoreData = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newData = generateData(20, 0, page * 20);
    
    if (newData.length === 0) {
      setHasMore(false);
    } else {
      setData((prev) => [...prev, ...newData]);
      setPage((prev) => prev + 1);
    }
    setIsLoading(false);
  };

  // --- Table Setup ---
  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
      sorting,
    },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(), // Enables multi-column sorting
    debugTable: false,
  });

  const { rows } = table.getRowModel();

  // --- Virtualizer Setup ---
  // count is the total number of flattened rows (including expanded subrows)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45, // Estimated row height in px
    overscan: 5, // Number of rows to render outside the viewport
  });

  // --- Infinite Scroll Trigger ---
  useEffect(() => {
    if (isLoading || !hasMore) return;

    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];

    // Trigger fetch when we are within 5 items of the end of the current dataset
    if (lastItem && lastItem.index >= rows.length - 5) {
      fetchMoreData();
    }
  }, [rowVirtualizer.getVirtualItems(), rows.length, isLoading, hasMore]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>TanStack Table: Infinite Scroll + Subrows + Multi-Column Sort</h2>
      
      {/* Scrollable Container */}
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
          {/* Sticky Header */}
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
                      {/* Multi-column sort indicator */}
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

          {/* Virtualized Body */}
          <tbody
            style={{
              display: 'block',
              height: `${rowVirtualizer.getTotalSize()}px`, // Tells scrollbar the total height
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement} // Enables dynamic row height measurement
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    transform: `translateY(${virtualRow.start}px)`, // Moves row to correct scroll position
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

        {/* Loading Indicator at the bottom */}
        {isLoading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Loading more data...
          </div>
        )}
        {!hasMore && !isLoading && rows.length > 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
            No more data to load.
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
        Total rows (including expanded subrows): <strong>{rows.length}</strong> | 
        Active sorts: <strong>{sorting.map(s => `${s.id} ${s.desc ? 'DESC' : 'ASC'}`).join(', ') || 'None'}</strong>
      </div>
    </div>
  );
}
