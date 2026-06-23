'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, Chip, IconButton, ToggleButton, ToggleButtonGroup, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  getBookings, getBeds, getResidents,
  createBooking, updateBooking, deleteBooking,
  Booking, Bed, Resident,
} from '@/services/api';
import BookingDialog from '@/components/crud/BookingDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

const statusColor = (s: string) =>
  s === 'active' ? 'success' : s === 'upcoming' ? 'warning' : 'default';

export default function BookingsPage() {
  const { can } = useRole();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadBookings = () => getBookings(filter || undefined).then(setBookings).catch(() => {});

  useEffect(() => { loadBookings(); }, [filter]);
  useEffect(() => {
    getBeds().then(setBeds).catch(() => {});
    getResidents().then(setResidents).catch(() => {});
  }, []);

  const handleSave = async (data: Omit<Booking, 'id' | 'resident' | 'bed'>, id?: string) => {
    if (id) await updateBooking(id, data);
    else await createBooking(data);
    await loadBookings();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteBooking(deleteId);
    setDeleteId(null);
    await loadBookings();
  };

  const q = search.toLowerCase();
  const visibleBookings = search
    ? bookings.filter(b =>
        [b.bed ? `${b.bed.property?.code ?? ''}-${b.bed.bedNumber}` : b.bedId,
         b.resident?.fullName, b.comments, b.status]
          .some(v => v?.toLowerCase().includes(q))
      )
    : bookings;

  const rows = visibleBookings.map((b) => ({
    id: b.id,
    bedCode: b.bed ? `${b.bed.property?.code ?? ''}-${b.bed.bedNumber}` : b.bedId,
    residentName: b.resident?.fullName ?? '—',
    checkInDate: formatDate(b.checkInDate),
    contractEndDate: formatDate(b.contractEndDate),
    checkOutDate: formatDate(b.checkOutDate),
    rentAmount: b.rentAmount,
    depositAmount: b.depositAmount,
    status: b.status,
    comments: b.comments ?? '',
    _raw: b,
  }));

  const columns: GridColDef[] = [
    { field: 'bedCode', headerName: 'Bed', width: 110 },
    { field: 'residentName', headerName: 'Resident', minWidth: 160, flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip label={params.value as string} color={statusColor(params.value as string) as any} size="small" />
      ),
    },
    { field: 'checkInDate', headerName: 'Check-in', width: 105 },
    { field: 'contractEndDate', headerName: 'Contract End', width: 120 },
    { field: 'checkOutDate', headerName: 'Check-out', width: 105 },
    { field: 'rentAmount', headerName: 'Rent (€)', width: 95, type: 'number' },
    { field: 'depositAmount', headerName: 'Deposit (€)', width: 105, type: 'number' },
    { field: 'comments', headerName: 'Comments', minWidth: 140, flex: 1 },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {can('booking:write') && (
            <IconButton size="small" onClick={() => { setEditing((params.row as any)._raw); setDialogOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {can('booking:write') && (
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Bookings</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search by bed, resident…"
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ width: 240 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
          <ToggleButtonGroup value={filter} exclusive onChange={(_, v) => setFilter(v ?? '')} size="small">
            <ToggleButton value="">All</ToggleButton>
            <ToggleButton value="active">Active</ToggleButton>
            <ToggleButton value="upcoming">Upcoming</ToggleButton>
            <ToggleButton value="completed">Completed</ToggleButton>
          </ToggleButtonGroup>
          {can('booking:write') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
              Add Booking
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <Box sx={{ height: 500, minWidth: 820, bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6' },
              '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
            }}
          />
        </Box>
      </Box>

      <BookingDialog
        open={dialogOpen}
        initial={editing}
        beds={beds}
        residents={residents}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
      <ConfirmDialog
        open={!!deleteId}
        message="Delete this booking? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
