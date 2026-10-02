'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Chip, Card, CardContent, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CustomGridFooter from '@/components/shared/CustomGridFooter';

interface ErrorLog {
  id: string;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  context: string;
  count: number;
  resolved: boolean;
  lastOccurred: string;
  userName: string | null;
  url: string | null;
  statusCode: number | null;
  notes: string | null;
}

export default function ErrorLogsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [search, setSearch] = useState('');
  const [showUnresolved, setShowUnresolved] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  useEffect(() => {
    loadErrors();
  }, [showUnresolved]);

  const loadErrors = async () => {
    try {
      const res = await fetch(`/error-logs?resolved=${!showUnresolved}`);
      const data = await res.json();
      setErrors(data.items || []);
    } catch (err) {
      console.error('Failed to load errors', err);
    }
  };

  const handleResolve = async () => {
    if (!selectedError) return;
    try {
      await fetch(`/error-logs/${selectedError.id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: resolveNotes }),
      });
      setResolveDialogOpen(false);
      setSelectedError(null);
      setResolveNotes('');
      await loadErrors();
    } catch (err) {
      console.error('Failed to resolve error', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/error-logs/${id}`, { method: 'DELETE' });
      await loadErrors();
    } catch (err) {
      console.error('Failed to delete error', err);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'severity',
      headerName: 'Severity',
      width: 100,
      renderCell: (p) => {
        const colors: Record<string, string> = { critical: '#d32f2f', error: '#f57c00', warning: '#fbc02d', info: '#1976d2' };
        return <Chip label={p.value} size="small" sx={{ bgcolor: colors[p.value], color: 'white' }} />;
      },
    },
    { field: 'message', headerName: 'Message', minWidth: 250, flex: 1 },
    { field: 'context', headerName: 'Context', width: 150 },
    { field: 'count', headerName: 'Occurrences', width: 100, type: 'number' },
    { field: 'userName', headerName: 'User', width: 120 },
    { field: 'url', headerName: 'URL', width: 200 },
    {
      field: 'resolved',
      headerName: 'Status',
      width: 100,
      renderCell: (p) => <Chip label={p.value ? 'Resolved' : 'Unresolved'} size="small" color={p.value ? 'success' : 'error'} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 120,
      sortable: false,
      renderCell: (p) => (
        <Box>
          {!p.row.resolved && (
            <IconButton size="small" onClick={() => { setSelectedError(p.row); setResolveDialogOpen(true); }}>
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Error Monitor</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField placeholder="Search errors..." size="small" value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 300 }} slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1 }} /> } }} />
        <Button variant={showUnresolved ? 'contained' : 'outlined'} onClick={() => setShowUnresolved(!showUnresolved)}>
          {showUnresolved ? 'Unresolved' : 'All'}
        </Button>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <DataGrid rows={errors} columns={columns} autoHeight disableRowSelectionOnClick pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [10, 25] } }} sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6' } }} />
      </Box>

      <Dialog open={resolveDialogOpen} onClose={() => setResolveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Error</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedError && (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>{selectedError.message}</strong>
              </Typography>
              <TextField label="Resolution Notes" value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} fullWidth multiline rows={3} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleResolve} variant="contained">Resolve</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
