'use client';
import { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField,
} from '@mui/material';
import { Resident } from '@/services/api';

type FormState = Omit<Resident, 'id'>;

const empty: FormState = {
  fullName: '', email: '', telephone: '', nationality: '',
  personalId: '', iban: '', emergencyContact: '', source: '',
};

interface Props {
  open: boolean;
  initial?: Resident | null;
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function ResidentDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? { ...initial } : { ...empty });
  }, [initial, open]);

  const set = (field: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [field]: value || null }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form, initial?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Resident' : 'New Resident'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField label="Full Name" value={form.fullName} onChange={e => set('fullName', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} fullWidth size="small" type="email" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Telephone" value={form.telephone ?? ''} onChange={e => set('telephone', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Nationality" value={form.nationality ?? ''} onChange={e => set('nationality', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Personal ID" value={form.personalId ?? ''} onChange={e => set('personalId', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="IBAN" value={form.iban ?? ''} onChange={e => set('iban', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Emergency Contact" value={form.emergencyContact ?? ''} onChange={e => set('emergencyContact', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Source" value={form.source ?? ''} onChange={e => set('source', e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.fullName}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
