'use client';
import { useState } from 'react';
import { Typography, Box, Button, TextField, Chip, Tabs, Tab } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import { getDelinquencyReport, getPortfolioSnapshot, DelinquencyRow, PortfolioSnapshotRow } from '@/services/api';

const BASE = process.env.NEXT_PUBLIC_API_URL || ''; // empty = relative URL, handled by Vercel rewrites

function DelinquencyTab() {
  const [rows, setRows] = useState<DelinquencyRow[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await getDelinquencyReport({ propertyId: propertyId || undefined, month: month || undefined });
      setRows(data);
      setSearched(true);
    } finally { setLoading(false); }
  };

  const handleCsv = async () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (propertyId) params.set('propertyId', propertyId);
    if (month) params.set('month', month);
    const { default: axios } = await import('axios');
    const token = await (window as any).Clerk?.session?.getToken();
    const res = await axios.get(`${BASE}/api/reports/delinquency?${params}`, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delinquency-${month || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    { field: 'residentName', headerName: 'Resident', minWidth: 180, flex: 1 },
    { field: 'propertyCode', headerName: 'Property', width: 110 },
    { field: 'fullAddress', headerName: 'Address', minWidth: 200, flex: 1 },
    { field: 'rentAmount', headerName: 'Rent (€)', width: 100, type: 'number' },
    { field: 'amountPaid', headerName: 'Paid (€)', width: 100, type: 'number' },
    { field: 'amountDue', headerName: 'Due (€)', width: 100, type: 'number',
      renderCell: (p) => <Typography color="error" sx={{ fontWeight: 600 }}>{Number(p.value).toFixed(2)}</Typography> },
    { field: 'lateStatus', headerName: 'Status', width: 150,
      renderCell: (p) => {
        const color = p.value === 'overdue' ? 'error' : p.value === 'final_demand_d4' ? 'warning' : 'default';
        return <Chip label={p.value} color={color as any} size="small" />;
      }
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" label="Property Code" placeholder="e.g. 33HBH" value={propertyId} onChange={e => setPropertyId(e.target.value)} sx={{ width: 200 }} />
        <TextField size="small" label="Month (YYYY-MM)" value={month} onChange={e => setMonth(e.target.value)} sx={{ width: 160 }} />
        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
        {rows.length > 0 && (
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleCsv}>Export CSV</Button>
        )}
      </Box>
      {searched && (
        <DataGrid rows={rows.map((r, i) => ({ ...r, _id: i }))} columns={columns} getRowId={r => r._id} autoHeight disableRowSelectionOnClick
          pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ footer: CustomGridFooter }}
          slotProps={{ footer: { pageSizeOptions: [25, 50] } }}
          sx={{ '& .MuiDataGrid-row': { cursor: 'default' } }}
        />
      )}
      {searched && rows.length === 0 && !loading && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>No bad debtor records found.</Typography>
      )}
    </Box>
  );
}

function PortfolioSnapshotTab() {
  const [rows, setRows] = useState<PortfolioSnapshotRow[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await getPortfolioSnapshot(date);
      setRows(data);
      setSearched(true);
    } finally { setLoading(false); }
  };

  const columns: GridColDef[] = [
    { field: 'propertyCode', headerName: 'Property', width: 110 },
    {
      field: 'propertyLeaseActive', headerName: 'Lease Status', width: 130,
      renderCell: (p) => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'default'} size="small" />,
    },
    { field: 'bedCode', headerName: 'Bed', width: 110 },
    { field: 'residentName', headerName: 'Resident', minWidth: 180, flex: 1 },
    {
      field: 'checkInDate', headerName: 'Check-in', width: 110,
      valueGetter: (_v, row) => (row as PortfolioSnapshotRow).checkInDate ? new Date((row as PortfolioSnapshotRow).checkInDate as string).toLocaleDateString('en-GB') : '—',
    },
    {
      field: 'endDate', headerName: 'End Date', width: 110,
      valueGetter: (_v, row) => (row as PortfolioSnapshotRow).endDate ? new Date((row as PortfolioSnapshotRow).endDate as string).toLocaleDateString('en-GB') : 'Ongoing',
    },
    { field: 'rentAmount', headerName: 'Rent as of date (€)', width: 160, type: 'number' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small" label="As of date" type="date" value={date} onChange={e => setDate(e.target.value)}
          sx={{ width: 180 }} slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          {loading ? 'Loading…' : 'Load Snapshot'}
        </Button>
      </Box>
      {searched && (
        <DataGrid rows={rows.map((r, i) => ({ ...r, _id: i }))} columns={columns} getRowId={r => r._id} autoHeight disableRowSelectionOnClick
          pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ footer: CustomGridFooter }}
          slotProps={{ footer: { pageSizeOptions: [25, 50] } }}
          sx={{ '& .MuiDataGrid-row': { cursor: 'default' } }}
        />
      )}
      {searched && rows.length === 0 && !loading && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>No active bookings found as of that date.</Typography>
      )}
    </Box>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Reports</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Delinquency" />
        <Tab label="Portfolio Snapshot" />
      </Tabs>
      {tab === 0 && <DelinquencyTab />}
      {tab === 1 && <PortfolioSnapshotTab />}
    </Box>
  );
}
