'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, Chip, IconButton, TextField, InputAdornment, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getKeyLogs, createKeyLog, updateKeyLog, deleteKeyLog, KeyLog } from '@/services/api';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import KeyLogDialog from '@/components/crud/KeyLogDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

export default function KeyLogsPage() {
  const { can } = useRole();
  const [items, setItems] = useState<KeyLog[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KeyLog | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => getKeyLogs().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const columns: GridColDef[] = [
    { field: 'keyType', headerName: 'Key Type', width: 110 },
    { field: 'takenBy', headerName: 'Taken By', minWidth: 160, flex: 1 },
    { field: 'takenByType', headerName: 'Type', width: 100 },
    { field: 'takenAt', headerName: 'Taken At', width: 160, valueFormatter: (v) => v ? new Date(v as string).toLocaleString() : '' },
    { field: 'expectedReturnAt', headerName: 'Expected Return', width: 140 },
    { field: 'returnStatus', headerName: 'Status', width: 100,
      renderCell: (p) => <Chip label={p.value} color={p.value === 'returned' ? 'success' : 'warning'} size="small" /> },
    {
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => (
        <Box>
          {can('keyLog:write') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
          {can('keyLog:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
        </Box>
      ),
    },
  ];

  const q = search.toLowerCase();
  const filtered = items.filter(i =>
    (!statusFilter || i.returnStatus === statusFilter) &&
    [i.takenBy, i.keyType].some(v => v?.toLowerCase().includes(q))
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Key Log</Typography>
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ width: 120 }}>
          {['', 'out', 'returned'].map(s => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
        </TextField>
        {can('keyLog:write') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>Log Key</Button>}
      </Box>
      <DataGrid rows={filtered} columns={columns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ footer: CustomGridFooter }}
        slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />
      <KeyLogDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)}
        onSave={async (data, id) => { if (id) await updateKeyLog(id, data); else await createKeyLog(data); await load(); }} />
      <ConfirmDialog open={!!deleteId} title="Delete Key Log" message="This action cannot be undone."
        onConfirm={async () => { await deleteKeyLog(deleteId!); setDeleteId(null); await load(); }} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
