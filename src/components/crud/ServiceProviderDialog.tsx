'use client';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField } from '@mui/material';
import { ServiceProvider } from '@/services/api';

type FormState = Omit<ServiceProvider, 'id' | 'active'>;
const empty: FormState = { name: '', contactName: '', phone: '', email: '', specialty: '', notes: '' };
const specialties = ['', 'plumbing', 'electrical', 'cleaning', 'general', 'other'];

interface Props {
  open: boolean; initial?: ServiceProvider | null;
  onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function ServiceProviderDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);
  const set = (field: keyof FormState, v: unknown) => setForm(f => ({ ...f, [field]: v === '' ? null : v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit' : 'New'} Service Provider</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField label="Company Name" value={form.name} onChange={e => set('name', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}><TextField label="Contact Person" value={form.contactName ?? ''} onChange={e => set('contactName', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Phone" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} fullWidth size="small" /></Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Specialty" value={form.specialty ?? ''} onChange={e => set('specialty', e.target.value)} fullWidth size="small">
              {specialties.map(s => <MenuItem key={s} value={s}>{s || '—'}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Notes" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} fullWidth size="small" multiline rows={3} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.name}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
