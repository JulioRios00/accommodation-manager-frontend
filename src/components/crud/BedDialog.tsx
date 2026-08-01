'use client';
import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import { Bed, Bedroom, Property } from '@/services/api';

type FormState = Omit<Bed, 'id' | 'propertyCode' | 'activeBooking'>;

const empty: FormState = {
  propertyId: '', bedNumber: 1, bedroomId: null, bedroomName: null, name: null,
  position: null, status: 'vacant', bedroomType: '', sex: '', bedSize: '',
  depositAmount: 0, rentAmount: 0,
};

interface Props {
  open: boolean;
  initial?: Bed | null;
  properties: Property[];
  bedrooms: Bedroom[];
  defaultValues?: { propertyId?: string; bedroomId?: string };
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function BedDialog({ open, initial, properties, bedrooms, defaultValues, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        propertyId: initial.propertyId,
        bedNumber: initial.bedNumber,
        bedroomId: initial.bedroomId,
        bedroomName: null,
        name: initial.name,
        position: initial.position,
        status: initial.status,
        bedroomType: initial.bedroomType,
        sex: initial.sex,
        bedSize: initial.bedSize,
        depositAmount: initial.depositAmount,
        rentAmount: initial.rentAmount,
      });
    } else {
      setForm({
        ...empty,
        propertyId: defaultValues?.propertyId ?? '',
        bedroomId: defaultValues?.bedroomId ?? null,
      });
    }
  }, [initial, open, defaultValues]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  const filteredBedrooms = bedrooms.filter(b => b.propertyId === form.propertyId);

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
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{initial ? 'Edit Bed' : 'New Bed'}</span>
          {initial && (
            <Chip
              label={initial.status === 'allocated' ? 'Allocated' : 'Vacant'}
              size="small"
              sx={{
                bgcolor: initial.status === 'allocated' ? '#DE9151' : '#4caf50',
                color: 'white',
                fontWeight: 600,
              }}
            />
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 8 }}>
            <TextField
              select label="Property" value={form.propertyId}
              onChange={e => { set('propertyId', e.target.value); set('bedroomId', null); }}
              fullWidth required size="small"
            >
              {properties.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.code} — {p.fullAddress ?? p.area}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="Bed #" type="number" value={form.bedNumber}
              onChange={e => set('bedNumber', +e.target.value)}
              fullWidth required size="small"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Bedroom" value={form.bedroomId ?? ''}
              onChange={e => set('bedroomId', e.target.value || null)}
              fullWidth size="small"
              disabled={!form.propertyId}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {filteredBedrooms.map(b => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 8 }}>
            <TextField
              label="Location / Layout Name" value={form.name ?? ''}
              onChange={e => set('name', e.target.value || null)}
              fullWidth size="small"
              placeholder="e.g. Bed A, Lower Bunk"
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="Position" type="number" value={form.position ?? ''}
              onChange={e => set('position', e.target.value ? +e.target.value : null)}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Room Type" value={form.bedroomType}
              onChange={e => set('bedroomType', e.target.value)}
              fullWidth required size="small"
            >
              {['Single', 'Twin', 'Triple', 'Twin Studio', 'Studio'].map(v => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Sex" value={form.sex}
              onChange={e => set('sex', e.target.value)}
              fullWidth required size="small"
            >
              {['M', 'F', 'Mixed'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Bed Size" value={form.bedSize}
              onChange={e => set('bedSize', e.target.value)}
              fullWidth required size="small"
            >
              {['Single', 'Double'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Rent (€)" type="number" value={form.rentAmount}
              onChange={e => set('rentAmount', +e.target.value)}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Deposit (€)" type="number" value={form.depositAmount}
              onChange={e => set('depositAmount', +e.target.value)}
              fullWidth size="small"
            />
          </Grid>
          {initial && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">
                Status is managed automatically (vacant ↔ allocated via bookings).
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave} variant="contained"
          disabled={saving || !form.propertyId || !form.bedroomType || !form.sex || !form.bedSize}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
