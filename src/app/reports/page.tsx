'use client';
import { useState } from 'react';
import { Typography, Box, Button, TextField, InputAdornment, MenuItem, Chip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getDelinquencyReport, DelinquencyRow } from '@/services/api';

const BASE = process.env.NEXT_PUBLIC_API_URL || ''; // empty = relative URL, handled by Vercel rewrites

export default function ReportsPage() {
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
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Delinquency Report</Typography>
        <TextField size="small" label="Property ID" value={propertyId} onChange={e => setPropertyId(e.target.value)} sx={{ width: 200 }} />
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
          sx={{ '& .MuiDataGrid-row': { cursor: 'default' } }}
        />
      )}
      {searched && rows.length === 0 && !loading && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>No delinquent records found.</Typography>
      )}
    </Box>
  );
}
