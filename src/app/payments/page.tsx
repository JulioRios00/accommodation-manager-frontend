'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Tabs, Tab, Button, IconButton, TextField, InputAdornment, Chip, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  getRentPayments, createRentPayment, updateRentPayment, deleteRentPayment, RentPayment,
  getLandlordPayments, createLandlordPayment, updateLandlordPayment, deleteLandlordPayment, LandlordPayment,
  getDepositTransactions, createDepositTransaction, updateDepositTransaction, deleteDepositTransaction, DepositTransaction,
} from '@/services/api';
import RentPaymentDialog from '@/components/crud/RentPaymentDialog';
import LandlordPaymentDialog from '@/components/crud/LandlordPaymentDialog';
import DepositTransactionDialog from '@/components/crud/DepositTransactionDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

const statusChip = (v: string) => {
  const color = v === 'paid' || v === 'done' ? 'success' : v === 'partial' ? 'warning' : 'default';
  return <Chip label={v} color={color as any} size="small" />;
};

export default function PaymentsPage() {
  const { can } = useRole();
  const [tab, setTab] = useState(0);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [landlordPayments, setLandlordPayments] = useState<LandlordPayment[]>([]);
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    getRentPayments().then(setRentPayments).catch(() => {});
    getLandlordPayments().then(setLandlordPayments).catch(() => {});
    getDepositTransactions().then(setDeposits).catch(() => {});
  }, []);

  const load = async () => {
    const [r, l, d] = await Promise.all([getRentPayments(), getLandlordPayments(), getDepositTransactions()]);
    setRentPayments(r); setLandlordPayments(l); setDeposits(d);
  };

  const rentColumns: GridColDef[] = [
    { field: 'month', headerName: 'Month', width: 100 },
    { field: 'residentId', headerName: 'Resident ID', width: 150 },
    { field: 'rentAmount', headerName: 'Rent (€)', width: 100, type: 'number' },
    { field: 'amountPaid', headerName: 'Paid (€)', width: 100, type: 'number' },
    { field: 'lateStatus', headerName: 'Status', width: 130, renderCell: (p) => statusChip(p.value as string) },
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => <Box>
        {can('property:write') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
        {can('property:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box> },
  ];

  const landlordColumns: GridColDef[] = [
    { field: 'month', headerName: 'Month', width: 100 },
    { field: 'landlordId', headerName: 'Landlord ID', width: 150 },
    { field: 'amountDue', headerName: 'Due (€)', width: 100, type: 'number' },
    { field: 'amountPaid', headerName: 'Paid (€)', width: 100, type: 'number' },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => statusChip(p.value as string) },
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => <Box>
        {can('property:write') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
        {can('property:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box> },
  ];

  const depositColumns: GridColDef[] = [
    { field: 'type', headerName: 'Type', width: 90, renderCell: (p) => <Chip label={p.value} color={p.value === 'refund' ? 'warning' : 'success'} size="small" /> },
    { field: 'residentName', headerName: 'Resident', minWidth: 160, flex: 1 },
    { field: 'depositAmount', headerName: 'Amount (€)', width: 120, type: 'number' },
    { field: 'status', headerName: 'Status', width: 100, renderCell: (p) => statusChip(p.value as string) },
    { field: 'dateProcessed', headerName: 'Processed', width: 120 },
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => <Box>
        {can('property:write') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
        {can('property:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box> },
  ];

  const q = search.toLowerCase();
  const filteredRent = rentPayments.filter(r => [r.month, r.residentId].some(v => v?.toLowerCase().includes(q)));
  const filteredLandlord = landlordPayments.filter(l => [l.month, l.landlordId].some(v => v?.toLowerCase().includes(q)));
  const filteredDeposits = deposits.filter(d => [d.residentName, d.type].some(v => v?.toLowerCase().includes(q)));

  const handleDelete = async () => {
    if (!deleteId) return;
    if (tab === 0) await deleteRentPayment(deleteId);
    else if (tab === 1) await deleteLandlordPayment(deleteId);
    else await deleteDepositTransaction(deleteId);
    setDeleteId(null);
    await load();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Payments</Typography>
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        {can('property:write') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>Add</Button>}
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Rent Payments" />
        <Tab label="Landlord Payments" />
        <Tab label="Deposits" />
      </Tabs>
      {tab === 0 && <DataGrid rows={filteredRent} columns={rentColumns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />}
      {tab === 1 && <DataGrid rows={filteredLandlord} columns={landlordColumns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />}
      {tab === 2 && <DataGrid rows={filteredDeposits} columns={depositColumns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />}
      {tab === 0 && <RentPaymentDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={async (data, id) => { if (id) await updateRentPayment(id, data); else await createRentPayment(data); await load(); }} />}
      {tab === 1 && <LandlordPaymentDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={async (data, id) => { if (id) await updateLandlordPayment(id, data); else await createLandlordPayment(data); await load(); }} />}
      {tab === 2 && <DepositTransactionDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={async (data, id) => { if (id) await updateDepositTransaction(id, data); else await createDepositTransaction(data); await load(); }} />}
      <ConfirmDialog open={!!deleteId} title="Delete Payment" message="This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
