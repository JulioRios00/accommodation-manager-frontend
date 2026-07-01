'use client';
import { useEffect, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Property } from '@/services/api';

type FormState = Omit<Property, 'id'>;

const empty: FormState = {
  code: '', bu: '', area: '', fullAddress: '',
  officeKeysCount: 0, keysCount: 0, securityKeysCount: 0, fobCount: 0, keyCode: '',
  electricityStatus: '', electricityMprn: '', electricitySupplier: '',
  electricityAccountNumber: '', electricityKeypadCode: '',
  gasStatus: '', gasGprn: '', gasSupplier: '', gasAccountNumber: '', gasPin: '',
  wasteSupplier: '', wasteAccountNumber: '', wasteEmail: '', wastePassword: '',
  wastePaymentType: '', wasteMonthlyAmount: null, wasteStatus: '',
  internetSupplier: '', internetAccountNumber: '', internetEmail: '',
  internetUsername: '', internetPassword: '', internetPaymentType: '',
  internetStatus: '', internetContractEndDate: '',
  salesDescription: '',
};

const statusOptions = ['', 'Pre', 'Active', 'Inactive'];
const paymentTypeOptions = ['', 'Direct Debit', 'Standing Order', 'Manual'];

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
    setForm(f => ({ ...f, [field]: value === '' ? null : value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form, initial?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const tf = (label: string, field: keyof FormState, opts?: { type?: string; xs?: number }) => (
    <Grid size={{ xs: opts?.xs ?? 6 }}>
      <TextField
        label={label}
        value={(form[field] as string | number) ?? ''}
        onChange={e => set(field, e.target.value)}
        fullWidth size="small"
        type={opts?.type ?? 'text'}
      />
    </Grid>
  );

  const sel = (label: string, field: keyof FormState, options: string[], xs = 6) => (
    <Grid size={{ xs }}>
      <TextField select label={label} value={(form[field] as string) ?? ''} onChange={e => set(field, e.target.value)} fullWidth size="small">
        {options.map(v => <MenuItem key={v} value={v}>{v || '—'}</MenuItem>)}
      </TextField>
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initial ? 'Edit Property' : 'New Property'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>

        {/* Basic info — always visible */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 4 }}>
            <TextField label="Code" value={form.code} onChange={e => set('code', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="BU" value={form.bu} onChange={e => set('bu', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Area" value={form.area ?? ''} onChange={e => set('area', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Full Address" value={form.fullAddress ?? ''} onChange={e => set('fullAddress', e.target.value)} fullWidth size="small" multiline rows={2} />
          </Grid>
        </Grid>

        {/* Keys */}
        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>Key Inventory</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 3 }}>
                <TextField label="Office Keys" type="number" value={form.officeKeysCount ?? 0} onChange={e => set('officeKeysCount', +e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { min: 0 } }} />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField label="Resident Keys" type="number" value={form.keysCount ?? 0} onChange={e => set('keysCount', +e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { min: 0 } }} />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField label="Sec. Keys" type="number" value={form.securityKeysCount ?? 0} onChange={e => set('securityKeysCount', +e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { min: 0 } }} />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField label="Fobs" type="number" value={form.fobCount ?? 0} onChange={e => set('fobCount', +e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { min: 0 } }} />
              </Grid>
              {tf('Key Code', 'keyCode', { xs: 12 })}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Electricity */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>Electricity</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {sel('Status', 'electricityStatus', statusOptions)}
              {tf('MPRN', 'electricityMprn')}
              {tf('Supplier', 'electricitySupplier')}
              {tf('Account Number', 'electricityAccountNumber')}
              {tf('Keypad Code', 'electricityKeypadCode')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Gas */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>Gas</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {sel('Status', 'gasStatus', statusOptions)}
              {tf('GPRN', 'gasGprn')}
              {tf('Supplier', 'gasSupplier')}
              {tf('Account Number', 'gasAccountNumber')}
              {tf('PIN / Password', 'gasPin')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Waste / Bin */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>Waste / Bin</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {tf('Supplier', 'wasteSupplier')}
              {tf('Account Number', 'wasteAccountNumber')}
              {tf('Email', 'wasteEmail')}
              {tf('Password', 'wastePassword')}
              {sel('Payment Type', 'wastePaymentType', paymentTypeOptions)}
              <Grid size={{ xs: 3 }}>
                <TextField label="Monthly Amount (€)" type="number" value={form.wasteMonthlyAmount ?? ''} onChange={e => set('wasteMonthlyAmount', e.target.value ? +e.target.value : null)} fullWidth size="small" slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
              </Grid>
              {sel('Status', 'wasteStatus', statusOptions, 3)}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Internet */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>Internet / Broadband</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {tf('Supplier', 'internetSupplier')}
              {tf('Account Number', 'internetAccountNumber')}
              {tf('Email', 'internetEmail')}
              {tf('Username', 'internetUsername')}
              {tf('Password', 'internetPassword')}
              {sel('Payment Type', 'internetPaymentType', paymentTypeOptions)}
              {sel('Status', 'internetStatus', statusOptions)}
              <Grid size={{ xs: 6 }}>
                <TextField label="Contract End Date" type="date" value={form.internetContractEndDate ?? ''} onChange={e => set('internetContractEndDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Sales */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>Sales Description</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              label="Description (transport links, amenities, highlights…)"
              value={form.salesDescription ?? ''}
              onChange={e => set('salesDescription', e.target.value)}
              fullWidth size="small" multiline rows={5}
            />
          </AccordionDetails>
        </Accordion>

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
