'use client';
import { useEffect, useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, MenuItem, TextField,
} from '@mui/material';
import { Property } from '@/services/api';

type FormState = Omit<Property, 'id'>;

const empty: FormState = {
  code: '', bu: '', area: '', fullAddress: '',
  officeKeys: false, keysCount: 0, securityKeysCount: 0, fobCount: 0,
  electricityStatus: '', gasStatus: '',
};

interface Props {
  open: boolean;
  initial?: Property | null;
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function PropertyDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? { ...initial } : { ...empty });
  }, [initial, open]);

  const set = (field: keyof FormState, value: unknown) =>
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
      <DialogTitle>{initial ? 'Edit Property' : 'New Property'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 6 }}>
            <TextField label="Code" value={form.code} onChange={e => set('code', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="BU" value={form.bu} onChange={e => set('bu', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Area" value={form.area ?? ''} onChange={e => set('area', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Full Address" value={form.fullAddress ?? ''} onChange={e => set('fullAddress', e.target.value)} fullWidth size="small" multiline rows={2} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Keys" type="number" value={form.keysCount} onChange={e => set('keysCount', +e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Sec. Keys" type="number" value={form.securityKeysCount} onChange={e => set('securityKeysCount', +e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Fobs" type="number" value={form.fobCount} onChange={e => set('fobCount', +e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Electricity" value={form.electricityStatus ?? ''} onChange={e => set('electricityStatus', e.target.value)} fullWidth size="small">
              {['', 'Pre', 'Active', 'Inactive'].map(v => <MenuItem key={v} value={v}>{v || '—'}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Gas" value={form.gasStatus ?? ''} onChange={e => set('gasStatus', e.target.value)} fullWidth size="small">
              {['', 'Pre', 'Active', 'Inactive'].map(v => <MenuItem key={v} value={v}>{v || '—'}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Checkbox checked={form.officeKeys} onChange={e => set('officeKeys', e.target.checked)} />}
              label="Office holds keys"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.code || !form.bu}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
