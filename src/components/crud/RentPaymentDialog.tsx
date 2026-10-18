'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField, Autocomplete, Alert } from '@mui/material';
import { RentPayment, Property, Resident, Booking, Bed, getProperties, getResidents, getBookings, getBeds } from '@/services/api';
import { bedCode } from '@/lib/bedCode';

/** Mirrors derivePaymentStatus in the backend domain
 *  (backend/src/domain/rent-payment/rent-payment.entity.ts) — the single source of truth
 *  for what paid / partially paid / unpaid mean. Keep the two in step.
 *  Note it covers the two cases beyond "equal" and "below": nothing paid is unpaid rather
 *  than partially paid, and an overpayment still counts as paid. */
function derivePaymentStatus(amountPaid: number, rentAmount: number): string {
  if (amountPaid <= 0) return 'unpaid';
  if (amountPaid < rentAmount) return 'partially_paid';
  return 'paid';
}

type FormState = Omit<RentPayment, 'id'>;
const empty: FormState = { residentId: '', bookingId: '', propertyId: '', month: '', paymentDueDay: null, rentAmount: 0, amountPaid: 0, lateStatus: 'on_time', paymentStatus: 'unpaid', datePaid: null, notes: null };

interface Props { open: boolean; initial?: RentPayment | null; onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>; }

export default function RentPaymentDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [residentSearch, setResidentSearch] = useState('');

  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); setError(null); }, [initial, open]);
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

  // filter and sort property residents by search
  const filteredPropertyResidents = useMemo(() => {
    const q = residentSearch.toLowerCase();
    return propertyResidents
      .filter(r => r.fullName?.toLowerCase().includes(q))
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }, [propertyResidents, residentSearch]);

  // bookings for the selected resident in this property
  const residentBookings = useMemo(
    () => propertyBookings.filter(b => b.residentId === form.residentId),
    [propertyBookings, form.residentId],
  );

  const set = (f: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [f]: v === '' ? null : v }));

  // Date Paid is the trigger: an amount on its own doesn't mean the money arrived, so the
  // status is only derived once a payment date is recorded. Applied in the change handlers
  // rather than an effect, so a status picked by hand survives until the amounts change again.
  const applyDerivedStatus = (next: FormState): FormState =>
    next.datePaid
      ? { ...next, paymentStatus: derivePaymentStatus(Number(next.amountPaid) || 0, Number(next.rentAmount) || 0) }
      : next;

  const setAndDerive = (f: 'amountPaid' | 'rentAmount' | 'datePaid', v: unknown) =>
    setForm(prev => applyDerivedStatus({ ...prev, [f]: v === '' ? null : v } as FormState));

  const statusIsDerived =
    !!form.datePaid &&
    form.paymentStatus === derivePaymentStatus(Number(form.amountPaid) || 0, Number(form.rentAmount) || 0);


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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(form, initial?.id);
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to save payment';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const bookingLabel = (b: Booking) => {
    const bed = beds.find(bd => bd.id === b.bedId);
    return bed ? `Bed ${bedCode(bed)}` : b.bedId.slice(0, 8);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Rent Payment' : 'New Rent Payment'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Property *" value={form.propertyId} onChange={e => handlePropertyChange(e.target.value)} fullWidth size="small">
              {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.code}{p.fullAddress ? ` — ${p.fullAddress}` : ''}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Autocomplete
              options={filteredPropertyResidents}
              getOptionLabel={(r) => r.fullName || ''}
              value={propertyResidents.find(r => r.id === form.residentId) || null}
              onChange={(_, resident) => resident && handleResidentChange(resident.id)}
              inputValue={residentSearch}
              onInputChange={(_, value) => setResidentSearch(value)}
              fullWidth
              size="small"
              disabled={!form.propertyId}
              renderInput={(params) => <TextField {...params} label="Resident *" helperText={form.propertyId && propertyResidents.length === 0 ? 'No active residents in this property' : ''} />}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
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
          <Grid size={{ xs: 4 }}><TextField label="Rent Amount (€)" type="number" value={form.rentAmount} onChange={e => setAndDerive('rentAmount', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Amount Paid (€)" type="number" value={form.amountPaid} onChange={e => setAndDerive('amountPaid', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Late Status" value={form.lateStatus} onChange={e => set('lateStatus', e.target.value)} fullWidth size="small">
              {['on_time', 'demand_d1', 'final_demand_d4', 'overdue'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              select label="Payment Status" value={form.paymentStatus}
              onChange={e => set('paymentStatus', e.target.value)}
              fullWidth size="small"
              helperText={statusIsDerived ? 'Set from Amount Paid — override if needed' : ' '}
            >
              {['unpaid', 'partially_paid', 'paid'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}><TextField label="Date Paid" type="date" value={form.datePaid ?? ''} onChange={e => setAndDerive('datePaid', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
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
