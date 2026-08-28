'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField } from '@mui/material';
import { DepositTransaction, Property, Resident, Bed, getProperties, getResidents, getBeds } from '@/services/api';
import { bedCode } from '@/lib/bedCode';

type FormState = Omit<DepositTransaction, 'id'>;
const empty: FormState = { type: 'receipt', residentId: '', bookingId: null, propertyId: '', bedId: null, residentName: '', checkoutDate: null, depositAmount: 0, proRataRentAmount: null, iban: null, payeeAddress: null, status: 'pending', dateProcessed: null, bankReference: null, company: null, comments: null };

interface Props { open: boolean; initial?: DepositTransaction | null; onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>; }

export default function DepositTransactionDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);

  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);
  useEffect(() => {
    if (!open) return;
    getProperties().then(setProperties).catch(() => {});
    getResidents().then(setResidents).catch(() => {});
    getBeds().then(setBeds).catch(() => {});
  }, [open]);

  const propertyBeds = useMemo(() => beds.filter(b => b.propertyId === form.propertyId), [beds, form.propertyId]);

  const set = (f: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [f]: v === '' ? null : v }));

  const selectResident = (id: string) => {
    const r = residents.find(r => r.id === id);
    setForm(prev => ({ ...prev, residentId: id, residentName: r?.fullName ?? prev.residentName }));
  };

  const handleSave = async () => { setSaving(true); try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); } };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Deposit Transaction' : 'New Deposit Transaction'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Type" value={form.type} onChange={e => set('type', e.target.value)} fullWidth size="small">
              {['receipt', 'refund'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 8 }}>
            <TextField select label="Resident" value={form.residentId} onChange={e => selectResident(e.target.value)} fullWidth required size="small">
              {residents.map(r => <MenuItem key={r.id} value={r.id}>{r.fullName}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Property" value={form.propertyId}
              onChange={e => setForm(prev => ({ ...prev, propertyId: e.target.value, bedId: null }))}
              fullWidth required size="small"
            >
              {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.code}{p.fullAddress ? ` — ${p.fullAddress}` : ''}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Bed Code" value={form.bedId ?? ''} onChange={e => set('bedId', e.target.value)}
              fullWidth size="small" disabled={!form.propertyId}
            >
              {propertyBeds.map(b => <MenuItem key={b.id} value={b.id}>{bedCode(b)}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}><TextField label="Resident Name" value={form.residentName} onChange={e => set('residentName', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Deposit Amount (€)" type="number" value={form.depositAmount} onChange={e => set('depositAmount', +e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Pro-rata Rent (€)" type="number" value={form.proRataRentAmount ?? ''} onChange={e => set('proRataRentAmount', e.target.value ? +e.target.value : null)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Status" value={form.status} onChange={e => set('status', e.target.value)} fullWidth size="small">
              {['pending', 'done'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}><TextField label="IBAN" value={form.iban ?? ''} onChange={e => set('iban', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Bank Reference" value={form.bankReference ?? ''} onChange={e => set('bankReference', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Checkout Date" type="date" value={form.checkoutDate ?? ''} onChange={e => set('checkoutDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Date Processed" type="date" value={form.dateProcessed ?? ''} onChange={e => set('dateProcessed', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 12 }}><TextField label="Comments" value={form.comments ?? ''} onChange={e => set('comments', e.target.value)} fullWidth size="small" multiline rows={2} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.residentId}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
