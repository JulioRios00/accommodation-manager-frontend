'use client';
import { useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Paper, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useRole } from '@/hooks/useRole';
import {
  DatabaseTableCount, RESET_CONFIRMATION, getDatabaseContents, resetDatabase,
} from '@/services/api';

/** The three confirmations, in order. The request is only sent from the last one. */
const STEPS = ['Understand', 'See the cost', 'Type to confirm'] as const;

/**
 * The "apocalypse" button: empties every table in the database.
 *
 * There is no undo, so the action is spread over three deliberate confirmations rather
 * than one: what it does, what it will cost in actual records, and a phrase that has to
 * be typed by hand. Each one is a separate click on a separate screen, so muscle memory
 * from a dialog someone has dismissed before cannot carry them through.
 *
 * None of this is the security boundary — the API enforces the sysadmin role and the
 * confirmation phrase on its own, and would do so if this component did not exist.
 */
export default function ResetDatabaseButton({ onReset }: { onReset?: () => void }) {
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [phrase, setPhrase] = useState('');
  const [contents, setContents] = useState<{ tables: DatabaseTableCount[]; rowsTotal: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Not a security boundary — the API is. This only keeps it out of the way of everyone
  // who has no business seeing it.
  if (role !== 'sysadmin') return null;

  const close = () => {
    if (working) return;
    setOpen(false);
    // Reset the whole flow, so reopening always starts at the first confirmation rather
    // than wherever it was abandoned.
    setStep(0);
    setPhrase('');
  };

  const openDialog = () => {
    setOpen(true);
    setStep(0);
    setPhrase('');
    setResult(null);
  };

  /** Counts are fetched when the second step is reached — that step exists to show them. */
  const loadContents = async () => {
    setLoading(true);
    try {
      setContents(await getDatabaseContents());
    } catch {
      // The counts are a courtesy; losing them must not block someone who needs the reset.
      setContents(null);
    } finally {
      setLoading(false);
    }
  };

  const next = async () => {
    if (step === 0) {
      setStep(1);
      await loadContents();
      return;
    }
    if (step === 1) setStep(2);
  };

  const confirm = async () => {
    // Belt and braces: the button is disabled off the last step, but the call that
    // destroys the database should not depend on a disabled prop being right.
    if (step !== STEPS.length - 1 || phrase !== RESET_CONFIRMATION) return;
    setWorking(true);
    try {
      const res = await resetDatabase();
      setResult({ type: 'success', text: res.message });
      setOpen(false);
      setStep(0);
      setPhrase('');
      onReset?.();
    } catch {
      setResult({ type: 'error', text: 'The database was not reset. Nothing has been deleted — check your role and try again.' });
    } finally {
      setWorking(false);
    }
  };

  const nonEmpty = contents?.tables.filter(t => t.rows > 0) ?? [];

  return (
    <Box sx={{ mt: 4 }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: 'error.main' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <WarningAmberIcon sx={{ fontSize: 32, color: 'error.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main' }}>Reset Database</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Deletes every record in the system — properties, beds, residents, bookings, payments,
          deposits, tickets and the activity log — leaving the tables empty so the spreadsheets
          can be imported again from scratch. There is no undo. Sign-in accounts are held in
          Clerk and are not affected.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Button variant="outlined" color="error" onClick={openDialog}>
          Reset the database…
        </Button>
        {result && <Alert severity={result.type} sx={{ mt: 2 }}>{result.text}</Alert>}
      </Paper>

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700, pb: 1 }}>
          Reset database — step {step + 1} of {STEPS.length}
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            {STEPS.map(label => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {step === 0 && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                This deletes every record in the database and cannot be undone from inside the
                application. Recovering afterwards means a point-in-time restore of the Neon
                database.
              </Alert>
              <Typography variant="body2">
                Everything goes: properties, beds, bedrooms, residents, bookings, rent and
                landlord payments, deposits, maintenance tickets, key logs and the activity log.
                The tables stay in place and empty, ready to be imported into again.
              </Typography>
            </>
          )}

          {step === 1 && (
            <>
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Counting what would be deleted…</Typography>
                </Box>
              )}

              {!loading && contents && (
                <>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>{contents.rowsTotal.toLocaleString()}</strong> records across{' '}
                    <strong>{contents.tables.length}</strong> tables will be deleted:
                  </Typography>
                  {nonEmpty.length > 0 ? (
                    <TableContainer sx={{ maxHeight: 240, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Table</TableCell>
                            <TableCell align="right">Records</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {nonEmpty.map(t => (
                            <TableRow key={t.table}>
                              <TableCell>{t.table}</TableCell>
                              <TableCell align="right">{t.rows.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">The database is already empty. There is nothing to delete.</Alert>
                  )}
                </>
              )}

              {!loading && !contents && (
                <Alert severity="warning">
                  Could not read the current row counts, so this step cannot tell you what is
                  about to be deleted. The reset itself would still go ahead.
                </Alert>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                Last chance. The next click deletes
                {contents ? ` ${contents.rowsTotal.toLocaleString()} records` : ' every record'} and
                cannot be reversed.
              </Alert>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Type <strong>{RESET_CONFIRMATION}</strong> to confirm:
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={RESET_CONFIRMATION}
                autoComplete="off"
                disabled={working}
                autoFocus
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close} disabled={working}>Cancel</Button>
          {step < STEPS.length - 1 ? (
            <Button
              variant="outlined"
              color="error"
              onClick={next}
              // Nobody advances past the cost step until the cost has actually loaded.
              disabled={step === 1 && loading}
            >
              {step === 0 ? 'I understand, continue' : 'Continue'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              onClick={confirm}
              // Exact match, case included: an approximate phrase is an accident.
              disabled={phrase !== RESET_CONFIRMATION || working}
              startIcon={working ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {working ? 'Deleting…' : 'Delete everything'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
