'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, MenuItem, TextField,
} from '@mui/material';
import { Booking, Bed, Resident, Property } from '@/services/api';

type FormState = {
  bedId: string;
  residentId: string;
  propertyId: string;
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
  bedId: '', residentId: '', propertyId: '', checkInDate: '', contractEndDate: '', checkOutDate: '',
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
  /** Renders every field disabled and hides Save — used when the role may view but not edit. */
  readOnly?: boolean;
  beds: Bed[];
  residents: Resident[];
  properties?: Property[];
  onClose: () => void;
  onSave: (data: Omit<FormState, 'propertyId'>, id?: string) => Promise<void>;
}

export default function BookingDialog({ open, initial, readOnly = false, beds, residents, properties = [], onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      const bed = beds.find(b => b.id === initial.bedId);
      setForm({
        bedId: initial.bedId,
        residentId: initial.residentId,
        propertyId: bed?.propertyId ?? '',
        checkInDate: toDateInput(initial.checkInDate),
        contractEndDate: toDateInput(initial.contractEndDate),
        checkOutDate: toDateInput(initial.checkOutDate),
        depositAmount: initial.depositAmount,
        rentAmount: initial.rentAmount,
        isHeadResident: initial.isHeadResident,
        isTemporary: initial.isTemporary,
        status: initial.status,
        comments: initial.comments ?? '',
      });
    } else {
      setForm({ ...empty });
    }
  }, [initial, open, beds]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  // Reset bed when property changes
  const handlePropertyChange = (propertyId: string) => {
    setForm(f => ({ ...f, propertyId, bedId: '' }));
  };

  // Beds filtered to selected property
  const propertyBeds = useMemo(
    () => form.propertyId ? beds.filter(b => b.propertyId === form.propertyId) : beds,
    [beds, form.propertyId],
  );

  // Available beds: vacant, OR the current bed when editing, OR bed where current resident's
  // contractEndDate <= check-in date (same-day checkin after checkout is allowed)
  const availableBeds = useMemo(() => {
    return propertyBeds.filter(b => {
      if (initial && b.id === initial.bedId) return true;
      if (b.status === 'vacant') return true;
      if (form.checkInDate && b.activeBooking?.contractEndDate) {
        // Allow check-in on or after the current resident's contract end date
        return new Date(b.activeBooking.contractEndDate) <= new Date(form.checkInDate);
      }
      return false;
    });
  }, [propertyBeds, form.checkInDate, initial]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { propertyId: _pid, ...rest } = form;
      await onSave({
        ...rest,
        checkInDate: rest.checkInDate || '',
        contractEndDate: rest.contractEndDate || '',
        checkOutDate: rest.checkOutDate || '',
      }, initial?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{!initial ? 'New Booking' : readOnly ? 'Booking Details' : 'Edit Booking'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Check-in date first — drives bed availability */}
          <Grid size={{ xs: 4 }}>
            <TextField label="Check-in *" type="date" value={form.checkInDate} onChange={e => { set('checkInDate', e.target.value); set('bedId', ''); }} fullWidth size="small" disabled={readOnly} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Contract End *" type="date" value={form.contractEndDate} onChange={e => set('contractEndDate', e.target.value)} fullWidth size="small" disabled={readOnly} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Check-out" type="date" value={form.checkOutDate} onChange={e => set('checkOutDate', e.target.value)} fullWidth size="small" disabled={readOnly} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>

          {/* Property filter (optional) */}
          {properties.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <TextField select label="Property" value={form.propertyId} onChange={e => handlePropertyChange(e.target.value)} fullWidth size="small" disabled={readOnly}>
                <MenuItem value=""><em>All properties</em></MenuItem>
                {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.code}{p.fullAddress ? ` — ${p.fullAddress}` : ''}</MenuItem>)}
              </TextField>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Bed *" value={form.bedId} onChange={e => set('bedId', e.target.value)}
              fullWidth required size="small" disabled={readOnly}
              helperText={!form.checkInDate ? 'Enter check-in date first to see available beds' : `${availableBeds.length} bed(s) available on ${form.checkInDate}`}
            >
              {availableBeds.map(b => (
                <MenuItem key={b.id} value={b.id}>
                  {b.propertyCode}-{b.bedNumber} ({b.bedroomType}){b.status === 'allocated' ? ' — frees on check-in' : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField select label="Resident *" value={form.residentId} onChange={e => set('residentId', e.target.value)} fullWidth required size="small" disabled={readOnly}>
              {residents.map(r => (
                <MenuItem key={r.id} value={r.id}>{r.fullName} {r.email ? `— ${r.email}` : ''}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Status" value={form.status} onChange={e => set('status', e.target.value)} fullWidth required size="small" disabled={readOnly}>
              {(['active', 'upcoming', 'completed'] as const).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Rent (€)" type="number" value={form.rentAmount} onChange={e => set('rentAmount', +e.target.value)} fullWidth size="small" disabled={readOnly} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Deposit (€)" type="number" value={form.depositAmount} onChange={e => set('depositAmount', +e.target.value)} fullWidth size="small" disabled={readOnly} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Comments" value={form.comments} onChange={e => set('comments', e.target.value)} fullWidth size="small" disabled={readOnly} multiline rows={2} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.isHeadResident} onChange={e => set('isHeadResident', e.target.checked)} disabled={readOnly} />}
              label="Head resident"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.isTemporary} onChange={e => set('isTemporary', e.target.checked)} disabled={readOnly} />}
              label="Temporary / upcoming"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
        {!readOnly && (
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.bedId || !form.residentId || !form.checkInDate || !form.contractEndDate}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
