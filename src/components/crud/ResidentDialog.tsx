'use client';
import { useEffect, useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Grid, TextField, Typography,
} from '@mui/material';
import { Resident } from '@/services/api';

type FormState = Omit<Resident, 'id'>;

const empty: FormState = {
  fullName: '', email: '', telephone: '', nationality: '',
  personalId: '', iban: '', emergencyContact: '', source: '',
  paymentDueDay: null, comments: '', delinquent: false,
  hasObservation: false, observation: '',
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

  const setNum = (field: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [field]: value ? Number(value) : null }));

  const setBool = (field: keyof FormState, value: boolean) =>
    setForm(f => ({ ...f, [field]: value }));

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
          {/* Personal info */}
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
          <Grid size={{ xs: 6 }}>
            <TextField label="Source" value={form.source ?? ''} onChange={e => set('source', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Payment Due Day"
              value={form.paymentDueDay ?? ''}
              onChange={e => setNum('paymentDueDay', e.target.value)}
              fullWidth size="small" type="number"
              slotProps={{ htmlInput: { min: 1, max: 31 } }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="caption" color="text.secondary">Notes & Flags</Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Comments"
              value={form.comments ?? ''}
              onChange={e => set('comments', e.target.value)}
              fullWidth size="small" multiline rows={2}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.delinquent} onChange={e => setBool('delinquent', e.target.checked)} size="small" />}
              label="Delinquent"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.hasObservation} onChange={e => setBool('hasObservation', e.target.checked)} size="small" />}
              label="Has Observation"
            />
          </Grid>
          {form.hasObservation && (
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Observation"
                value={form.observation ?? ''}
                onChange={e => set('observation', e.target.value)}
                fullWidth size="small" multiline rows={2}
              />
            </Grid>
          )}
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
