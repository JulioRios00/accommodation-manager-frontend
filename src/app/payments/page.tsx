'use client';
import { useEffect, useMemo, useState } from 'react';
import { Typography, Box, Tabs, Tab, Button, IconButton, TextField, InputAdornment, Chip, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import {
  getRentPayments, createRentPayment, updateRentPayment, deleteRentPayment, RentPayment,
  getLandlordPayments, createLandlordPayment, updateLandlordPayment, deleteLandlordPayment, LandlordPayment,
  getDepositTransactions, createDepositTransaction, updateDepositTransaction, deleteDepositTransaction, DepositTransaction,
  getProperties, getResidents, getBeds, getLandlords, getBookings,
  Property, Resident, Bed, Landlord, Booking,
} from '@/services/api';
import RentPaymentDialog from '@/components/crud/RentPaymentDialog';
import LandlordPaymentDialog from '@/components/crud/LandlordPaymentDialog';
import DepositTransactionDialog from '@/components/crud/DepositTransactionDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { bedCode } from '@/lib/bedCode';
import { useRole } from '@/hooks/useRole';

const statusChip = (v: string) => {
  const color = v === 'paid' || v === 'done' ? 'success' : v === 'partial' || v === 'partially_paid' ? 'warning' : 'default';
  return <Chip label={v} color={color as any} size="small" />;
};

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

export default function PaymentsPage() {
  const { can } = useRole();
  const [tab, setTab] = useState(0);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [landlordPayments, setLandlordPayments] = useState<LandlordPayment[]>([]);
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadReferenceData = () => {
    getProperties().then(setProperties).catch(() => {});
    getResidents().then(setResidents).catch(() => {});
    getBeds().then(setBeds).catch(() => {});
    getLandlords().then(setLandlords).catch(() => {});
    Promise.all([getBookings('active'), getBookings('upcoming'), getBookings('completed')])
      .then(([a, u, c]) => setBookings([...a, ...u, ...c]))
      .catch(() => {});
  };

  useEffect(() => {
    getRentPayments().then(setRentPayments).catch(() => {});
    getLandlordPayments().then(setLandlordPayments).catch(() => {});
    getDepositTransactions().then(setDeposits).catch(() => {});
    loadReferenceData();
  }, []);

  const load = async () => {
    const [r, l, d] = await Promise.all([getRentPayments(), getLandlordPayments(), getDepositTransactions()]);
    setRentPayments(r); setLandlordPayments(l); setDeposits(d);
  };

  const propertyById = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);
  const residentById = useMemo(() => new Map(residents.map(r => [r.id, r])), [residents]);
  const bedById = useMemo(() => new Map(beds.map(b => [b.id, b])), [beds]);
  const landlordById = useMemo(() => new Map(landlords.map(l => [l.id, l])), [landlords]);
  const bookingById = useMemo(() => new Map(bookings.map(b => [b.id, b])), [bookings]);

  const bedCodeForBed = (bed?: Bed) => bedCode(bed);
  const bedCodeForBooking = (bookingId?: string | null) => {
    if (!bookingId) return '';
    const booking = bookingById.get(bookingId);
    return booking ? bedCodeForBed(bedById.get(booking.bedId)) : '';
  };

  const rentColumns: GridColDef[] = [
    { field: 'month', headerName: 'Month', width: 100 },
    {
      field: 'property', headerName: 'Property', width: 120,
      valueGetter: (_v, row) => propertyById.get((row as RentPayment).propertyId)?.code ?? '',
    },
    {
      field: 'residentName', headerName: 'Resident Name', minWidth: 160, flex: 1,
      valueGetter: (_v, row) => residentById.get((row as RentPayment).residentId)?.fullName ?? '',
    },
    {
      field: 'bedCode', headerName: 'Bed Code', width: 110,
      valueGetter: (_v, row) => bedCodeForBooking((row as RentPayment).bookingId),
    },
    { field: 'rentAmount', headerName: 'Rent (€)', width: 100, type: 'number' },
    { field: 'amountPaid', headerName: 'Paid (€)', width: 100, type: 'number' },
    { field: 'paymentDueDay', headerName: 'Rent Due Day', width: 110, type: 'number' },
    { field: 'lateStatus', headerName: 'Late Status', width: 130, renderCell: (p) => statusChip(p.value as string) },
    { field: 'paymentStatus', headerName: 'Payment Status', width: 130, renderCell: (p) => statusChip(p.value as string) },
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => <Box>
        {can('payment:edit') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
        {can('payment:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box> },
  ];

  const landlordColumns: GridColDef[] = [
    { field: 'month', headerName: 'Month', width: 100 },
    {
      field: 'landlordName', headerName: 'Landlord', minWidth: 150, flex: 1,
      valueGetter: (_v, row) => landlordById.get((row as LandlordPayment).landlordId)?.name ?? '',
    },
    {
      field: 'propertyCode', headerName: 'Property Code', width: 120,
      valueGetter: (_v, row) => propertyById.get((row as LandlordPayment).propertyId)?.code ?? '',
    },
    { field: 'amountDue', headerName: 'Due (€)', width: 100, type: 'number' },
    { field: 'amountPaid', headerName: 'Paid (€)', width: 100, type: 'number' },
    { field: 'dateDue', headerName: 'Due Date', width: 110 },
    { field: 'iban', headerName: 'IBAN', width: 180 },
    {
      field: 'paymentReference', headerName: 'Payment Reference', width: 160,
      valueGetter: (_v, row) => propertyById.get((row as LandlordPayment).propertyId)?.paymentReference ?? '',
    },
    { field: 'notes', headerName: 'Notes', minWidth: 160, flex: 1 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => statusChip(p.value as string) },
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => <Box>
        {can('payment:edit') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
        {can('payment:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box> },
  ];

  const depositColumns: GridColDef[] = [
    { field: 'type', headerName: 'Type', width: 90, renderCell: (p) => <Chip label={p.value} color={p.value === 'refund' ? 'warning' : 'success'} size="small" /> },
    { field: 'residentName', headerName: 'Resident', minWidth: 160, flex: 1 },
    {
      field: 'propertyCode', headerName: 'Property Code', width: 120,
      valueGetter: (_v, row) => propertyById.get((row as DepositTransaction).propertyId)?.code ?? '',
    },
    {
      field: 'bedCode', headerName: 'Bed Code', width: 110,
      valueGetter: (_v, row) => bedCodeForBed(bedById.get((row as DepositTransaction).bedId ?? '')),
    },
    { field: 'depositAmount', headerName: 'Deposit Amount (€)', width: 150, type: 'number' },
    { field: 'proRataRentAmount', headerName: 'Pro Rata Rent (€)', width: 140, type: 'number' },
    { field: 'iban', headerName: 'IBAN', width: 180 },
    { field: 'checkoutDate', headerName: 'Checkout Date', width: 120 },
    { field: 'comments', headerName: 'Comments', minWidth: 160, flex: 1 },
    { field: 'status', headerName: 'Status', width: 100, renderCell: (p) => statusChip(p.value as string) },
    { field: 'dateProcessed', headerName: 'Processed', width: 120 },
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => <Box>
        {can('payment:edit') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
        {can('payment:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box> },
  ];

  const q = search.toLowerCase();
  const filteredRent = rentPayments
    .filter(r => !monthFilter || r.month?.slice(5, 7) === monthFilter)
    .filter(r => !yearFilter || r.month?.slice(0, 4) === yearFilter)
    .filter(r => {
      if (!q) return true;
      const residentName = residentById.get(r.residentId)?.fullName ?? '';
      const bedCode = bedCodeForBooking(r.bookingId);
      return [r.month, residentName, bedCode].some(v => v?.toLowerCase().includes(q));
    });
  const filteredLandlord = landlordPayments.filter(l => {
    if (!q) return true;
    const landlordName = landlordById.get(l.landlordId)?.name ?? '';
    const propertyCode = propertyById.get(l.propertyId)?.code ?? '';
    return [l.month, landlordName, propertyCode].some(v => v?.toLowerCase().includes(q));
  });
  const filteredDeposits = deposits.filter(d => [d.residentName, d.type].some(v => v?.toLowerCase().includes(q)));

  const rentYears = useMemo(
    () => Array.from(new Set(rentPayments.map(r => r.month?.slice(0, 4)).filter(Boolean))).sort().reverse(),
    [rentPayments],
  );

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Payments</Typography>
        {tab === 0 && (
          <>
            <TextField select size="small" label="Month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} sx={{ width: 140 }}>
              <MenuItem value="">All</MenuItem>
              {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Year" value={yearFilter} onChange={e => setYearFilter(e.target.value)} sx={{ width: 110 }}>
              <MenuItem value="">All</MenuItem>
              {rentYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </>
        )}
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        {can('payment:edit') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>Add</Button>}
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Rent Payments" />
        <Tab label="Landlord Payments" />
        <Tab label="Deposits" />
      </Tabs>
      {tab === 0 && <DataGrid rows={filteredRent} columns={rentColumns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />}
      {tab === 1 && <DataGrid rows={filteredLandlord} columns={landlordColumns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />}
      {tab === 2 && <DataGrid rows={filteredDeposits} columns={depositColumns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />}
      {tab === 0 && <RentPaymentDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={async (data, id) => { if (id) await updateRentPayment(id, data); else await createRentPayment(data); await load(); }} />}
      {tab === 1 && <LandlordPaymentDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={async (data, id) => { if (id) await updateLandlordPayment(id, data); else await createLandlordPayment(data); await load(); }} />}
      {tab === 2 && <DepositTransactionDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={async (data, id) => { if (id) await updateDepositTransaction(id, data); else await createDepositTransaction(data); await load(); }} />}
      <ConfirmDialog open={!!deleteId} title="Delete Payment" message="This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
