'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, Chip, IconButton, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getBeds, getBedrooms, getProperties, getResidents, createBed, updateBed, deleteBed, Bed, Bedroom, Property, Resident } from '@/services/api';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import BedDialog from '@/components/crud/BedDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

type BedFormState = Omit<Bed, 'id' | 'propertyCode' | 'activeBooking'>;

export default function BedsPage() {
  const { can } = useRole();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bedrooms, setBedrooms] = useState<Bedroom[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bed | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => getBeds().then(setBeds).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { getProperties().then(setProperties).catch(() => {}); }, []);
  useEffect(() => { getBedrooms().then(setBedrooms).catch(() => {}); }, []);
  useEffect(() => { getResidents().then(setResidents).catch(() => {}); }, []);

  const residentMap = new Map(residents.map(r => [r.id, r]));

  const handleSave = async (data: BedFormState, id?: string) => {
    if (id) await updateBed(id, data);
    else await createBed(data);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteBed(deleteId);
    setDeleteId(null);
    await load();
  };

  const columns: GridColDef[] = [
    {
      field: 'bedCode',
      headerName: 'Bed Code',
      width: 110,
      valueGetter: (_v, row) => `${(row as Bed).propertyCode ?? ''}-${(row as Bed).bedNumber}`,
      renderCell: (params) => (
        <Box sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{params.value}</Box>
      ),
    },
    {
      field: 'residentName',
      headerName: 'Resident',
      minWidth: 160,
      flex: 1,
      valueGetter: (_v, row) => {
        const residentId = (row as Bed).activeBooking?.residentId;
        return residentId ? (residentMap.get(residentId)?.fullName ?? residentId) : '—';
      },
    },
    { field: 'bedroomName', headerName: 'Bedroom', width: 130, valueGetter: (_v, row) => (row as Bed).bedroomName ?? '—' },
    { field: 'name', headerName: 'Location', width: 130, valueGetter: (_v, row) => (row as Bed).name ?? '—' },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => {
        const s = (params.row as Bed).status;
        return (
          <Chip
            label={s === 'allocated' ? 'Allocated' : 'Vacant'}
            size="small"
            sx={{
              bgcolor: s === 'allocated' ? '#DE9151' : '#4caf50',
              color: 'white',
              fontWeight: 600,
              fontSize: 11,
            }}
          />
        );
      },
    },
    { field: 'bedroomType', headerName: 'Room Type', width: 130 },
    { field: 'sex', headerName: 'Sex', width: 80 },
    { field: 'bedSize', headerName: 'Bed Size', width: 100 },
    { field: 'rentAmount', headerName: 'Rent (€)', width: 95, type: 'number' },
    { field: 'depositAmount', headerName: 'Deposit (€)', width: 105, type: 'number' },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {can('bed:write') && (
            <IconButton size="small" onClick={() => { setEditing(params.row as Bed); setDialogOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {can('bed:write') && (
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const q = search.toLowerCase();
  const filtered = beds.filter(b => {
    const residentName = b.activeBooking?.residentId ? residentMap.get(b.activeBooking.residentId)?.fullName : undefined;
    return [
      `${b.propertyCode ?? ''}-${b.bedNumber}`,
      b.bedroomType, b.sex, b.bedSize, b.propertyCode,
      b.bedroomName, b.name, b.status, residentName,
    ].some(v => v?.toLowerCase().includes(q));
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Beds</Typography>
        {can('bed:write') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            Add Bed
          </Button>
        )}
      </Box>

      <TextField
        placeholder="Search by bed code, bedroom, room type, status…"
        size="small"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: 380 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
      />

      <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <DataGrid
          autoHeight
          rows={filtered}
          columns={columns}
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          slots={{ footer: CustomGridFooter }}
          slotProps={{ footer: { pageSizeOptions: [10, 25] } }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6' },
            '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
            '& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer > button:has(.MuiDataGrid-sortIcon)': { display: 'none' },
          }}
        />
      </Box>

      <BedDialog
        open={dialogOpen}
        initial={editing}
        properties={properties}
        bedrooms={bedrooms}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
      <ConfirmDialog
        open={!!deleteId}
        message="Delete this bed? All associated bookings will also be deleted."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
