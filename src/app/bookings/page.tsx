'use client';
import { useCallback, useEffect, useState } from 'react';
import { Typography, Box, Button, Chip, IconButton, ToggleButton, ToggleButtonGroup, TextField, InputAdornment, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RestoreIcon from '@mui/icons-material/Restore';
import { DataGrid, GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import {
  getBookings, getBeds, getResidents, getProperties,
  createBooking, updateBooking, deleteBooking,
  Booking, Bed, Resident, Property,
} from '@/services/api';
import BookingDialog from '@/components/crud/BookingDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

const COL_VIS_KEY = 'bookings_col_visibility';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

/** Human-readable bed label, e.g. "SD01-4" — falls back to the raw id only if unjoined. */
function bedLabel(b: Booking) {
  if (!b.bed) return b.bedId;
  return [b.bed.propertyCode, b.bed.bedNumber].filter(v => v !== null && v !== undefined).join('-');
}

const statusColor = (s: string) =>
  s === 'active' ? 'success' : s === 'upcoming' ? 'warning' : 'default';

export default function BookingsPage() {
  const { can } = useRole();
  const canEdit = can('booking:edit');
  const canManage = can('booking:write');
  const canView = can('booking:view');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Column visibility persistence
  const [columnVisibility, setColumnVisibility] = useState<GridColumnVisibilityModel>({});
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COL_VIS_KEY);
      if (stored) setColumnVisibility(JSON.parse(stored));
    } catch { }
  }, []);
  const handleColumnVisibilityChange = useCallback((model: GridColumnVisibilityModel) => {
    setColumnVisibility(model);
    try { localStorage.setItem(COL_VIS_KEY, JSON.stringify(model)); } catch { }
  }, []);
  const resetView = () => {
    setColumnVisibility({});
    try { localStorage.removeItem(COL_VIS_KEY); } catch { }
  };

  const loadBookings = () => getBookings(filter || undefined).then(setBookings).catch(() => {});

  useEffect(() => { loadBookings(); }, [filter]);
  useEffect(() => {
    getBeds().then(setBeds).catch(() => {});
    getResidents().then(setResidents).catch(() => {});
    getProperties().then(setProperties).catch(() => {});
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

  /** Opens the dialog in edit mode when allowed, otherwise read-only. */
  const openBooking = (booking: Booking) => {
    if (!canEdit && !canView) return;
    setEditing(booking);
    setReadOnly(!canEdit);
    setDialogOpen(true);
  };

  const q = search.toLowerCase();
  const visibleBookings = search
    ? bookings.filter(b =>
        [bedLabel(b), b.bed?.propertyCode, b.resident?.fullName, b.comments, b.status]
          .some(v => v?.toLowerCase().includes(q))
      )
    : bookings;

  const rows = visibleBookings.map((b) => ({
    id: b.id,
    propertyCode: b.bed?.propertyCode ?? '—',
    bedCode: bedLabel(b),
    bedroomType: b.bed?.bedroomType ?? '—',
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
    { field: 'propertyCode', headerName: 'Property Code', width: 125 },
    { field: 'bedCode', headerName: 'Bed', width: 110 },
    { field: 'bedroomType', headerName: 'Room Type', width: 110 },
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
        <Box onClick={e => e.stopPropagation()}>
          {canEdit ? (
            <Tooltip title="Edit booking">
              <IconButton size="small" onClick={() => openBooking((params.row as any)._raw)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : canView && (
            <Tooltip title="View booking">
              <IconButton size="small" onClick={() => openBooking((params.row as any)._raw)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canManage && (
            <Tooltip title="Delete booking">
              <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
            placeholder="Search by property, bed, resident…"
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ width: 260 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
          <ToggleButtonGroup value={filter} exclusive onChange={(_, v) => setFilter(v ?? '')} size="small">
            <ToggleButton value="">All</ToggleButton>
            <ToggleButton value="active">Active</ToggleButton>
            <ToggleButton value="upcoming">Upcoming</ToggleButton>
            <ToggleButton value="completed">Completed</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Reset column visibility to default">
            <IconButton size="small" onClick={resetView}><RestoreIcon fontSize="small" /></IconButton>
          </Tooltip>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setReadOnly(false); setDialogOpen(true); }}>
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
            columnVisibilityModel={columnVisibility}
            onColumnVisibilityModelChange={handleColumnVisibilityChange}
            onRowDoubleClick={params => openBooking((params.row as any)._raw)}
            slots={{ footer: CustomGridFooter }}
            slotProps={{ footer: { pageSizeOptions: [10, 25] } }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6' },
              '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
              '& .MuiDataGrid-row': { cursor: canView ? 'pointer' : 'default' },
              '& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer > button:has(.MuiDataGrid-sortIcon)': { display: 'none' },
            }}
          />
        </Box>
      </Box>

      <BookingDialog
        open={dialogOpen}
        initial={editing}
        readOnly={readOnly}
        beds={beds}
        residents={residents}
        properties={properties}
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
