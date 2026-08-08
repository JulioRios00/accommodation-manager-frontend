'use client';
import { useEffect, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Alert, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  MaintenanceTicket, Property, Landlord, ServiceProvider, ClerkUser, TicketActivityLog,
  getProperties, getLandlords, getServiceProviders, getUsers, getTicketActivity, addTicketActivity,
  claimMaintenanceTicket, closeMaintenanceTicket,
} from '@/services/api';

type FormState = Omit<MaintenanceTicket, 'id' | 'orderNumber' | 'createdAt'>;

const CATEGORIES = ['plumbing', 'electrical', 'internet', 'other'];

const empty: FormState = {
  propertyId: '', category: null, bedId: null, residentId: null,
  serviceProviderId: null, responsibleClerkUserId: null, responsibleClerkUserName: null,
  title: '', descriptionRequested: null, additionalDetails: null,
  descriptionDone: null, materials: null, priority: 0, urgency: 'Low', status: 'open',
  timeframe: null, clientName: null, clientPhone: null,
  approvedBy: null, approvalDate: null, paymentApprovedBy: null, chargedBy: null,
  houseCompany: null, maintenanceCost: null, materialCost: null, totalCost: null,
  entryNoticeDate: null, entryCheckIn: null, entryCheckOut: null, causedByResident: false,
  tags: [], clerkUserId: null, clerkUserName: null,
};

/** Encode provider/user selection into a single select value */
function encodeResponsible(form: FormState): string {
  if (form.serviceProviderId) return `provider:${form.serviceProviderId}`;
  if (form.responsibleClerkUserId) return `user:${form.responsibleClerkUserId}`;
  return '';
}

/** Decode a select value back into the right form fields */
function decodeResponsible(
  key: string,
  providers: ServiceProvider[],
  users: ClerkUser[],
): Partial<FormState> {
  if (!key) return { serviceProviderId: null, responsibleClerkUserId: null, responsibleClerkUserName: null };
  if (key.startsWith('provider:')) {
    return { serviceProviderId: key.slice(9), responsibleClerkUserId: null, responsibleClerkUserName: null };
  }
  const userId = key.slice(5);
  const u = users.find(u => u.id === userId);
  return { serviceProviderId: null, responsibleClerkUserId: userId, responsibleClerkUserName: u?.fullName ?? null };
}

interface Props {
  open: boolean;
  initial?: MaintenanceTicket | null;
  onClose: () => void;
  onSave: (data: Omit<MaintenanceTicket, 'id' | 'orderNumber' | 'createdAt'>, id?: string) => Promise<void>;
  onRefresh?: () => void;
}

const statusColor: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  open: 'warning', in_progress: 'info', completed: 'success', cancelled: 'error',
};

