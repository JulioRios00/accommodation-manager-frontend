'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import { Bed, Bedroom, Property } from '@/services/api';
import { bedCode } from '@/lib/bedCode';

type FormState = Omit<Bed, 'id' | 'propertyCode' | 'activeBooking'>;

const empty: FormState = {
  propertyId: '', bedNumber: 1, bedroomId: null, bedroomName: null, name: null,
  position: null, status: 'vacant', bedroomType: '', sex: '', bedSize: '',
  depositAmount: 0, rentAmount: 0,
};

/**
 * A Select whose value is missing from its options renders blank, and saving that blank
 * writes it over the real value. Two things put values outside these lists: a property
 * that is out of lease (the list only carries lettable ones unless asked otherwise), and
 * the imported sheet's own vocabulary ("Twin Stnd", "Bnk - Top"), which predates the
 * tidy options below. Keeping the current value as an option shows what the bed actually
 * is instead of silently emptying the field.
 */
const propertyLabel = (p: Property) => {
  const where = p.fullAddress ?? p.area;
  return `${p.code}${where ? ` — ${where}` : ''}${p.active === false ? ' (out of lease)' : ''}`;
};

const withCurrent = (options: string[], current?: string | null) =>
  current && !options.includes(current) ? [...options, current] : options;

interface Props {
  open: boolean;
  initial?: Bed | null;
  properties: Property[];
  bedrooms: Bedroom[];
  defaultValues?: { propertyId?: string; bedroomId?: string };
  onClose: () => void;
  onSave: (data: FormState, id?: string) => Promise<void>;
}

export default function BedDialog({ open, initial, properties, bedrooms, defaultValues, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        propertyId: initial.propertyId,
        bedNumber: initial.bedNumber,
        bedroomId: initial.bedroomId,
        bedroomName: null,
        name: initial.name,
        position: initial.position,
        status: initial.status,
        bedroomType: initial.bedroomType,
        sex: initial.sex,
        bedSize: initial.bedSize,
        depositAmount: initial.depositAmount,
        rentAmount: initial.rentAmount,
      });
    } else {
      setForm({
        ...empty,
        propertyId: defaultValues?.propertyId ?? '',
        bedroomId: defaultValues?.bedroomId ?? null,
      });
    }
  }, [initial, open, defaultValues]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  // Straight character-by-character order on the code: 01, 02, 03, then 0A, 0B. Codes are
  // inconsistently padded ("1CTB" alongside "01TD"), and reading them as numbers made 1
  // and 01 equal, so those interleaved unpredictably. Literal order keeps each padding
  // style in its own block, which is what the list looks like to someone scanning it.
  const sortedProperties = useMemo(
    () => [...properties].sort((a, b) => a.code.localeCompare(b.code, undefined, { sensitivity: 'base' })),
    [properties],
  );

  // The picker has a few hundred entries, so it is a search box rather than a plain list.
  // A bed whose property somehow isn't in the list still needs one, or the Autocomplete
  // would show empty and the save would drop the property.
  const propertyOptions = useMemo(() => {
    if (!initial || sortedProperties.some(p => p.id === initial.propertyId)) return sortedProperties;
    return [
      { id: initial.propertyId, code: initial.propertyCode ?? 'Current property' } as Property,
      ...sortedProperties,
    ];
  }, [sortedProperties, initial]);

  const selectedProperty = propertyOptions.find(p => p.id === form.propertyId) ?? null;

  const filteredBedrooms = bedrooms
    .filter(b => b.propertyId === form.propertyId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

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
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <span>{initial ? 'Edit Bed' : 'New Bed'}</span>
            {/* The same code the grid row shows, so there is no doubt which bed this is. */}
            {initial && (
              <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
                {bedCode(initial)}
              </Box>
            )}
          </Box>
          {initial && (
            <Chip
              label={
                initial.status === 'allocated' ? 'Allocated'
                  : initial.status === 'inactive' ? 'Inactive'
                    : 'Vacant'
              }
              size="small"
              sx={{
                // Grey, not green: an inactive bed is not available, so it must not read
                // as one. Matches the chip on the Beds grid.
                bgcolor:
                  initial.status === 'allocated' ? '#DE9151'
                    : initial.status === 'inactive' ? '#9e9e9e'
                      : '#4caf50',
                color: 'white',
                fontWeight: 600,
              }}
            />
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 8 }}>
            <Autocomplete
              options={propertyOptions}
              value={selectedProperty}
              onChange={(_e, p) => { set('propertyId', p?.id ?? ''); set('bedroomId', null); }}
              getOptionLabel={propertyLabel}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              // Matches on code and on address, so "lucan" finds the house and "15SEG"
              // finds it by code — whichever the user happens to know.
              filterOptions={(opts, { inputValue }) => {
                const q = inputValue.trim().toLowerCase();
                if (!q) return opts;
                return opts.filter(p => propertyLabel(p).toLowerCase().includes(q));
              }}
              size="small"
              fullWidth
              autoHighlight
              openOnFocus
              renderOption={(props, p) => (
                <Box component="li" {...props} key={p.id} sx={{ fontSize: 14 }}>
                  {propertyLabel(p)}
                </Box>
              )}
              renderInput={params => (
                <TextField {...params} label="Property" required placeholder="Search by code or address" />
              )}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="Bed #" type="number" value={form.bedNumber}
              onChange={e => set('bedNumber', +e.target.value)}
              fullWidth required size="small"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Bedroom" value={form.bedroomId ?? ''}
              onChange={e => set('bedroomId', e.target.value || null)}
              fullWidth size="small"
              disabled={!form.propertyId}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {filteredBedrooms.map(b => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 8 }}>
            <TextField
              label="Location / Layout Name" value={form.name ?? ''}
              onChange={e => set('name', e.target.value || null)}
              fullWidth size="small"
              placeholder="e.g. Bed A, Lower Bunk"
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="Position" type="number" value={form.position ?? ''}
              onChange={e => set('position', e.target.value ? +e.target.value : null)}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Room Type" value={form.bedroomType}
              onChange={e => set('bedroomType', e.target.value)}
              fullWidth required size="small"
            >
              {withCurrent(['Single', 'Twin', 'Triple', 'Twin Studio', 'Studio'], form.bedroomType).map(v => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select label="Sex" value={form.sex}
              onChange={e => set('sex', e.target.value)}
              fullWidth required size="small"
            >
              {withCurrent(['M', 'F', 'Mixed'], form.sex).map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              select label="Bed Size" value={form.bedSize}
              onChange={e => set('bedSize', e.target.value)}
              fullWidth required size="small"
            >
              {withCurrent(['Single', 'Double'], form.bedSize).map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Rent (€)" type="number" value={form.rentAmount}
              onChange={e => set('rentAmount', +e.target.value)}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Deposit (€)" type="number" value={form.depositAmount}
              onChange={e => set('depositAmount', +e.target.value)}
              fullWidth size="small"
            />
          </Grid>
          {initial && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">
                Status is managed automatically (vacant ↔ allocated via bookings). Use the
                block button on the Beds list to take this bed out of lettable stock.
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave} variant="contained"
          disabled={saving || !form.propertyId || !form.bedroomType || !form.sex || !form.bedSize}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
