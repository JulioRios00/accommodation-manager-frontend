'use client';
import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, IconButton, InputAdornment, MenuItem,
  Paper, Select, SelectChangeEvent, Tab, Tabs, TextField, Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  getMaintenanceTickets, getMaintenanceQueue,
  createMaintenanceTicket, updateMaintenanceTicket, deleteMaintenanceTicket,
  claimMaintenanceTicket,
  MaintenanceTicket,
} from '@/services/api';
import MaintenanceTicketDialog from '@/components/crud/MaintenanceTicketDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

// ── Display maps ────────────────────────────────────────────────────────────
const URGENCY_LABEL: Record<string, string> = {
  Low: 'Routine', Middle: 'Urgent', High: 'Emergency',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

// Urgency chip: Routine=ORANGE, Urgent=RED, Emergency=DARK RED
function UrgencyChip({ urgency, size = 'small' }: { urgency: string; size?: 'small' | 'medium' }) {
  const label = URGENCY_LABEL[urgency] ?? urgency;
  const sx =
    urgency === 'High'
      ? { bgcolor: '#7b0000', color: 'white', fontWeight: 700 }
      : urgency === 'Middle'
      ? { bgcolor: '#d32f2f', color: 'white', fontWeight: 700 }
      : { bgcolor: '#ef6c00', color: 'white', fontWeight: 700 };
  return <Chip label={label} size={size} sx={sx} />;
}

// Status chip
function StatusChip({ status, size = 'small' }: { status: string; size?: 'small' | 'medium' }) {
  const label = STATUS_LABEL[status] ?? status;
  const sx: Record<string, object> = {
    open: { bgcolor: '#d32f2f', color: 'white', fontWeight: 700 },
    in_progress: { bgcolor: '#ef6c00', color: 'white', fontWeight: 700 },
    completed: { bgcolor: '#2e7d32', color: 'white', fontWeight: 700 },
    cancelled: { bgcolor: '#9e9e9e', color: 'white', fontWeight: 700 },
  };
  return <Chip label={label} size={size} sx={sx[status] ?? { fontWeight: 700 }} />;
}

// ── Due date helpers ─────────────────────────────────────────────────────────
const URGENCY_DAYS: Record<string, number> = { High: 1, Middle: 7, Low: 21 };

function dueDate(ticket: MaintenanceTicket): Date | null {
  if (!ticket.createdAt) return null;
  const days = URGENCY_DAYS[ticket.urgency];
  if (days === undefined) return null;
  const d = new Date(ticket.createdAt);
  d.setDate(d.getDate() + days);
  return d;
}

function daysLeft(ticket: MaintenanceTicket): number | null {
  const due = dueDate(ticket);
  if (!due) return null;
  return Math.ceil((due.getTime() - Date.now()) / 86400000);
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

// Effective urgency for FCFS sorting: Routine auto-upgrades to Urgent when ≤7 days to due
function effectiveUrgencyPriority(ticket: MaintenanceTicket): number {
  // Higher = more urgent (sorted first)
  if (ticket.urgency === 'High') return 3;
  if (ticket.urgency === 'Middle') return 2;
  // Low (Routine): auto-upgrade if due within 7 days
  const dl = daysLeft(ticket);
  if (dl !== null && dl <= 7) return 2;
  return 1;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MaintenancePage() {
  const { can } = useRole();
  const [tab, setTab] = useState(0);

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [queue, setQueue] = useState<MaintenanceTicket[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceTicket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadAll = () => getMaintenanceTickets().then(setTickets).catch(() => {});
  const loadQueue = () => {
    setQueueLoading(true);
    getMaintenanceQueue()
      .then(data => {
        // Smart FCFS: Emergency first, then Urgent (+ auto-upgraded Routine), then Routine; within same level by submission date
        const sorted = [...data].sort((a, b) => {
          const pa = effectiveUrgencyPriority(a);
          const pb = effectiveUrgencyPriority(b);
          if (pb !== pa) return pb - pa;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        setQueue(sorted);
      })
      .catch(() => {})
      .finally(() => setQueueLoading(false));
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (tab === 1) loadQueue(); }, [tab]);

  const refresh = () => { loadAll(); if (tab === 1) loadQueue(); };

  const handleSave = async (data: Omit<MaintenanceTicket, 'id' | 'orderNumber' | 'createdAt'>, id?: string) => {
    if (id) await updateMaintenanceTicket(id, data);
    else await createMaintenanceTicket(data);
    await loadAll();
  };

  const handleStatusChange = async (ticket: MaintenanceTicket, newStatus: string) => {
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus as MaintenanceTicket['status'] } : t));
    await updateMaintenanceTicket(ticket.id, { ...ticket, status: newStatus as MaintenanceTicket['status'] });
  };

  const handleUrgencyChange = async (ticket: MaintenanceTicket, newUrgency: string) => {
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, urgency: newUrgency } : t));
    await updateMaintenanceTicket(ticket.id, { ...ticket, urgency: newUrgency });
  };

  const handleQuickClaim = async (ticket: MaintenanceTicket) => {
    setClaiming(ticket.id);
    try {
      await claimMaintenanceTicket(ticket.id);
      loadQueue();
      loadAll();
    } catch { } finally { setClaiming(null); }
  };

  const openDetail = (ticket: MaintenanceTicket) => {
    setEditing(ticket);
    setDialogOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'orderNumber', headerName: 'Order #', width: 100 },
    { field: 'title', headerName: 'Title', minWidth: 200, flex: 1 },
    {
      field: 'urgency', headerName: 'Urgency', width: 150,
      renderCell: (p) => can('property:write') ? (
        <Select
          value={p.value as string}
          onChange={(e: SelectChangeEvent) => handleUrgencyChange(p.row as MaintenanceTicket, e.target.value)}
          size="small" variant="outlined"
          onClick={ev => ev.stopPropagation()}
          sx={{ fontSize: 13, height: 28, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
          renderValue={(v) => <UrgencyChip urgency={v} />}
        >
          {['Low', 'Middle', 'High'].map(u => (
            <MenuItem key={u} value={u}><UrgencyChip urgency={u} /></MenuItem>
          ))}
        </Select>
      ) : <UrgencyChip urgency={p.value as string} />,
    },
    {
      field: 'status', headerName: 'Status', width: 160,
      renderCell: (p) => can('property:write') ? (
        <Select
          value={p.value as string}
          onChange={(e: SelectChangeEvent) => handleStatusChange(p.row as MaintenanceTicket, e.target.value)}
          size="small" variant="outlined"
          onClick={ev => ev.stopPropagation()}
          sx={{ fontSize: 13, height: 28, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
          renderValue={(v) => <StatusChip status={v} />}
        >
          {['open', 'in_progress', 'completed', 'cancelled'].map(s => (
            <MenuItem key={s} value={s}><StatusChip status={s} /></MenuItem>
          ))}
        </Select>
      ) : <StatusChip status={p.value as string} />,
    },
    {
      field: 'createdAt', headerName: 'Submitted', width: 105,
      renderCell: p => <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}><Typography variant="body2">{formatDate(p.value as string)}</Typography></Box>,
    },
    {
      field: '_dueDate', headerName: 'Due Date', width: 105,
      sortable: false,
      renderCell: p => {
        const due = dueDate(p.row as MaintenanceTicket);
        return <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}><Typography variant="body2">{due ? formatDate(due) : '—'}</Typography></Box>;
      },
    },
    {
      field: '_daysLeft', headerName: 'Days Left', width: 100,
      sortable: false,
      renderCell: p => {
        const ticket = p.row as MaintenanceTicket;
        if (ticket.status === 'completed' || ticket.status === 'cancelled') return '—';
        const dl = daysLeft(ticket);
        if (dl === null) return '—';
        if (dl < 0) return <Chip label="Overdue" size="small" sx={{ bgcolor: '#7b0000', color: 'white', fontWeight: 700 }} />;
        if (dl === 0) return <Chip label="Today" size="small" sx={{ bgcolor: '#d32f2f', color: 'white', fontWeight: 700 }} />;
        if (dl <= 3) return <Chip label={`${dl}d`} size="small" sx={{ bgcolor: '#ef6c00', color: 'white', fontWeight: 700 }} />;
        return <Typography variant="body2">{dl}d</Typography>;
      },
    },
    { field: 'clientName', headerName: 'Client', width: 140 },
    { field: 'totalCost', headerName: 'Total (€)', width: 100, type: 'number' },
    {
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => (
        <Box>
          {can('property:write') && (
            <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {can('property:write') && (
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Maintenance Tickets</Typography>
        {can('property:write') && tab === 0 && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            New Ticket
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="All Tickets" />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              FCFS Queue
              {queue.length > 0 && (
                <Chip label={queue.length} size="small" color="warning" sx={{ height: 18, fontSize: 11 }} />
              )}
            </Box>
          }
        />
      </Tabs>

      {/* ── Tab 0: All Tickets ── */}
      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />
            <TextField select size="small" label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ width: 160 }}>
              <MenuItem value="">All</MenuItem>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </TextField>
          </Box>
          <DataGrid
            rows={filtered} columns={columns} getRowId={r => r.id}
            autoHeight disableRowSelectionOnClick
            pageSizeOptions={[25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6' },
              '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
              '& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer > button:has(.MuiDataGrid-sortIcon)': { display: 'none' },
            }}
          />
        </>
      )}

      {/* ── Tab 1: FCFS Queue (smart sort) ── */}
      {tab === 1 && (
        <Box>
          {queueLoading ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>Loading queue…</Typography>
          ) : queue.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary">No open tickets in the queue.</Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {queue.map((ticket, idx) => {
                const ep = effectiveUrgencyPriority(ticket);
                const isAutoUpgraded = ticket.urgency === 'Low' && ep === 2;
                const dl = daysLeft(ticket);
                return (
                  <Paper
                    key={ticket.id}
                    variant="outlined"
                    sx={{
                      p: 2, borderRadius: 2, borderLeft: 4,
                      borderLeftColor: idx === 0 ? '#DE9151' : 'divider',
                      bgcolor: idx === 0 ? '#FFF9F3' : 'background.paper',
                      cursor: 'pointer', '&:hover': { bgcolor: '#FFF0E6' },
                    }}
                    onClick={() => openDetail(ticket)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary', minWidth: 70 }}>
                        #{idx + 1} {ticket.orderNumber}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>{ticket.title}</Typography>
                      {ticket.category && (
                        <Chip label={ticket.category} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                      )}
                      <UrgencyChip urgency={ticket.urgency} />
                      {isAutoUpgraded && (
                        <Chip label="⬆ auto-upgraded" size="small" sx={{ bgcolor: '#ef6c00', color: 'white', fontSize: 10 }} />
                      )}
                      <StatusChip status={ticket.status} />
                      {dl !== null && dl >= 0 && (
                        <Typography variant="caption" color={dl <= 3 ? 'error' : 'text.secondary'} sx={{ minWidth: 50 }}>
                          {dl}d left
                        </Typography>
                      )}
                      {dl !== null && dl < 0 && (
                        <Chip label="Overdue" size="small" sx={{ bgcolor: '#7b0000', color: 'white', fontWeight: 700 }} />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                        {timeAgo(ticket.createdAt)}
                      </Typography>
                      {can('property:write') && ticket.status === 'open' && (
                        <Tooltip title="Claim this ticket — locks it to you">
                          <span>
                            <Button
                              size="small" variant="contained" color="warning"
                              startIcon={<LockIcon sx={{ fontSize: 14 }} />}
                              disabled={claiming === ticket.id}
                              onClick={e => { e.stopPropagation(); handleQuickClaim(ticket); }}
                              sx={{ fontSize: 12 }}
                            >
                              {claiming === ticket.id ? 'Claiming…' : 'Claim'}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                    {ticket.descriptionRequested && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {ticket.descriptionRequested.slice(0, 120)}{ticket.descriptionRequested.length > 120 ? '…' : ''}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      <MaintenanceTicketDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onRefresh={refresh}
      />
      <ConfirmDialog
        open={!!deleteId} title="Delete Ticket" message="This action cannot be undone."
        onConfirm={async () => { await deleteMaintenanceTicket(deleteId!); setDeleteId(null); await loadAll(); }}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
