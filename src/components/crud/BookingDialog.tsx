'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, MenuItem, TextField, Radio, RadioGroup, FormControl,
  FormLabel, DialogContentText, createFilterOptions,
} from '@mui/material';
import { Booking, Bed, Resident, Property } from '@/services/api';
import { bedCode } from '@/lib/bedCode';

type RentChangeScope = 'payment' | 'period' | 'bed';

const residentLabel = (r: Resident) => (r.email ? `${r.fullName} — ${r.email}` : r.fullName);

const propertyLabel = (p: Property) => (p.fullAddress ? `${p.code} — ${p.fullAddress}` : p.code);

/** Matches on code and address, so "rathdown" finds 61RR just as "61RR" does. */
const filterProperties = createFilterOptions<Property>({
  limit: 50,
  stringify: propertyLabel,
});

/** Codes lead with digits (15SEG, 61RR, 136SV), so a plain string sort puts 136SV before
 *  15SEG. Numeric collation orders them the way someone reading the list expects. */
const byCode = (a: Property, b: Property) =>
  a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });

/** Matches on name and email, and caps how many options are rendered at once — the
 *  resident list grows without bound and the browser shouldn't paint all of it. */
const filterResidents = createFilterOptions<Resident>({
  limit: 50,
  stringify: residentLabel,
});

type FormState = {
  bedId: string;
  residentId: string;
  propertyId: string;
  checkInDate: string;
  contractEndDate: string;
  checkOutDate: string;
  depositAmount: number;
  rentAmount: number;
  isHeadResident: boolean;
  isTemporary: boolean;
  status: 'active' | 'upcoming' | 'completed';
  comments: string;
};

const empty: FormState = {
  bedId: '', residentId: '', propertyId: '', checkInDate: '', contractEndDate: '', checkOutDate: '',
  depositAmount: 0, rentAmount: 0, isHeadResident: false, isTemporary: false,
  status: 'active', comments: '',
};

function toDateInput(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  initial?: Booking | null;
  /** Renders every field disabled and hides Save — used when the role may view but not edit. */
  readOnly?: boolean;
  beds: Bed[];
  residents: Resident[];
  properties?: Property[];
  onClose: () => void;
  onSave: (data: Omit<FormState, 'propertyId'> & { rentChangeScope?: RentChangeScope }, id?: string) => Promise<void>;
}

