'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { GridColumnVisibilityModel, GridColDef } from '@mui/x-data-grid';

interface TableState {
  columnVisibility: GridColumnVisibilityModel;
  columnOrder: string[];
  columnWidths: Record<string, number>;
}

export function useTableState(storageKey: string) {
  const [state, setState] = useState<TableState>({
    columnVisibility: {},
    columnOrder: [],
    columnWidths: {},
  });

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setState(JSON.parse(stored));
      }
    } catch {
      // Ignore parsing errors
    }
  }, [storageKey]);

  // Save state to localStorage
  const saveState = useCallback((updates: Partial<TableState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      try {
        localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch {
        // Ignore storage errors
      }
      return newState;
    });
  }, [storageKey]);

  const handleColumnVisibilityChange = useCallback(
    (model: GridColumnVisibilityModel) => {
      saveState({ columnVisibility: model });
    },
    [saveState]
  );

  const handleColumnOrderChange = useCallback(
    (params: any) => {
      const order = params?.model || [];
      saveState({ columnOrder: order });
    },
    [saveState]
  );

  const resetTableLayout = useCallback(() => {
    setState({ columnVisibility: {}, columnOrder: [], columnWidths: {} });
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  // Apply persisted widths to column definitions
  const applyColumnWidths = useCallback((columns: GridColDef[]) => {
    return columns.map(col => {
      const persistedWidth = state.columnWidths[col.field];
      return persistedWidth ? { ...col, width: persistedWidth } : col;
    });
  }, [state.columnWidths]);

  // Apply persisted column order to column definitions
  const applyColumnOrder = useCallback((columns: GridColDef[]) => {
    if (!state.columnOrder || state.columnOrder.length === 0) {
      return columns;
    }
    const ordered: GridColDef[] = [];
    const fieldToCol = new Map(columns.map(col => [col.field, col]));

    // First add columns in the stored order
    for (const field of state.columnOrder) {
      const col = fieldToCol.get(field);
      if (col) {
        ordered.push(col);
        fieldToCol.delete(field);
      }
    }

    // Then append any columns not in the stored order (new columns)
    for (const col of fieldToCol.values()) {
      ordered.push(col);
    }

    return ordered;
  }, [state.columnOrder]);

  // Helper to handle column width changes from DataGrid
  const handleColumnWidthChange = useCallback(
    (field: string, width: number) => {
      setState(prev => {
        const newWidths = { ...prev.columnWidths };
        newWidths[field] = width;
        const newState = { ...prev, columnWidths: newWidths };
        try {
          localStorage.setItem(storageKey, JSON.stringify(newState));
        } catch {
          // Ignore storage errors
        }
        return newState;
      });
    },
    [storageKey]
  );

  return {
    columnVisibility: state.columnVisibility,
    columnOrder: state.columnOrder,
    columnWidths: state.columnWidths,
    handleColumnVisibilityChange,
    handleColumnOrderChange,
    handleColumnWidthChange,
    resetTableLayout,
    applyColumnWidths,
    applyColumnOrder,
  };
}
