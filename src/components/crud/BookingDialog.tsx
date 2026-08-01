'use client';
import { useEffect, useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, MenuItem, TextField,
} from '@mui/material';
import { Booking, Bed, Resident } from '@/services/api';

type FormState = {
  bedId: string;
  residentId: string;
  checkInDate: string;
  contractEndDate: string;
  checkOutDate: string;
  depositAmount: number;
  rentAmount: number;
  isHeadResident: boolean;
  isTemporary: boolean;
  status: 'active' | 'upcoming' | 'completed';
  comments: string;
};

const empty: FormState = {
  bedId: '', residentId: '', checkInDate: '', contractEndDate: '', checkOutDate: '',
  depositAmount: 0, rentAmount: 0, isHeadResident: false, isTemporary: false,
  status: 'active', comments: '',
};

function toDateInput(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  initial?: Booking | null;
  beds: Bed[];
  residents: Resident[];
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function BookingDialog({ open, initial, beds, residents, onClose, onSave }: Props) {
  const availableBeds = initial
    ? beds.filter(b => b.status === 'vacant' || b.id === initial.bedId)
    : beds.filter(b => b.status === 'vacant');

  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? {
      bedId: initial.bedId,
      residentId: initial.residentId,
      checkInDate: toDateInput(initial.checkInDate),
      contractEndDate: toDateInput(initial.contractEndDate),
      checkOutDate: toDateInput(initial.checkOutDate),
      depositAmount: initial.depositAmount,
      rentAmount: initial.rentAmount,
      isHeadResident: initial.isHeadResident,
      isTemporary: initial.isTemporary,
      status: initial.status,
      comments: initial.comments ?? '',
    } : { ...empty });
  }, [initial, open]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        checkInDate: form.checkInDate || '',
        contractEndDate: form.contractEndDate || '',
        checkOutDate: form.checkOutDate || '',
      }, initial?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Booking' : 'New Booking'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField select label="Bed" value={form.bedId} onChange={e => set('bedId', e.target.value)} fullWidth required size="small">
              {availableBeds.map(b => (
                <MenuItem key={b.id} value={b.id}>
                  {b.propertyCode}-{b.bedNumber} ({b.bedroomType})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField select label="Resident" value={form.residentId} onChange={e => set('residentId', e.target.value)} fullWidth required size="small">
              {residents.map(r => (
                <MenuItem key={r.id} value={r.id}>{r.fullName} {r.email ? `— ${r.email}` : ''}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Status" value={form.status} onChange={e => set('status', e.target.value)} fullWidth required size="small">
              {(['active', 'upcoming', 'completed'] as const).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Rent (€)" type="number" value={form.rentAmount} onChange={e => set('rentAmount', +e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Deposit (€)" type="number" value={form.depositAmount} onChange={e => set('depositAmount', +e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Check-in" type="date" value={form.checkInDate} onChange={e => set('checkInDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Contract End" type="date" value={form.contractEndDate} onChange={e => set('contractEndDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Check-out" type="date" value={form.checkOutDate} onChange={e => set('checkOutDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Comments" value={form.comments} onChange={e => set('comments', e.target.value)} fullWidth size="small" multiline rows={2} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.isHeadResident} onChange={e => set('isHeadResident', e.target.checked)} />}
              label="Head resident"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.isTemporary} onChange={e => set('isTemporary', e.target.checked)} />}
              label="Temporary / upcoming"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.bedId || !form.residentId || !form.checkInDate || !form.contractEndDate}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