export default function BookingDialog({ open, initial, readOnly = false, beds, residents, properties = [], onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [scopePromptOpen, setScopePromptOpen] = useState(false);
  const [rentChangeScope, setRentChangeScope] = useState<RentChangeScope>('period');

  useEffect(() => {
    if (initial) {
      const bed = beds.find(b => b.id === initial.bedId);
      setForm({
        bedId: initial.bedId,
        residentId: initial.residentId,
        propertyId: bed?.propertyId ?? '',
        checkInDate: toDateInput(initial.checkInDate),
        contractEndDate: toDateInput(initial.contractEndDate),
        checkOutDate: toDateInput(initial.checkOutDate),
        depositAmount: initial.depositAmount,
        rentAmount: initial.rentAmount,
        isHeadResident: initial.isHeadResident,
        isTemporary: initial.isTemporary,
        status: initial.status,
        comments: initial.comments ?? '',
      });
    } else {
      setForm({ ...empty });
    }
  }, [initial, open, beds]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  // Reset bed when property changes
  const handlePropertyChange = (propertyId: string) => {
    setForm(f => ({ ...f, propertyId, bedId: '' }));
  };

  // Beds filtered to selected property
  const propertyBeds = useMemo(
    () => form.propertyId ? beds.filter(b => b.propertyId === form.propertyId) : beds,
    [beds, form.propertyId],
  );

  // GET /residents comes back in insertion order, which is what made the old dropdown
  // scroll-only and unscannable. Sorted here rather than in the API so no other page's
  // ordering changes.
  const sortedResidents = useMemo(
    () => [...residents].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [residents],
  );
  // Sorted copy, not an in-place sort: `properties` belongs to the parent, and mutating it
  // would reorder the caller's list as a side effect of opening this dialog.
  const sortedProperties = useMemo(() => [...properties].sort(byCode), [properties]);
  const selectedProperty = useMemo(
    () => properties.find(p => p.id === form.propertyId) ?? null,
    [properties, form.propertyId],
  );

  const selectedResident = useMemo(
    () => residents.find(r => r.id === form.residentId) ?? null,
    [residents, form.residentId],
  );
  const missingResident = !!form.residentId && !selectedResident;

  // Available beds: vacant, OR the current bed when editing, OR bed where current resident's
  // contractEndDate <= check-in date (same-day checkin after checkout is allowed)
  const availableBeds = useMemo(() => {
    return propertyBeds.filter(b => {
      if (initial && b.id === initial.bedId) return true;
      if (b.status === 'vacant') return true;
      if (form.checkInDate && b.activeBooking?.contractEndDate) {
        // Allow check-in on or after the current resident's contract end date
        return new Date(b.activeBooking.contractEndDate) <= new Date(form.checkInDate);
      }
      return false;
    });
  }, [propertyBeds, form.checkInDate, initial]);

  // Editing an existing booking's rent/deposit needs to know how the change should
  // propagate — ask before saving rather than guessing.
  const rentOrDepositChanged =
    !!initial && (form.rentAmount !== initial.rentAmount || form.depositAmount !== initial.depositAmount);

  const doSave = async (scope?: RentChangeScope) => {
    setSaving(true);
    try {
      const { propertyId: _pid, ...rest } = form;
      await onSave({
        ...rest,
        checkInDate: rest.checkInDate || '',
        contractEndDate: rest.contractEndDate || '',
        checkOutDate: rest.checkOutDate || '',
        ...(scope ? { rentChangeScope: scope } : {}),
      }, initial?.id);
      onClose();
    } finally {
      setSaving(false);
      setScopePromptOpen(false);
    }
  };

  const handleSave = async () => {
    // Validate check-out date is not before check-in date
    if (form.checkInDate && form.checkOutDate) {
      const checkInDate = new Date(form.checkInDate);
      const checkOutDate = new Date(form.checkOutDate);
      if (checkOutDate < checkInDate) {
        alert('Check-out date cannot be before check-in date');
        return;
      }
    }

    if (rentOrDepositChanged) {
      setRentChangeScope('period');
      setScopePromptOpen(true);
      return;
    }
    await doSave();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{!initial ? 'New Booking' : readOnly ? 'Booking Details' : 'Edit Booking'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Check-in date first — drives bed availability */}
          <Grid size={{ xs: 4 }}>
            <TextField label="Check-in *" type="date" value={form.checkInDate} onChange={e => { set('checkInDate', e.target.value); set('bedId', ''); }} fullWidth size="small" disabled={readOnly} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Contract End *" type="date" value={form.contractEndDate} onChange={e => set('contractEndDate', e.target.value)} fullWidth size="small" disabled={readOnly} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Check-out" type="date" value={form.checkOutDate} onChange={e => set('checkOutDate', e.target.value)} fullWidth size="small" disabled={readOnly} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>

          {/* Property filter (optional) — narrows the bed list below. */}
          {properties.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                options={sortedProperties}
                value={selectedProperty}
                // Clearing it means "all properties", which is what an empty id already is.
                onChange={(_e, value) => handlePropertyChange(value?.id ?? '')}
                getOptionLabel={p => propertyLabel(p)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={filterProperties}
                disabled={readOnly}
                autoHighlight
                fullWidth
                size="small"
                noOptionsText="No matching property"
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Property"
                    placeholder="All properties"
                    helperText="Type to search by code or address"
                  />
                )}
                renderOption={(props, p) => {
                  const { key, ...rest } = props as typeof props & { key: string };
                  return <li key={key} {...rest}>{propertyLabel(p)}</li>;
                }}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Bed *" value={form.bedId}
              onChange={e => {
                const bedId = e.target.value;
                // Pre-fill Rent/Deposit from the bed's default on a new booking — the fields
                // stay editable so a specific booking can still override them (e.g. a discount).
                const bed = !initial ? beds.find(b => b.id === bedId) : undefined;
                setForm(f => ({
                  ...f,
                  bedId,
                  ...(bed ? { rentAmount: bed.rentAmount, depositAmount: bed.depositAmount } : {}),
                }));
              }}
              fullWidth required size="small" disabled={readOnly}
              helperText={!form.checkInDate ? 'Enter check-in date first to see available beds' : `${availableBeds.length} bed(s) available on ${form.checkInDate}`}
            >
              {availableBeds.map(b => (
                <MenuItem key={b.id} value={b.id}>
                  {bedCode(b)} ({b.bedroomType}){b.status === 'allocated' ? ' — frees on check-in' : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              options={sortedResidents}
              value={selectedResident}
              onChange={(_e, value) => set('residentId', value?.id ?? '')}
              getOptionLabel={r => residentLabel(r)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={filterResidents}
              disabled={readOnly}
              autoHighlight
              fullWidth
              size="small"
              noOptionsText="No matching resident"
              renderInput={params => (
                <TextField
                  {...params}
                  label="Resident *"
                  required
                  // `required` alone wouldn't flag an emptied Autocomplete, since the text
                  // input isn't the value — the Save button is still the real guard.
                  error={!form.residentId}
                  helperText={
                    !form.residentId
                      ? 'Type to search by name or email'
                      // The API only returns active residents, so a booking whose resident was
                      // since deactivated shows a blank field. Say so, rather than letting it
                      // look like the booking lost its resident.
                      : missingResident
                        ? 'This booking\u2019s resident is no longer active. Leave as is to keep them, or pick another.'
                        : ' '
                  }
                />
              )}
              renderOption={(props, r) => {
                const { key, ...rest } = props as typeof props & { key: string };
                return (
                  <li key={key} {...rest}>
                    {residentLabel(r)}
                  </li>
                );
              }}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField select label="Status" value={form.status} onChange={e => set('status', e.target.value)} fullWidth required size="small" disabled={readOnly}>
              {(['active', 'upcoming', 'completed'] as const).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Rent (€)" type="number" value={form.rentAmount} onChange={e => set('rentAmount', +e.target.value)} fullWidth size="small" disabled={readOnly} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField label="Deposit (€)" type="number" value={form.depositAmount} onChange={e => set('depositAmount', +e.target.value)} fullWidth size="small" disabled={readOnly} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Comments" value={form.comments} onChange={e => set('comments', e.target.value)} fullWidth size="small" disabled={readOnly} multiline rows={2} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.isHeadResident} onChange={e => set('isHeadResident', e.target.checked)} disabled={readOnly} />}
              label="Head resident"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.isTemporary} onChange={e => set('isTemporary', e.target.checked)} disabled={readOnly} />}
              label="Temporary / upcoming"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
        {!readOnly && (
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.bedId || !form.residentId || !form.checkInDate || !form.contractEndDate}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </DialogActions>

      <Dialog open={scopePromptOpen} onClose={() => setScopePromptOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Apply rent/deposit change to…</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            You changed the rent or deposit for this booking. How should it apply?
          </DialogContentText>
          <FormControl>
            <FormLabel id="rent-change-scope-label" sx={{ display: 'none' }}>Scope</FormLabel>
            <RadioGroup
              aria-labelledby="rent-change-scope-label"
              value={rentChangeScope}
              onChange={e => setRentChangeScope(e.target.value as RentChangeScope)}
            >
              <FormControlLabel value="payment" control={<Radio />} label="Just this next payment" />
              <FormControlLabel value="period" control={<Radio />} label="All payments within this booking period" />
              <FormControlLabel value="bed" control={<Radio />} label="This, and set as the new bed price going forward" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScopePromptOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={() => doSave(rentChangeScope)}>
            {saving ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
