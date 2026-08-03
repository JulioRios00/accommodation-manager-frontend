'use client';
import { useEffect, useState } from 'react';
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import {
  Resident, Property, Bed, Booking,
  getProperties, getBeds, getBookings, createBooking, updateBooking,
} from '@/services/api';

type FormState = Omit<Resident, 'id'>;

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const empty: FormState = {
  clerkUserId: null, fullName: '', email: '', telephone: '', gender: null, nationality: '',
  personalId: '', iban: '', emergencyContact: '', source: '',
  paymentDueDay: null, comments: '', delinquent: false,
  hasObservation: false, observation: '',
};

const emptyBooking = { propertyId: '', bedId: '', checkIn: '', contractEnd: '', rent: '', deposit: '' };

interface Props {
  open: boolean;
  initial?: Resident | null;
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<string>;
}

export default function ResidentDialog({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  // Accommodation
  const [properties, setProperties] = useState<Property[]>([]);
  const [allBeds, setAllBeds] = useState<Bed[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [bk, setBk] = useState(emptyBooking);

  useEffect(() => {
    setForm(initial ? { ...initial } : { ...empty });
    setBk(emptyBooking);
    setActiveBooking(null);

    if (!open) return;

    const loaders: Promise<any>[] = [getProperties(), getBeds()];
    if (initial?.id) loaders.push(getBookings('active'));

    Promise.all(loaders).then(([props, bds, bookings]) => {
      setProperties(props);
      setAllBeds(bds);

      if (bookings && initial?.id) {
        const booking: Booking | undefined = bookings.find((b: Booking) => b.residentId === initial.id);
        if (booking) {
          setActiveBooking(booking);
          const bed = bds.find((b: Bed) => b.id === booking.bedId);
          setBk({
            propertyId: bed?.propertyId ?? '',
            bedId: booking.bedId,
            checkIn: booking.checkInDate ? String(booking.checkInDate).split('T')[0] : '',
            contractEnd: booking.contractEndDate ? String(booking.contractEndDate).split('T')[0] : '',
            rent: String(booking.rentAmount ?? ''),
            deposit: String(booking.depositAmount ?? ''),
          });
        }
      }
    }).catch(() => {});
  }, [initial, open]);

  const set = (field: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [field]: value || null }));
  const setNum = (field: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [field]: value ? Number(value) : null }));
  const setBool = (field: keyof FormState, value: boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const bedsForProperty = allBeds.filter(
    b => b.propertyId === bk.propertyId && (b.status === 'vacant' || b.id === bk.bedId),
  );

  const handleBedChange = (bedId: string) => {
    const bed = allBeds.find(b => b.id === bedId);
    setBk(b => ({
      ...b,
      bedId,
      rent: b.rent || String(bed?.rentAmount ?? ''),
      deposit: b.deposit || String(bed?.depositAmount ?? ''),
    }));
  };

  const handlePropertyChange = (propertyId: string) => {
    setBk(b => ({ ...b, propertyId, bedId: '' }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const residentId = await onSave(form, initial?.id);

      if (bk.bedId && residentId) {
        const bookingData = {
          bedId: bk.bedId,
          residentId,
          checkInDate: bk.checkIn || null,
          contractEndDate: bk.contractEnd || null,
          checkOutDate: null as string | null,
          depositAmount: Number(bk.deposit) || 0,
          rentAmount: Number(bk.rent) || 0,
          isHeadResident: false,
          isTemporary: false,
          status: 'active' as const,
          comments: null as string | null,
        };
        if (activeBooking) await updateBooking(activeBooking.id, bookingData);
        else await createBooking(bookingData);
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  const currentBedLabel = (() => {
    if (!activeBooking) return null;
    const bed = allBeds.find(b => b.id === activeBooking.bedId);
    if (!bed) return null;
    const prop = properties.find(p => p.id === bed.propertyId);
    return `${prop?.code ?? '?'}-${bed.bedNumber}`;
  })();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Resident' : 'New Resident'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Personal info */}
          <Grid size={{ xs: 12 }}>
            <TextField label="Full Name" value={form.fullName} onChange={e => set('fullName', e.target.value)} fullWidth required size="small" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Clerk User ID (portal access)"
              value={form.clerkUserId ?? ''}
              onChange={e => set('clerkUserId', e.target.value)}
              fullWidth size="small"
              placeholder="user_xxxxxxxxxxxx — paste from Clerk dashboard"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} fullWidth size="small" type="email" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Telephone" value={form.telephone ?? ''} onChange={e => set('telephone', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select label="Gender" value={form.gender ?? ''} onChange={e => set('gender', e.target.value)} fullWidth size="small">
              <MenuItem value=""><em>—</em></MenuItem>
              {GENDER_OPTIONS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </TextField>
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

          {/* ── Accommodation ── */}
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Accommodation
            </Typography>
          </Grid>

          {currentBedLabel && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ py: 0.5 }}>
                Currently in <strong>{currentBedLabel}</strong>
                {activeBooking?.contractEndDate && ` · contract ends ${new Date(activeBooking.contractEndDate).toLocaleDateString('en-GB')}`}
              </Alert>
            </Grid>
          )}

          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Property" value={bk.propertyId}
              onChange={e => handlePropertyChange(e.target.value)}
              fullWidth size="small"
            >
              <MenuItem value=""><em>— none —</em></MenuItem>
              {properties.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.code} {p.fullAddress ? `· ${p.fullAddress}` : ''}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Bed / Unit" value={bk.bedId}
              onChange={e => handleBedChange(e.target.value)}
              fullWidth size="small"
              disabled={!bk.propertyId}
            >
              <MenuItem value=""><em>— none —</em></MenuItem>
              {bedsForProperty.map(b => (
                <MenuItem key={b.id} value={b.id}>
                  {b.propertyCode ?? ''}-{b.bedNumber}
                  {b.bedroomName ? ` · ${b.bedroomName}` : ''}
                  {b.bedroomType ? ` (${b.bedroomType})` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Check-in Date" type="date" value={bk.checkIn}
              onChange={e => setBk(b => ({ ...b, checkIn: e.target.value }))}
              fullWidth size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={!bk.bedId}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Contract End Date" type="date" value={bk.contractEnd}
              onChange={e => setBk(b => ({ ...b, contractEnd: e.target.value }))}
              fullWidth size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={!bk.bedId}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Rent (€)" type="number" value={bk.rent}
              onChange={e => setBk(b => ({ ...b, rent: e.target.value }))}
              fullWidth size="small"
              disabled={!bk.bedId}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Deposit (€)" type="number" value={bk.deposit}
              onChange={e => setBk(b => ({ ...b, deposit: e.target.value }))}
              fullWidth size="small"
              disabled={!bk.bedId}
            />
          </Grid>

          {/* Notes & Flags */}
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
