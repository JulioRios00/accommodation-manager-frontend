'use client';
import { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Landlord } from '@/services/api';

type FormState = Omit<Landlord, 'id' | 'active'>;

const empty: FormState = {
  name: '', email: '', address: '', bankName: '', sortCode: '', accountNumber: '',
  iban: '', bic: '', paymentReference: '', paymentMethod: '', residentPaymentDueDay: null,
};

interface Props {
  open: boolean;
  initial?: Landlord | null;
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function LandlordDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value === '' ? null : value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); }
  };

  const tf = (label: string, field: keyof FormState, xs = 6) => (
    <Grid size={{ xs }}>
      <TextField label={label} value={(form[field] as string) ?? ''} onChange={e => set(field, e.target.value)} fullWidth size="small" />
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Landlord' : 'New Landlord'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12 }}>
            <TextField label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} fullWidth required size="small" />
          </Grid>
          {tf('Email', 'email', 12)}
          <Grid size={{ xs: 12 }}>
            <TextField label="Address" value={form.address ?? ''} onChange={e => set('address', e.target.value)} fullWidth size="small" multiline rows={2} />
          </Grid>
        </Grid>

        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Bank Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {tf('Bank Name', 'bankName')} {tf('Sort Code', 'sortCode')}
              {tf('Account Number', 'accountNumber')} {tf('IBAN', 'iban')} {tf('BIC', 'bic')}
              {tf('Payment Reference', 'paymentReference', 12)}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Payment Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField select label="Payment Method" value={form.paymentMethod ?? ''} onChange={e => set('paymentMethod', e.target.value)} fullWidth size="small">
                  {['', 'BankTransfer', 'StandingOrder'].map(v => <MenuItem key={v} value={v}>{v || '—'}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField label="Resident Due Day" type="number" value={form.residentPaymentDueDay ?? ''} onChange={e => set('residentPaymentDueDay', e.target.value ? +e.target.value : null)} fullWidth size="small" slotProps={{ htmlInput: { min: 1, max: 31 } }} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.name}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
