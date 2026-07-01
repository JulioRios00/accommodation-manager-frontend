'use client';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField } from '@mui/material';
import { KeyLog } from '@/services/api';

type FormState = Omit<KeyLog, 'id'>;
const empty: FormState = {
  propertyId: '', bedId: null, keyType: 'office', takenBy: '', takenByType: 'staff',
  takenAt: new Date().toISOString().slice(0, 16), expectedReturnAt: null,
  actualReturnAt: null, returnStatus: 'out', notes: null,
};

interface Props {
  open: boolean; initial?: KeyLog | null;
  onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function KeyLogDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);
  const set = (f: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [f]: v === '' ? null : v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Key Log' : 'Log Key'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}><TextField label="Property ID" value={form.propertyId} onChange={e => set('propertyId', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Key Type" value={form.keyType} onChange={e => set('keyType', e.target.value)} fullWidth size="small">
              {['office', 'resident', 'security', 'fob'].map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Taken By Type" value={form.takenByType} onChange={e => set('takenByType', e.target.value)} fullWidth size="small">
              {['resident', 'staff'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}><TextField label="Taken By (name)" value={form.takenBy} onChange={e => set('takenBy', e.target.value)} fullWidth required size="small" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Taken At" type="datetime-local" value={typeof form.takenAt === 'string' ? form.takenAt.slice(0, 16) : ''} onChange={e => set('takenAt', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Expected Return" type="date" value={form.expectedReturnAt ?? ''} onChange={e => set('expectedReturnAt', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Actual Return" type="date" value={form.actualReturnAt ?? ''} onChange={e => set('actualReturnAt', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Return Status" value={form.returnStatus} onChange={e => set('returnStatus', e.target.value)} fullWidth size="small">
              {['out', 'returned'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}><TextField label="Notes" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} fullWidth size="small" multiline rows={2} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.propertyId || !form.takenBy}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
