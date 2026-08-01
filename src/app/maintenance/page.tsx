'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, Chip, IconButton, TextField, InputAdornment, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getMaintenanceTickets, createMaintenanceTicket, updateMaintenanceTicket, deleteMaintenanceTicket, MaintenanceTicket } from '@/services/api';
import MaintenanceTicketDialog from '@/components/crud/MaintenanceTicketDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

const statusColor: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  open: 'warning', in_progress: 'info', completed: 'success', cancelled: 'error',
};
const urgencyColor: Record<string, 'default' | 'warning' | 'error'> = {
  Low: 'default', Middle: 'warning', High: 'error',
};

export default function MaintenancePage() {
  const { can } = useRole();
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceTicket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => getMaintenanceTickets().then(setTickets).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async (data: Omit<MaintenanceTicket, 'id' | 'orderNumber'>, id?: string) => {
    if (id) await updateMaintenanceTicket(id, data); else await createMaintenanceTicket(data);
    await load();
  };

  const handleStatusChange = async (ticket: MaintenanceTicket, newStatus: string) => {
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus as MaintenanceTicket['status'] } : t));
    await updateMaintenanceTicket(ticket.id, { ...ticket, status: newStatus as MaintenanceTicket['status'] });
  };

  const handleUrgencyChange = async (ticket: MaintenanceTicket, newUrgency: string) => {
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, urgency: newUrgency } : t));
    await updateMaintenanceTicket(ticket.id, { ...ticket, urgency: newUrgency });
  };

  const columns: GridColDef[] = [
    { field: 'orderNumber', headerName: 'Order #', width: 100 },
    { field: 'title', headerName: 'Title', minWidth: 200, flex: 1 },
    {
      field: 'urgency', headerName: 'Urgency', width: 140,
      renderCell: (p) => can('property:write') ? (
        <Select
          value={p.value as string}
          onChange={(e: SelectChangeEvent) => handleUrgencyChange(p.row as MaintenanceTicket, e.target.value)}
          size="small"
          variant="outlined"
          onClick={ev => ev.stopPropagation()}
          sx={{ fontSize: 13, height: 28, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
          renderValue={(v) => <Chip label={v} color={urgencyColor[v] ?? 'default'} size="small" sx={{ pointerEvents: 'none' }} />}
        >
          {['Low', 'Middle', 'High'].map(u => (
            <MenuItem key={u} value={u}><Chip label={u} color={urgencyColor[u] ?? 'default'} size="small" /></MenuItem>
          ))}
        </Select>
      ) : <Chip label={p.value} color={urgencyColor[p.value as string] ?? 'default'} size="small" />,
    },
    {
      field: 'status', headerName: 'Status', width: 160,
      renderCell: (p) => can('property:write') ? (
        <Select
          value={p.value as string}
          onChange={(e: SelectChangeEvent) => handleStatusChange(p.row as MaintenanceTicket, e.target.value)}
          size="small"
          variant="outlined"
          onClick={ev => ev.stopPropagation()}
          sx={{ fontSize: 13, height: 28, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
          renderValue={(v) => <Chip label={v} color={statusColor[v] ?? 'default'} size="small" sx={{ pointerEvents: 'none' }} />}
        >
          {['open', 'in_progress', 'completed', 'cancelled'].map(s => (
            <MenuItem key={s} value={s}><Chip label={s} color={statusColor[s] ?? 'default'} size="small" /></MenuItem>
          ))}
        </Select>
      ) : <Chip label={p.value} color={statusColor[p.value as string] ?? 'default'} size="small" />,
    },
    { field: 'clientName', headerName: 'Client', width: 150 },
    { field: 'totalCost', headerName: 'Total (€)', width: 100, type: 'number' },
    {
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => (
        <Box>
          {can('property:write') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
          {can('property:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
        </Box>
      ),
    },
  ];

  const q = search.toLowerCase();
  const filtered = tickets.filter(t =>
    (!statusFilter || t.status === statusFilter) &&
    [t.title, t.orderNumber, t.clientName].some(v => v?.toLowerCase().includes(q))
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Maintenance Tickets</Typography>
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ width: 140 }}>
          {['', 'open', 'in_progress', 'completed', 'cancelled'].map(s => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
        </TextField>
        {can('property:write') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>New Ticket</Button>}
      </Box>
      <DataGrid rows={filtered} columns={columns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />
      <MaintenanceTicketDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={handleSave} />
      <ConfirmDialog open={!!deleteId} title="Delete Ticket" message="This action cannot be undone."
        onConfirm={async () => { await deleteMaintenanceTicket(deleteId!); setDeleteId(null); await load(); }} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
