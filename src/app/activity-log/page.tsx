'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, MenuItem, Button, Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getAuditLogs, getUsers, AuditLog, ClerkUser } from '@/services/api';

const ENTITY_TYPES = ['Booking', 'Resident', 'Property', 'Bed', 'RentPayment'];

const ACTION_COLOR: Record<string, 'success' | 'info' | 'error'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// clerkUserId -> "Clerk User ID", paymentDueDay -> "Payment Due Day", iban -> "IBAN"
function humanizeField(field: string): string {
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
  return spaced
    .split(' ')
    .map(word => (word === 'Id' ? 'ID' : word === 'Iban' ? 'IBAN' : word))
    .join(' ');
}

function changesSummary(log: AuditLog): string {
  if (!log.changes.length) return log.action === 'delete' ? 'Record deleted' : '—';
  return log.changes
    .map(c => `${humanizeField(c.field)}: ${formatValue(c.before)} → ${formatValue(c.after)}`)
    .join('; ');
}

const COLLAPSE_THRESHOLD = 4;

function ChangesList({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);

  if (!log.changes.length) {
    return <Typography variant="body2" color="text.secondary">{log.action === 'delete' ? 'Record deleted' : '—'}</Typography>;
  }

  const isLong = log.changes.length > COLLAPSE_THRESHOLD;
  const visible = expanded || !isLong ? log.changes : log.changes.slice(0, COLLAPSE_THRESHOLD);

  return (
    <Box sx={{ py: 0.75 }}>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {visible.map((c, i) => (
          <Box component="li" key={i} sx={{ fontSize: 13, lineHeight: 1.7 }}>
            <strong>{humanizeField(c.field)}:</strong>{' '}
            {log.action === 'create' ? (
              formatValue(c.after)
            ) : log.action === 'delete' ? (
              formatValue(c.before)
            ) : (
              <>{formatValue(c.before)} → {formatValue(c.after)}</>
            )}
          </Box>
        ))}
      </Box>
      {isLong && (
        <Button
          size="small"
          onClick={() => setExpanded(e => !e)}
          startIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          sx={{ ml: 1, py: 0, minHeight: 0, textTransform: 'none', fontSize: 12 }}
        >
          {expanded ? 'Show less' : `Show ${log.changes.length - COLLAPSE_THRESHOLD} more`}
        </Button>
      )}
    </Box>
  );
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const usersById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const search = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        userId: userId || undefined,
        entityType: entityType || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUsers().then(setUsers).catch(() => {});
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: GridColDef[] = [
    {
      field: 'createdAt', headerName: 'When', width: 170,
      valueGetter: (_v, row) => new Date((row as AuditLog).createdAt).toLocaleString(),
    },
    {
      field: 'user', headerName: 'User', width: 180,
      valueGetter: (_v, row) => usersById.get((row as AuditLog).userId)?.fullName ?? (row as AuditLog).userId,
    },
    { field: 'userRole', headerName: 'Role', width: 110 },
    {
      field: 'action', headerName: 'Action', width: 100,
      renderCell: (params) => (
        <Chip label={params.value as string} color={ACTION_COLOR[params.value as string] ?? 'default'} size="small" />
      ),
    },
    { field: 'entityType', headerName: 'Entity', width: 110 },
    { field: 'entityId', headerName: 'Entity ID', width: 130 },
    {
      field: 'changes', headerName: 'Changes', minWidth: 320, flex: 1,
      valueGetter: (_v, row) => changesSummary(row as AuditLog),
      renderCell: (params) => <ChangesList log={params.row as AuditLog} />,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Activity Log</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField select size="small" label="User" value={userId} onChange={e => setUserId(e.target.value)} sx={{ width: 180 }}>
            <MenuItem value="">All users</MenuItem>
            {users.map(u => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Entity" value={entityType} onChange={e => setEntityType(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="">All entities</MenuItem>
            {ENTITY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField
            size="small" label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            sx={{ width: 150 }} slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small" label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            sx={{ width: 150 }} slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" startIcon={<SearchIcon />} onClick={search} disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </Button>
        </Box>
      </Box>

      <DataGrid
        rows={logs}
        columns={columns}
        getRowId={r => r.id}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        getRowHeight={() => 'auto'}
      />
    </Box>
  );
}
