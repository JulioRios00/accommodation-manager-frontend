'use client';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField, Alert } from '@mui/material';
import { LandlordPayment, Property, Landlord, getProperties, getLandlords } from '@/services/api';

type FormState = Omit<LandlordPayment, 'id'>;
const empty: FormState = { propertyId: '', landlordId: '', month: '', amountDue: 0, amountPaid: 0, dateDue: null, datePaid: null, beneficiaryName: null, iban: null, bic: null, paymentReference: null, paymentMethod: null, status: 'pending', notes: null };

/** The API row also carries id/active/createdAt/updatedAt. Spreading it wholesale sent
 *  those straight back on the PUT, where TypeORM merged them onto the record — so the
 *  form is seeded field by field instead. */
const fromRow = (row: LandlordPayment): FormState => ({
  propertyId: row.propertyId ?? '',
  landlordId: row.landlordId ?? '',
  month: normaliseMonth(row.month),
  amountDue: row.amountDue ?? 0,
  amountPaid: row.amountPaid ?? 0,
  dateDue: normaliseDate(row.dateDue),
  datePaid: normaliseDate(row.datePaid),
  beneficiaryName: row.beneficiaryName ?? null,
  iban: row.iban ?? null,
  bic: row.bic ?? null,
  paymentReference: row.paymentReference ?? null,
  paymentMethod: row.paymentMethod ?? null,
  status: row.status ?? 'pending',
  notes: row.notes ?? null,
});

/** `month` is varchar(7) server-side, so anything longer is rejected outright. Trim a
 *  pasted 'YYYY-MM-DD' back to 'YYYY-MM' rather than letting it fail at the DB. */
function normaliseMonth(v: string | null | undefined): string {
  return (v ?? '').trim().slice(0, 7);
}

/** `<input type="date">` only renders date-only values, and these are date columns, so
 *  drop any time component the API returned. */
function normaliseDate(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  return s === '' ? null : s.slice(0, 10);
}

/** Fields that must never be null — they're NOT NULL columns, and sending null wrote
 *  NULL rather than being ignored. */
const REQUIRED_FIELDS: (keyof FormState)[] = ['propertyId', 'month', 'amountDue'];

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

interface Props { open: boolean; initial?: LandlordPayment | null; onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>; }

export default function LandlordPaymentDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);

  useEffect(() => { setForm(initial ? fromRow(initial) : { ...empty }); setError(null); }, [initial, open]);
  useEffect(() => {
    if (!open) return;
    getProperties().then(setProperties).catch(() => {});
    getLandlords().then(setLandlords).catch(() => {});
  }, [open]);

  // Blanking a nullable field clears it; blanking a NOT NULL one stays an empty string so
  // the Save guard below catches it here instead of the server rejecting a NULL.
  const set = (f: keyof FormState, v: unknown) =>
    setForm(prev => ({ ...prev, [f]: v === '' && !REQUIRED_FIELDS.includes(f) ? null : v }));
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

  const selectedProperty = properties.find(p => p.id === form.propertyId);
  // Mirrors the server's contract: propertyId, a well-formed month and amountDue are
  // NOT NULL columns, so block the save here rather than get a generic 400 back.
  const canSave = !!form.propertyId && !!form.landlordId && MONTH_RE.test(form.month)
    && form.amountDue !== null && form.amountDue !== undefined && !Number.isNaN(Number(form.amountDue));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Landlord Payment' : 'New Landlord Payment'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Month (YYYY-MM)" value={form.month}
              onChange={e => set('month', normaliseMonth(e.target.value))}
              error={form.month !== '' && !MONTH_RE.test(form.month)}
              helperText={form.month !== '' && !MONTH_RE.test(form.month) ? 'Use YYYY-MM, e.g. 2026-09' : ' '}
              fullWidth required size="small"
            />
          </Grid>
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
          <Grid size={{ xs: 4 }}><TextField label="Date Due" type="date" value={form.dateDue ?? ''} onChange={e => set('dateDue', normaliseDate(e.target.value) ?? '')} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 4 }}><TextField label="Date Paid" type="date" value={form.datePaid ?? ''} onChange={e => set('datePaid', normaliseDate(e.target.value) ?? '')} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
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
        <Button onClick={handleSave} variant="contained" disabled={saving || !canSave}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
