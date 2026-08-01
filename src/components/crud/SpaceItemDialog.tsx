'use client';
import { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField,
} from '@mui/material';
import { SpaceItem } from '@/services/api';

const CONDITIONS = ['Good', 'Fair', 'Poor', 'Missing'];

interface Props {
  open: boolean;
  initial?: SpaceItem | null;
  spaceId: string;
  onClose: () => void;
  onSave: (data: Omit<SpaceItem, 'id' | 'spaceId'>, id?: string) => Promise<void>;
}

export default function SpaceItemDialog({ open, initial, spaceId: _spaceId, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? '');
    setQuantity(initial?.quantity ?? 1);
    setCondition(initial?.condition ?? '');
    setNotes(initial?.notes ?? '');
  }, [initial, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        quantity,
        condition: condition || null,
        notes: notes.trim() || null,
      }, initial?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? 'Edit Item' : 'Add Item'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 8 }}>
            <TextField
              label="Item Name" value={name}
              onChange={e => setName(e.target.value)}
              fullWidth required size="small"
              placeholder="e.g. Oven, Kettle, Cabinet"
              autoFocus
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="Qty" type="number" value={quantity}
              onChange={e => setQuantity(Math.max(1, +e.target.value))}
              fullWidth size="small"
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Condition" value={condition}
              onChange={e => setCondition(e.target.value)}
              fullWidth size="small"
            >
              <MenuItem value=""><em>Not assessed</em></MenuItem>
              {CONDITIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Notes" value={notes}
              onChange={e => setNotes(e.target.value)}
              fullWidth size="small" multiline rows={2}
              placeholder="Optional notes about this item"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave} variant="contained"
          disabled={saving || !name.trim()}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
