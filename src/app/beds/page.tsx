'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, IconButton, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getBeds, getProperties, createBed, updateBed, deleteBed, Bed, Property } from '@/services/api';
import BedDialog from '@/components/crud/BedDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

export default function BedsPage() {
  const { can } = useRole();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bed | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => getBeds().then(setBeds).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { getProperties().then(setProperties).catch(() => {}); }, []);

  const handleSave = async (data: Omit<Bed, 'id' | 'propertyCode' | 'activeBooking'>, id?: string) => {
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
  const filtered = beds.filter(b =>
    [`${b.propertyCode ?? ''}-${b.bedNumber}`, b.bedroomType, b.sex, b.bedSize, b.propertyCode]
      .some(v => v?.toLowerCase().includes(q))
  );

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
        placeholder="Search by bed code, room type or sex…"
        size="small"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: 340 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
      />

      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <Box sx={{ height: 500, minWidth: 600, bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <DataGrid
            rows={filtered}
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

      <BedDialog
        open={dialogOpen}
        initial={editing}
        properties={properties}
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
