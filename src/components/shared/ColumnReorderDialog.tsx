'use client';
import { useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Box, Typography } from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { GridColDef } from '@mui/x-data-grid';

interface ColumnReorderDialogProps {
  open: boolean;
  columns: GridColDef[];
  columnOrder: string[];
  onReorder: (order: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function ColumnReorderDialog({
  open,
  columns,
  columnOrder,
  onReorder,
  onReset,
  onClose,
}: ColumnReorderDialogProps) {
  const [localOrder, setLocalOrder] = useState<string[]>(columnOrder);
  const [dragging, setDragging] = useState<string | null>(null);

  const orderedColumns = useMemo(() => {
    if (localOrder.length === 0) return columns;
    const fieldToCol = new Map(columns.map(col => [col.field, col]));
    const ordered: GridColDef[] = [];

    for (const field of localOrder) {
      const col = fieldToCol.get(field);
      if (col) ordered.push(col);
    }

    for (const col of columns) {
      if (!localOrder.includes(col.field)) ordered.push(col);
    }

    return ordered;
  }, [columns, localOrder]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...localOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setLocalOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === localOrder.length - 1) return;
    const newOrder = [...localOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setLocalOrder(newOrder);
  };

  const handleDragStart = (field: string) => {
    setDragging(field);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetField: string) => {
    if (!dragging || dragging === targetField) return;

    const dragIndex = localOrder.indexOf(dragging);
    const targetIndex = localOrder.indexOf(targetField);

    const newOrder = [...localOrder];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIndex, 0, dragging);
    setLocalOrder(newOrder);
    setDragging(null);
  };

  const handleSave = () => {
    onReorder(localOrder);
    onClose();
  };

  const handleReset = () => {
    setLocalOrder([]);
    onReset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Reorder Columns
        <Button size="small" startIcon={<RestartAltIcon />} onClick={handleReset} color="warning">
          Reset
        </Button>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Typography variant="caption" sx={{ display: 'block', p: 2, pb: 1, color: 'text.secondary' }}>
          Drag columns to reorder, or use arrow buttons
        </Typography>
        <List sx={{ width: '100%' }}>
          {orderedColumns.map((col, idx) => (
            <ListItem
              key={col.field}
              disablePadding
              draggable
              onDragStart={() => handleDragStart(col.field)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.field)}
              sx={{
                opacity: dragging === col.field ? 0.5 : 1,
                backgroundColor: dragging === col.field ? 'action.hover' : 'inherit',
                borderTop: dragging === col.field ? '2px dashed' : 'none',
                borderColor: 'primary.main',
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <DragHandleIcon fontSize="small" color="disabled" />
              </ListItemIcon>
              <ListItemText primary={col.headerName || col.field} />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <KeyboardArrowUpIcon fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => moveDown(idx)}
                  disabled={idx === orderedColumns.length - 1}
                  title="Move down"
                >
                  <KeyboardArrowDownIcon fontSize="small" />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
