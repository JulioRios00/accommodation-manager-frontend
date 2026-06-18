'use client';
import { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField,
} from '@mui/material';
import { Bed, Property } from '@/services/api';

type FormState = Omit<Bed, 'id' | 'propertyCode' | 'activeBooking'>;

const empty: FormState = {
  propertyId: '', bedNumber: 1, bedroomType: '', sex: '', bedSize: '', depositAmount: 0, rentAmount: 0,
};

interface Props {
  open: boolean;
  initial?: Bed | null;
  properties: Property[];
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function BedDialog({ open, initial, properties, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial
      ? { propertyId: initial.propertyId, bedNumber: initial.bedNumber, bedroomType: initial.bedroomType, sex: initial.sex, bedSize: initial.bedSize, depositAmount: initial.depositAmount, rentAmount: initial.rentAmount }
      : { ...empty }
    );
  }, [initial, open]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form, initial?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Bed' : 'New Bed'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 8 }}>
            <TextField select label="Property" value={form.propertyId} onChange={e => set('propertyId', e.target.value)} fullWidth required size="small">
              {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.code} — {p.fullAddress ?? p.area}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Bed #" type="number" value={form.bedNumber} onChange={e => set('bedNumber', +e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Room Type" value={form.bedroomType} onChange={e => set('bedroomType', e.target.value)} fullWidth required size="small">
              {['Single', 'Twin', 'Triple', 'Twin Studio', 'Studio'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Sex" value={form.sex} onChange={e => set('sex', e.target.value)} fullWidth required size="small">
              {['M', 'F', 'Mixed'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField select label="Bed Size" value={form.bedSize} onChange={e => set('bedSize', e.target.value)} fullWidth required size="small">
              {['Single', 'Double'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Rent (€)" type="number" value={form.rentAmount} onChange={e => set('rentAmount', +e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Deposit (€)" type="number" value={form.depositAmount} onChange={e => set('depositAmount', +e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.propertyId || !form.bedroomType}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
