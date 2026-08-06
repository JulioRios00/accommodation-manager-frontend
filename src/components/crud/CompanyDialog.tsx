'use client';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from '@mui/material';
import { Company } from '@/services/api';

type FormState = Omit<Company, 'id' | 'active'>;
const empty: FormState = { name: '', bu: null, address: null, contactEmail: null, phone: null };

interface Props { open: boolean; initial?: Company | null; onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>; }

export default function CompanyDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);
  const set = (f: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [f]: v === '' ? null : v }));
  const handleSave = async () => { setSaving(true); try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); } };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Business Unit' : 'New Business Unit'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 3 }}>
            <TextField
              label="BU *"
              value={form.bu ?? ''}
              onChange={e => set('bu', e.target.value.toUpperCase())}
              fullWidth required size="small"
              slotProps={{ htmlInput: { maxLength: 20 } }}
              helperText="Acronym, e.g. SA"
            />
          </Grid>
          <Grid size={{ xs: 9 }}><TextField label="Company Name *" value={form.name} onChange={e => set('name', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Email" value={form.contactEmail ?? ''} onChange={e => set('contactEmail', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Phone" value={form.phone ?? ''} onChange={e => set('phone', e.target.value.replace(/[^\d\s+\-()]/g, ''))} fullWidth size="small" slotProps={{ htmlInput: { inputMode: 'tel' } }} /></Grid>
          <Grid size={{ xs: 12 }}><TextField label="Address" value={form.address ?? ''} onChange={e => set('address', e.target.value)} fullWidth size="small" multiline rows={2} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.name || !form.bu}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
