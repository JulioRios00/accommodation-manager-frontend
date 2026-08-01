'use client';
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  MenuItem, TextField, Typography,
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { getPortalProfile, submitResidentTicket, PortalProfile } from '@/services/api';

const CATEGORIES = [
  { value: 'plumbing',   label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'internet',   label: 'Internet / Broadband' },
  { value: 'other',      label: 'Other' },
];

type FormState = { category: string; title: string; description: string };
const emptyForm: FormState = { category: 'plumbing', title: '', description: '' };

export default function PortalPage() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getPortalProfile()
      .then(setProfile)
      .catch(() => setError('Unable to load your profile. Please contact your housing manager.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await submitResidentTicket({
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim() || null,
      });
      setSubmitted(true);
      setFormOpen(false);
      setForm(emptyForm);
    } catch {
      setError('Failed to submit your request. Please try again.');
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

  if (error && !profile) {
    return <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>;
  }

  const { resident, booking } = profile!;

  return (
    <Box sx={{ pt: 2, pb: 6 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        Hello, {resident.fullName.split(' ')[0]}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Resident portal
      </Typography>

      {/* Active agreement summary */}
      {booking ? (
        <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ pb: '12px !important' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Current Agreement
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
              {booking.property?.fullAddress ?? booking.property?.code ?? '—'}
            </Typography>
            {booking.bed && (
              <Typography variant="body2" color="text.secondary">
                Bed {booking.bed.bedNumber} · {booking.bed.bedroomType}
              </Typography>
            )}
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`Rent: €${booking.rentAmount}/mo`} size="small" />
              {booking.contractEndDate && (
                <Chip
                  label={`Until: ${new Date(booking.contractEndDate).toLocaleDateString('en-GB')}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No active licence agreement found. Contact your housing manager.
        </Alert>
      )}

      {/* Success banner */}
      {submitted && (
        <Alert severity="success" onClose={() => setSubmitted(false)} sx={{ mb: 3 }}>
          Your maintenance request has been submitted. The team will be in touch.
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>
      )}

      {/* Raise ticket CTA / form */}
      {booking && !formOpen && (
        <Button
          variant="contained"
          size="large"
          startIcon={<ReportProblemIcon />}
          fullWidth
          onClick={() => setFormOpen(true)}
          sx={{ py: 1.5, borderRadius: 2, fontSize: 16 }}
        >
          Raise a Ticket
        </Button>
      )}

      {formOpen && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              New Maintenance Request
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select label="Category" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                fullWidth size="small"
              >
                {CATEGORIES.map(c => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Short description of the issue"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                fullWidth size="small" required
                placeholder="e.g. Kitchen tap is dripping"
              />
              <TextField
                label="Additional details (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                fullWidth size="small" multiline rows={3}
                placeholder="When did it start? Any other relevant information?"
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined" fullWidth
                  onClick={() => { setFormOpen(false); setForm(emptyForm); }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained" fullWidth
                  onClick={handleSubmit}
                  disabled={submitting || !form.title.trim()}
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
