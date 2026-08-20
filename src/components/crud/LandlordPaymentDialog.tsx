'use client';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField } from '@mui/material';
import { LandlordPayment, Property, Landlord, getProperties, getLandlords } from '@/services/api';

type FormState = Omit<LandlordPayment, 'id'>;
const empty: FormState = { propertyId: '', landlordId: '', month: '', amountDue: 0, amountPaid: 0, dateDue: null, datePaid: null, beneficiaryName: null, iban: null, bic: null, paymentReference: null, paymentMethod: null, status: 'pending', notes: null };

interface Props { open: boolean; initial?: LandlordPayment | null; onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>; }

export default function LandlordPaymentDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);

  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);
  useEffect(() => {
    if (!open) return;
    getProperties().then(setProperties).catch(() => {});
    getLandlords().then(setLandlords).catch(() => {});
  }, [open]);

  const set = (f: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [f]: v === '' ? null : v }));
  const handleSave = async () => { setSaving(true); try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); } };

  const selectedProperty = properties.find(p => p.id === form.propertyId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Landlord Payment' : 'New Landlord Payment'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Property" value={form.propertyId} onChange={e => set('propertyId', e.target.value)} fullWidth required size="small">
              {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.code}{p.fullAddress ? ` — ${p.fullAddress}` : ''}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Landlord" value={form.landlordId} onChange={e => set('landlordId', e.target.value)} fullWidth required size="small">
              {landlords.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}><TextField label="Month (YYYY-MM)" value={form.month} onChange={e => set('month', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 3 }}><TextField label="Amount Due (€)" type="number" value={form.amountDue} onChange={e => set('amountDue', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 3 }}><TextField label="Amount Paid (€)" type="number" value={form.amountPaid} onChange={e => set('amountPaid', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Beneficiary" value={form.beneficiaryName ?? ''} onChange={e => set('beneficiaryName', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="IBAN" value={form.iban ?? ''} onChange={e => set('iban', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Payment Reference (from Property)" value={selectedProperty?.paymentReference ?? '—'}
              fullWidth size="small" slotProps={{ input: { readOnly: true } }}
            />
          </Grid>
          <Grid size={{ xs: 4 }}><TextField label="Date Due" type="date" value={form.dateDue ?? ''} onChange={e => set('dateDue', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Date Paid" type="date" value={form.datePaid ?? ''} onChange={e => set('datePaid', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Status" value={form.status} onChange={e => set('status', e.target.value)} fullWidth size="small">
              {['pending', 'paid', 'partial'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}><TextField label="Notes" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} fullWidth size="small" multiline rows={2} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.landlordId || !form.month}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
