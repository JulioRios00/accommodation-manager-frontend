'use client';
import { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MaintenanceTicket } from '@/services/api';

type FormState = Omit<MaintenanceTicket, 'id' | 'orderNumber'>;

const empty: FormState = {
  propertyId: '', serviceProviderId: null, title: '', descriptionRequested: null, additionalDetails: null,
  descriptionDone: null, materials: null, priority: 0, urgency: 'Low', status: 'open',
  clientName: null, clientPhone: null, approvedBy: null, approvalDate: null, chargedBy: null,
  houseCompany: null, maintenanceCost: null, materialCost: null, totalCost: null,
  entryNoticeDate: null, entryCheckIn: null, entryCheckOut: null, causedByResident: false,
  tags: [], clerkUserId: null, clerkUserName: null,
};

interface Props {
  open: boolean; initial?: MaintenanceTicket | null;
  onClose: () => void; onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function MaintenanceTicketDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial ? { ...initial } : { ...empty }); }, [initial, open]);
  const set = (field: keyof FormState, v: unknown) => setForm(f => ({ ...f, [field]: v === '' ? null : v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); }
  };

  const tf = (label: string, field: keyof FormState, xs = 6, type = 'text') => (
    <Grid size={{ xs }}>
      <TextField label={label} value={(form[field] as string | number) ?? ''} onChange={e => set(field, e.target.value)} fullWidth size="small" type={type} />
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initial ? `Edit ${initial.orderNumber}` : 'New Maintenance Ticket'}</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid size={{ xs: 9 }}>
            <TextField label="Title" value={form.title} onChange={e => set('title', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField select label="Urgency" value={form.urgency} onChange={e => set('urgency', e.target.value)} fullWidth size="small">
              {['Low', 'Middle', 'High'].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 9 }}>{tf('Property ID', 'propertyId', 12)}</Grid>
          <Grid size={{ xs: 3 }}>
            <TextField select label="Status" value={form.status} onChange={e => set('status', e.target.value)} fullWidth size="small">
              {['open', 'in_progress', 'completed', 'cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>

        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" fontWeight={600}>Description</Typography></AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}><TextField label="Description Requested" value={form.descriptionRequested ?? ''} onChange={e => set('descriptionRequested', e.target.value)} fullWidth size="small" multiline rows={3} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Additional Details" value={form.additionalDetails ?? ''} onChange={e => set('additionalDetails', e.target.value)} fullWidth size="small" multiline rows={2} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Description Done" value={form.descriptionDone ?? ''} onChange={e => set('descriptionDone', e.target.value)} fullWidth size="small" multiline rows={2} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Materials" value={form.materials ?? ''} onChange={e => set('materials', e.target.value)} fullWidth size="small" multiline rows={2} /></Grid>
              <Grid size={{ xs: 6 }}><FormControlLabel control={<Checkbox checked={form.causedByResident} onChange={e => set('causedByResident', e.target.checked)} />} label="Caused by resident" /></Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" fontWeight={600}>Client & Costs</Typography></AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {tf('Client Name', 'clientName')} {tf('Client Phone', 'clientPhone')}
              {tf('Charged By', 'chargedBy')} {tf('House Company', 'houseCompany')}
              {tf('Maintenance Cost (€)', 'maintenanceCost', 4, 'number')}
              {tf('Material Cost (€)', 'materialCost', 4, 'number')}
              {tf('Total Cost (€)', 'totalCost', 4, 'number')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" fontWeight={600}>Approval & Entry</Typography></AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {tf('Approved By', 'approvedBy')}
              <Grid size={{ xs: 6 }}><TextField label="Approval Date" type="date" value={form.approvalDate ?? ''} onChange={e => set('approvalDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Entry Notice Date" type="date" value={form.entryNoticeDate ?? ''} onChange={e => set('entryNoticeDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              {tf('Entry Check-In', 'entryCheckIn')} {tf('Entry Check-Out', 'entryCheckOut')}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.title || !form.propertyId}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
