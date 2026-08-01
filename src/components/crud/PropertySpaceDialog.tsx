'use client';
import { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField,
} from '@mui/material';
import { PropertySpace, SpaceCategory, SPACE_CATEGORY_LABELS } from '@/services/api';

const CATEGORIES = Object.entries(SPACE_CATEGORY_LABELS) as [SpaceCategory, string][];

interface Props {
  open: boolean;
  initial?: PropertySpace | null;
  propertyId: string;
  onClose: () => void;
  onSave: (data: { category: string; name: string }, id?: string) => Promise<void>;
}

export default function PropertySpaceDialog({ open, initial, propertyId: _propertyId, onClose, onSave }: Props) {
  const [category, setCategory] = useState<string>('kitchen');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCategory(initial?.category ?? 'kitchen');
    setName(initial?.name ?? '');
  }, [initial, open]);

  const handleSave = async () => {
    if (!name.trim() || !category) return;
    setSaving(true);
    try {
      await onSave({ category, name: name.trim() }, initial?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? 'Edit Space' : 'New Space'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Category" value={category}
              onChange={e => setCategory(e.target.value)}
              fullWidth size="small"
            >
              {CATEGORIES.map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Name" value={name}
              onChange={e => setName(e.target.value)}
              fullWidth required size="small"
              placeholder="e.g. Main Kitchen, Upstairs Bathroom"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave} variant="contained"
          disabled={saving || !name.trim() || !category}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
