// src/components/SortableTable.jsx — a tiny sort hook + clickable header cell.
// Keeps existing table markup; just wrap rows with useSort and swap <th> for <SortTh>.
import { useState, useMemo } from 'react';

export function useSort(rows, initialKey = null, initialDir = 'asc') {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      let av = a[sort.key];
      let bv = b[sort.key];
      // Nulls/undefined always sort last.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort]);

  const toggle = (key) => setSort((s) => (
    s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
  ));

  return { sorted, sort, toggle };
}

export function SortTh({ label, sortKey, sort, toggle, style, children }) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`sortable${active ? ' active' : ''}`}
      style={style}
      onClick={() => toggle(sortKey)}
      title="Click to sort"
    >
      <span className="sort-th-inner">
        {children || label}
        <span className="sort-arrow">{active ? (sort.dir === 'asc' ? '▲' : '▼') : '⇵'}</span>
      </span>
    </th>
  );
}
