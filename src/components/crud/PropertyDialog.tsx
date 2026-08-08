'use client';
import { useEffect, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert,
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Property, Landlord, Company, ServiceProvider, getCompanies, getServiceProviders } from '@/services/api';

type FormState = Omit<Property, 'id'>;

const empty: FormState = {
  code: '', bu: '', area: '', fullAddress: '',
  officeKeysCount: 0, officeKeysComment: null, keysCount: 0, securityKeysCount: 0, fobCount: 0, keyCode: '',
  electricityStatus: '', electricityMprn: '', electricitySupplier: '',
  electricityAccountNumber: '', electricityKeypadCode: '',
  gasStatus: '', gasGprn: '', gasSupplier: '', gasAccountNumber: '', gasPin: '',
  wasteSupplier: '', wasteAccountNumber: '', wasteEmail: '', wastePassword: '',
  wastePaymentType: '', wasteMonthlyAmount: null, wasteStatus: '',
  internetSupplier: '', internetAccountNumber: '', internetEmail: '',
  internetUsername: '', internetPassword: '', internetPaymentType: '',
  internetStatus: '', internetContractEndDate: '',
  internetOnlineLink: null, internetBusinessPhone: null, internetNotes: null,
  wastePhone: null,
  salesDescription: '',
  eirCode: null, propertyType: null,
  crn: null, propertyEmail: null,
  paymentReference: null, propertySupplier: null,
  landlordId: null,
};

const statusOptions = ['', 'Pre', 'Active', 'Inactive'];
const paymentTypeOptions = ['', 'Direct Debit', 'Standing Order', 'Manual'];
const PROPERTY_TYPES = ['House', 'Apartment', 'Duplex', 'Studio Block', 'Other'];

interface Props {
  open: boolean;
  initial?: Property | null;
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<void>;
  landlords?: Landlord[];
}

