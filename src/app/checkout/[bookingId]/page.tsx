'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress, Divider,
  FormControlLabel, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  getBookings, checkout,
  Booking, RoomConditionChecklistItem, RoomConditionRating, ROOM_CONDITION_CATEGORIES,
} from '@/services/api';
import { bedCode } from '@/lib/bedCode';

function emptyChecklist(): RoomConditionChecklistItem[] {
  return ROOM_CONDITION_CATEGORIES.map((category) => ({ category, condition: 'good' as RoomConditionRating, notes: null }));
}

const CONDITION_OPTIONS: { value: RoomConditionRating; label: string; color: 'success' | 'warning' | 'error' }[] = [
  { value: 'good', label: 'Good', color: 'success' },
  { value: 'fair', label: 'Fair', color: 'warning' },
  { value: 'damaged', label: 'Damaged', color: 'error' },
];

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [checkoutDate, setCheckoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [keysReturned, setKeysReturned] = useState(false);
  const [checklist, setChecklist] = useState<RoomConditionChecklistItem[]>(emptyChecklist());
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [depositRefundAmount, setDepositRefundAmount] = useState('');
  const [refundIban, setRefundIban] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([getBookings('active'), getBookings('upcoming')])
      .then(([active, upcoming]) => {
        const found = [...active, ...upcoming].find((b) => b.id === bookingId);
        if (!found) {
          setLoadError('Booking not found, or it is not currently active.');
          return;
        }
        setBooking(found);
        setDepositRefundAmount(found.depositAmount ? String(found.depositAmount) : '');
      })
      .catch(() => setLoadError('Failed to load booking details.'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const updateItem = (category: string, patch: Partial<RoomConditionChecklistItem>) => {
    setChecklist((items) => items.map((it) => (it.category === category ? { ...it, ...patch } : it)));
  };

  const canSubmit = useMemo(() => !!booking && !!checkoutDate && !submitting, [booking, checkoutDate, submitting]);

  const handleSubmit = async () => {
    if (!booking) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await checkout({
        bookingId: booking.id,
        checkoutDate,
        keysReturned,
        inspectionNotes: inspectionNotes.trim() || null,
        roomConditionChecklist: checklist,
        depositRefundAmount: depositRefundAmount ? Number(depositRefundAmount) : null,
        refundIban: refundIban.trim() || null,
        residentId: booking.residentId,
        residentName: booking.resident?.fullName,
        propertyId: booking.bed?.propertyId,
        bedId: booking.bedId,
      });
      setDone(true);
    } catch {
      setSubmitError('Failed to complete check-out. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error" sx={{ mt: 3 }}>{loadError}</Alert>
        <Button startIcon={<ArrowBackIcon />} sx={{ mt: 2 }} onClick={() => router.push('/bookings')}>Back to Bookings</Button>
      </Box>
    );
  }

  if (done) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Alert severity="success" sx={{ mt: 3 }}>
          Check-out completed. {depositRefundAmount && Number(depositRefundAmount) > 0
            ? 'A deposit refund has been queued for Finance/Administration.'
            : ''}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} sx={{ mt: 2 }} onClick={() => router.push('/bookings')}>Back to Bookings</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/bookings')} sx={{ mb: 2 }}>
        Back to Bookings
      </Button>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Check Out</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {booking?.resident?.fullName ?? '—'} · {booking?.bed ? bedCode(booking.bed) : '—'}
      </Typography>

      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Check-out Details</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Check-out Date" type="date" value={checkoutDate}
              onChange={(e) => setCheckoutDate(e.target.value)}
              fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControlLabel
              control={<Checkbox checked={keysReturned} onChange={(e) => setKeysReturned(e.target.checked)} />}
              label="Keys returned"
            />
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Exit Inspection Checklist</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {checklist.map((item, idx) => (
              <Box key={item.category}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{item.category}</Typography>
                <ToggleButtonGroup
                  value={item.condition} exclusive size="small" fullWidth
                  onChange={(_, v) => v && updateItem(item.category, { condition: v })}
                  sx={{ mb: 1 }}
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <ToggleButton key={opt.value} value={opt.value} sx={{ py: 1 }}>{opt.label}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <TextField
                  placeholder="Notes (optional)" value={item.notes ?? ''}
                  onChange={(e) => updateItem(item.category, { notes: e.target.value || null })}
                  fullWidth size="small"
                />
                {idx < checklist.length - 1 && <Divider sx={{ mt: 2.5 }} />}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>Deposit Refund</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Leave the amount blank or zero if no refund is due.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Refund Amount (€)" type="number" value={depositRefundAmount}
              onChange={(e) => setDepositRefundAmount(e.target.value)}
              fullWidth size="small"
            />
            <TextField
              label="Refund IBAN" value={refundIban}
              onChange={(e) => setRefundIban(e.target.value)}
              fullWidth size="small" placeholder="IE29AIBK93115212345678"
            />
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Additional Notes</Typography>
          <TextField
            value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)}
            fullWidth size="small" multiline rows={3} placeholder="Any other observations…"
          />
        </CardContent>
      </Card>

      <Button
        variant="contained" size="large" fullWidth
        disabled={!canSubmit}
        onClick={handleSubmit}
        sx={{ py: 1.5, borderRadius: 2, fontSize: 16 }}
      >
        {submitting ? 'Completing check-out…' : 'Complete Check-out'}
      </Button>
    </Box>
  );
}