export default function MaintenanceTicketDialog({ open, initial, onClose, onSave, onRefresh }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [properties, setProperties] = useState<Property[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [maintenanceUsers, setMaintenanceUsers] = useState<ClerkUser[]>([]);

  // Activity log
  const [logs, setLogs] = useState<TicketActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Close flow
  const [closingMode, setClosingMode] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionWorking, setActionWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial ? { ...initial } : { ...empty });
    setClosingMode(false);
    setResolutionNotes('');
    setActionError(null);
    setNoteText('');
  }, [initial, open]);

  useEffect(() => {
    if (!open) return;
    getProperties().then(setProperties).catch(() => {});
    getLandlords().then(setLandlords).catch(() => {});
    getServiceProviders().then(setProviders).catch(() => {});
    getUsers().then(all => setMaintenanceUsers(all.filter(u => u.role === 'maintenance'))).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !initial?.id) { setLogs([]); return; }
    setLogsLoading(true);
    getTicketActivity(initial.id)
      .then(l => setLogs([...l].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [open, initial?.id]);

  const set = (field: keyof FormState, v: unknown) =>
    setForm(f => ({ ...f, [field]: v === '' ? null : v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form, initial?.id); onClose(); } finally { setSaving(false); }
  };

  const handleClaim = async () => {
    if (!initial?.id) return;
    setActionWorking(true); setActionError(null);
    try {
      await claimMaintenanceTicket(initial.id);
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? 'Could not claim ticket');
    } finally { setActionWorking(false); }
  };

  const handleClose = async () => {
    if (!initial?.id) return;
    setActionWorking(true); setActionError(null);
    try {
      await closeMaintenanceTicket(initial.id, { resolutionNotes: resolutionNotes || undefined });
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? 'Could not close ticket');
    } finally { setActionWorking(false); }
  };

  const handleAddNote = async (isResidentNotification = false) => {
    if (!initial?.id || !noteText.trim()) return;
    setAddingNote(true);
    try {
      const entry = await addTicketActivity(initial.id, {
        eventType: isResidentNotification ? 'resident_notification' : 'comment',
        comment: noteText.trim(),
      });
      setLogs(l => [...l, entry]);
      setNoteText('');
    } catch { } finally { setAddingNote(false); }
  };

  const selectedProperty = properties.find(p => p.id === form.propertyId) ?? null;
  const landlord = landlords.find(l => l.id === selectedProperty?.landlordId) ?? null;
  const provider = providers.find(p => p.id === form.serviceProviderId) ?? null;
  const responsibleUser = maintenanceUsers.find(u => u.id === form.responsibleClerkUserId) ?? null;

  const isExisting = !!initial?.id;
  const isOpen = initial?.status === 'open';
  const isInProgress = initial?.status === 'in_progress';

  const tf = (label: string, field: keyof FormState, xs = 6, type = 'text') => (
    <Grid size={{ xs }}>
      <TextField label={label} value={(form[field] as string | number) ?? ''} onChange={e => set(field, e.target.value)} fullWidth size="small" type={type} />
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span>{initial ? `${initial.orderNumber} — ${initial.title}` : 'New Maintenance Ticket'}</span>
          {initial && <Chip label={initial.status} color={statusColor[initial.status] ?? 'default'} size="small" />}
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

        {/* ── Claim / Close actions ── */}
        {isExisting && (isOpen || isInProgress) && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {isOpen && (
              <Button
                variant="contained" startIcon={<LockIcon />} size="small" color="warning"
                onClick={handleClaim} disabled={actionWorking}
              >
                {actionWorking ? 'Claiming…' : 'Claim Ticket'}
              </Button>
            )}
            {isInProgress && !closingMode && (
              <Button
                variant="contained" startIcon={<CheckCircleIcon />} size="small" color="success"
                onClick={() => setClosingMode(true)} disabled={actionWorking}
              >
                Close Ticket
              </Button>
            )}
            {isInProgress && closingMode && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flex: 1 }}>
                <TextField
                  label="Resolution notes" value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  size="small" multiline rows={2} fullWidth
                  placeholder="Describe what was done…"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Button variant="contained" color="success" size="small" onClick={handleClose} disabled={actionWorking}>
                    {actionWorking ? 'Closing…' : 'Confirm Close'}
                  </Button>
                  <Button size="small" onClick={() => setClosingMode(false)}>Cancel</Button>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* ── Core fields ── */}
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid size={{ xs: 9 }}>
            <TextField label="Title" value={form.title} onChange={e => set('title', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField select label="Urgency" value={form.urgency} onChange={e => set('urgency', e.target.value)} fullWidth size="small">
              <MenuItem value="Low">Routine</MenuItem>
              <MenuItem value="Middle">Urgent</MenuItem>
              <MenuItem value="High">Emergency</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Property" value={form.propertyId} onChange={e => set('propertyId', e.target.value)} fullWidth required size="small">
              {properties.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.code}{p.fullAddress ? ` — ${p.fullAddress}` : ''}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField select label="Category" value={form.category ?? ''} onChange={e => set('category', e.target.value)} fullWidth size="small">
              <MenuItem value=""><em>None</em></MenuItem>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField select label="Status" value={form.status} onChange={e => set('status', e.target.value)} fullWidth size="small">
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Responsible"
              value={encodeResponsible(form)}
              onChange={e => setForm(f => ({ ...f, ...decodeResponsible(e.target.value, providers, maintenanceUsers) }))}
              fullWidth size="small"
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {maintenanceUsers.length > 0 && (
                <MenuItem disabled sx={{ opacity: 0.6, fontSize: 12, fontWeight: 600 }}>— Internal Team —</MenuItem>
              )}
              {maintenanceUsers.map(u => (
                <MenuItem key={`user:${u.id}`} value={`user:${u.id}`}>{u.fullName}</MenuItem>
              ))}
              {providers.length > 0 && (
                <MenuItem disabled sx={{ opacity: 0.6, fontSize: 12, fontWeight: 600 }}>— External Providers —</MenuItem>
              )}
              {providers.map(p => (
                <MenuItem key={`provider:${p.id}`} value={`provider:${p.id}`}>
                  {p.name}{p.specialty ? ` (${p.specialty})` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField select label="Timeframe" value={form.timeframe ?? ''} onChange={e => set('timeframe', e.target.value)} fullWidth size="small">
              {['', 'Same Day', '24h', '48h', '1 Week', '2 Weeks'].map(t => <MenuItem key={t} value={t}>{t || '—'}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>

        {/* ── Gap C: Property Access Details ── */}
        {isExisting && selectedProperty && (
          <Accordion disableGutters sx={{ mb: 0 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Access &amp; Contact Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Door Key Code</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {selectedProperty.keyCode ?? '—'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Electricity Keypad</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {selectedProperty.electricityKeypadCode ?? '—'}
                  </Typography>
                </Grid>
                {landlord && (
                  <>
                    <Grid size={{ xs: 12 }}><Divider /></Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary">Landlord / Agent</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{landlord.name}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2">{landlord.email ?? '—'}</Typography>
                    </Grid>
                  </>
                )}
                {responsibleUser && (
                  <>
                    <Grid size={{ xs: 12 }}><Divider /></Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary">Internal Responsible</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{responsibleUser.fullName}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2">{responsibleUser.email}</Typography>
                    </Grid>
                  </>
                )}
                {provider && (
                  <>
                    <Grid size={{ xs: 12 }}><Divider /></Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary">External Provider</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{provider.name}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="body2">{provider.contactName ?? '—'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="body2">{provider.phone ?? '—'}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" sx={{ fontWeight: 600 }}>Description</Typography></AccordionSummary>
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
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" sx={{ fontWeight: 600 }}>Client &amp; Costs</Typography></AccordionSummary>
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
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" sx={{ fontWeight: 600 }}>Approval &amp; Entry</Typography></AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {tf('Approved By', 'approvedBy')}
              {tf('Payment Approved By', 'paymentApprovedBy')}
              <Grid size={{ xs: 6 }}><TextField label="Approval Date" type="date" value={form.approvalDate ?? ''} onChange={e => set('approvalDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Entry Notice Date" type="date" value={form.entryNoticeDate ?? ''} onChange={e => set('entryNoticeDate', e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              {tf('Entry Check-In', 'entryCheckIn')} {tf('Entry Check-Out', 'entryCheckOut')}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ── Gaps D + E: Activity Log + Notify Resident ── */}
        {isExisting && (
          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Activity Log {logs.length > 0 && `(${logs.length})`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1 }}>
              {logsLoading ? (
                <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={20} /></Box>
              ) : logs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No activity yet.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
                  {logs.map(log => (
                    <Box key={log.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Box sx={{ minWidth: 110 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.createdAt).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Chip
                          label={log.eventType === 'resident_notification' ? 'notified resident' : log.eventType}
                          size="small"
                          color={log.eventType === 'resident_notification' ? 'secondary' : log.eventType === 'status_change' ? 'info' : 'default'}
                          sx={{ fontSize: 10, height: 18, mr: 0.5 }}
                        />
                        {log.clerkUserName && (
                          <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>{log.clerkUserName} </Typography>
                        )}
                        {log.comment && <Typography component="span" variant="caption">{log.comment}</Typography>}
                        {log.field && !log.comment && (
                          <Typography component="span" variant="caption" color="text.secondary">
                            {log.field}: {log.oldValue} → {log.newValue}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Add note + notify resident */}
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label="Add note" value={noteText} onChange={e => setNoteText(e.target.value)}
                  size="small" multiline rows={2} fullWidth
                  placeholder="Progress note or message for the resident…"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 130 }}>
                  <Button
                    size="small" variant="outlined" disabled={addingNote || !noteText.trim()}
                    onClick={() => handleAddNote(false)}
                  >
                    Add Note
                  </Button>
                  <Button
                    size="small" variant="outlined" color="secondary"
                    startIcon={<NotificationsIcon sx={{ fontSize: 14 }} />}
                    disabled={addingNote || !noteText.trim()}
                    onClick={() => handleAddNote(true)}
                  >
                    Notify Resident
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.title || !form.propertyId}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