export default function PropertyDialog({ open, initial, onClose, onSave, landlords = [] }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);

  useEffect(() => {
    setForm(initial ? { ...initial } : { ...empty });
    setError(null);
  }, [initial, open]);

  useEffect(() => {
    if (!open) return;
    getCompanies().then(setCompanies).catch(() => {});
    getServiceProviders().then(setProviders).catch(() => {});
  }, [open]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value === '' ? null : value }));

  const hasOfficeKeys = (form.officeKeysCount ?? 0) > 0;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await onSave(form, initial?.id);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to save property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // BU acronyms from companies — value stored on property must fit VARCHAR(20)
  const buOptions = companies.filter(c => c.bu).map(c => c.bu as string);

  // Supplier options: service provider names
  const supplierOptions = providers.map(p => p.name);

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

  // Supplier field: shows service provider names as options but also allows free text
  const supplierField = (label: string, field: keyof FormState, xs = 6) => (
    <Grid size={{ xs }}>
      <TextField
        select={supplierOptions.length > 0}
        label={label}
        value={(form[field] as string) ?? ''}
        onChange={e => set(field, e.target.value)}
        fullWidth size="small"

      >
        {supplierOptions.length > 0 && [
          <MenuItem key="" value=""><em>None / custom</em></MenuItem>,
          ...supplierOptions.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>),
        ]}
      </TextField>
    </Grid>
  );

  const canSave = !!form.code && !!form.bu && !!form.fullAddress && !!form.propertyType && !!form.eirCode;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initial ? 'Edit Property' : 'New Property'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>

        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

        {/* Basic info */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 3 }}>
            <TextField label="Code *" value={form.code} onChange={e => set('code', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 3 }}>
            {buOptions.length > 0 ? (
              <TextField select label="BU *" value={form.bu ?? ''} onChange={e => set('bu', e.target.value)} fullWidth required size="small">
                {buOptions.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
            ) : (
              <TextField label="BU *" value={form.bu ?? ''} onChange={e => set('bu', e.target.value)} fullWidth required size="small" helperText="Add business units" />
            )}
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField label="Area" value={form.area ?? ''} onChange={e => set('area', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField
              select label="Property Type *" value={form.propertyType ?? ''} onChange={e => set('propertyType', e.target.value)} fullWidth required size="small"
            >
              <MenuItem value=""><em>—</em></MenuItem>
              {PROPERTY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Full Address *" value={form.fullAddress ?? ''} onChange={e => set('fullAddress', e.target.value)}
              fullWidth required size="small" multiline rows={2}
            />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField
              label="Eircode *"
              value={form.eirCode ?? ''}
              onChange={e => set('eirCode', e.target.value)}
              onBlur={e => set('eirCode', e.target.value.trim().toUpperCase() || null)}
              fullWidth required size="small"
              slotProps={{ htmlInput: { maxLength: 10 } }}
            />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField label="Property Email" value={form.propertyEmail ?? ''} onChange={e => set('propertyEmail', e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>

        {/* Keys */}
        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Key Inventory</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 3 }}>
                <TextField
                  select label="Office Keys"
                  value={(form.officeKeysCount ?? 0) > 0 ? 'yes' : 'no'}
                  onChange={e => set('officeKeysCount', e.target.value === 'yes' ? 1 : 0)}
                  fullWidth size="small"
                >
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                </TextField>
              </Grid>
              {hasOfficeKeys && (
                <Grid size={{ xs: 9 }}>
                  <TextField
                    label="Office Keys Comment"
                    value={form.officeKeysComment ?? ''}
                    onChange={e => set('officeKeysComment', e.target.value)}
                    fullWidth size="small"
                    placeholder="e.g. in the office, with maintenance team…"
                  />
                </Grid>
              )}
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
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Electricity</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {sel('Status', 'electricityStatus', statusOptions)}
              {supplierField('Supplier', 'electricitySupplier')}
              {tf('MPRN', 'electricityMprn')}
              {tf('Account Number', 'electricityAccountNumber')}
              {tf('Keypad Code', 'electricityKeypadCode')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Gas */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Gas</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {sel('Status', 'gasStatus', statusOptions)}
              {supplierField('Supplier', 'gasSupplier')}
              {tf('GPRN', 'gasGprn')}
              {tf('Account Number', 'gasAccountNumber')}
              {tf('PIN / Password', 'gasPin')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Waste / Bin */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Waste / Bin</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {supplierField('Supplier', 'wasteSupplier')}
              {tf('Account Number', 'wasteAccountNumber')}
              {tf('Email', 'wasteEmail')}
              {tf('Mobile', 'wastePhone')}
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
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Internet / Broadband</Typography>
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
              {tf('Online Account Link', 'internetOnlineLink', { xs: 12 })}
              {tf('Business Phone', 'internetBusinessPhone')}
              {tf('Notes', 'internetNotes')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Sales */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Sales Description</Typography>
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

        {/* Payment Details */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Payment Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  select label="Landlord"
                  value={form.landlordId ?? ''}
                  onChange={e => set('landlordId', e.target.value || null)}
                  fullWidth size="small"
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {landlords.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                </TextField>
              </Grid>
              {tf('Payment Reference', 'paymentReference', { xs: 6 })}
              {tf('Property Supplier', 'propertySupplier', { xs: 6 })}
              {(() => {
                const selected = landlords.find(l => l.id === form.landlordId);
                if (!selected) return null;
                return (
                  <>
                    <Grid size={{ xs: 6 }}>
                      <TextField label="IBAN" value={selected.iban ?? '—'} fullWidth size="small" slotProps={{ input: { readOnly: true } }} />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField label="BIC" value={selected.bic ?? '—'} fullWidth size="small" slotProps={{ input: { readOnly: true } }} />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField label="Payout Day" value={selected.payoutDay ?? '—'} fullWidth size="small" slotProps={{ input: { readOnly: true } }} />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField label="Resident Due Day" value={selected.residentPaymentDueDay ?? '—'} fullWidth size="small" slotProps={{ input: { readOnly: true } }} />
                    </Grid>
                  </>
                );
              })()}
            </Grid>
          </AccordionDetails>
        </Accordion>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !canSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
