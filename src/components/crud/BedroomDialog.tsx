'use client';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { Bedroom } from '@/services/api';

interface Props {
  open: boolean;
  initial?: Bedroom | null;
  propertyId: string;
  onClose: () => void;
  onSave: (name: string, id?: string) => Promise<void>;
}

export default function BedroomDialog({ open, initial, propertyId: _propertyId, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? '');
  }, [initial, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), initial?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? 'Edit Bedroom' : 'New Bedroom'}</DialogTitle>
      <DialogContent>
        <TextField
          label="Bedroom Name"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          required
          size="small"
          sx={{ mt: 1 }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
