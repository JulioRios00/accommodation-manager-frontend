'use client';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField } from '@mui/material';
import { RentPayment } from '@/services/api';

type FormState = Omit<RentPayment, 'id'>;
const empty: FormState = { residentId: '', bookingId: '', propertyId: '', month: '', paymentDueDay: null, rentAmount: 0, amountPaid: 0, lateStatus: 'on_time', notes: null };

interface Props { open: boolean; initial?: RentPayment | null; onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>; }

export default function RentPaymentDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);
  const set = (f: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [f]: v === '' ? null : v }));
  const handleSave = async () => { setSaving(true); try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); } };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Rent Payment' : 'New Rent Payment'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}><TextField label="Resident ID" value={form.residentId} onChange={e => set('residentId', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Booking ID" value={form.bookingId} onChange={e => set('bookingId', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Property ID" value={form.propertyId} onChange={e => set('propertyId', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Month (YYYY-MM)" value={form.month} onChange={e => set('month', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Rent Amount (€)" type="number" value={form.rentAmount} onChange={e => set('rentAmount', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Amount Paid (€)" type="number" value={form.amountPaid} onChange={e => set('amountPaid', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Due Day" type="number" value={form.paymentDueDay ?? ''} onChange={e => set('paymentDueDay', e.target.value ? +e.target.value : null)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Late Status" value={form.lateStatus} onChange={e => set('lateStatus', e.target.value)} fullWidth size="small">
              {['on_time', 'demand_d1', 'final_demand_d4', 'overdue'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
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
