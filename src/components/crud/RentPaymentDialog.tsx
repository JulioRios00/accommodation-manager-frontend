'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField } from '@mui/material';
import { RentPayment, Property, Resident, Booking, Bed, getProperties, getResidents, getBookings, getBeds } from '@/services/api';

type FormState = Omit<RentPayment, 'id'>;
const empty: FormState = { residentId: '', bookingId: '', propertyId: '', month: '', paymentDueDay: null, rentAmount: 0, amountPaid: 0, lateStatus: 'on_time', paymentStatus: 'unpaid', datePaid: null, notes: null };

interface Props { open: boolean; initial?: RentPayment | null; onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>; }

export default function RentPaymentDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);

  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);
  useEffect(() => {
    if (!open) return;
    getProperties().then(setProperties).catch(() => {});
    getResidents().then(setResidents).catch(() => {});
    getBeds().then(setBeds).catch(() => {});
    Promise.all([getBookings('active'), getBookings('upcoming')])
      .then(([a, u]) => setBookings([...a, ...u]))
      .catch(() => {});
  }, [open]);

  // beds belonging to the selected property
  const propertyBedIds = useMemo(
    () => new Set(beds.filter(b => b.propertyId === form.propertyId).map(b => b.id)),
    [beds, form.propertyId],
  );

  // bookings whose bed is in this property
  const propertyBookings = useMemo(
    () => bookings.filter(b => propertyBedIds.has(b.bedId)),
    [bookings, propertyBedIds],
  );

  // residents who have a booking in this property
  const propertyResidentIds = useMemo(
    () => new Set(propertyBookings.map(b => b.residentId)),
    [propertyBookings],
  );
  const propertyResidents = useMemo(
    () => residents.filter(r => propertyResidentIds.has(r.id)),
    [residents, propertyResidentIds],
  );

  // bookings for the selected resident in this property
  const residentBookings = useMemo(
    () => propertyBookings.filter(b => b.residentId === form.residentId),
    [propertyBookings, form.residentId],
  );

  const set = (f: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [f]: v === '' ? null : v }));

  const handlePropertyChange = (propertyId: string) => {
    setForm(prev => ({ ...prev, propertyId, residentId: '', bookingId: '', rentAmount: 0 }));
  };

  const handleResidentChange = (residentId: string) => {
    const booking = propertyBookings.find(b => b.residentId === residentId);
    setForm(prev => ({
      ...prev,
      residentId,
      bookingId: booking?.id ?? '',
      rentAmount: booking?.rentAmount ?? prev.rentAmount,
      paymentDueDay: prev.paymentDueDay,
    }));
  };

  const handleSave = async () => { setSaving(true); try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); } };

  const bookingLabel = (b: Booking) => {
    const bed = beds.find(bd => bd.id === b.bedId);
    return bed ? `Bed ${bed.propertyCode ?? ''}-${bed.bedNumber}` : b.bedId.slice(0, 8);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Rent Payment' : 'New Rent Payment'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Property *" value={form.propertyId} onChange={e => handlePropertyChange(e.target.value)} fullWidth size="small">
              {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.code}{p.fullAddress ? ` — ${p.fullAddress}` : ''}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Resident *" value={form.residentId}
              onChange={e => handleResidentChange(e.target.value)}
              fullWidth size="small"
              disabled={!form.propertyId}
              helperText={form.propertyId && propertyResidents.length === 0 ? 'No active residents in this property' : ''}
            >
              {propertyResidents.map(r => <MenuItem key={r.id} value={r.id}>{r.fullName}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Booking *" value={form.bookingId}
              onChange={e => set('bookingId', e.target.value)}
              fullWidth size="small"
              disabled={!form.residentId}
            >
              {residentBookings.map(b => <MenuItem key={b.id} value={b.id}>{bookingLabel(b)}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}><TextField label="Month (YYYY-MM) *" value={form.month} onChange={e => set('month', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Due Day" type="number" value={form.paymentDueDay ?? ''} onChange={e => set('paymentDueDay', e.target.value ? +e.target.value : null)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Rent Amount (€)" type="number" value={form.rentAmount} onChange={e => set('rentAmount', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Amount Paid (€)" type="number" value={form.amountPaid} onChange={e => set('amountPaid', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Late Status" value={form.lateStatus} onChange={e => set('lateStatus', e.target.value)} fullWidth size="small">
              {['on_time', 'demand_d1', 'final_demand_d4', 'overdue'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Payment Status" value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)} fullWidth size="small">
              {['unpaid', 'partially_paid', 'paid'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}><TextField label="Date Paid" type="date" value={form.datePaid ?? ''} onChange={e => set('datePaid', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 12 }}><TextField label="Notes" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} fullWidth size="small" multiline rows={2} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.residentId || !form.month}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
