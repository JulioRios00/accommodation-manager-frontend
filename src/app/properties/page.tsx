'use client';
import { useEffect, useState, useCallback } from 'react';
import { Typography, Box, Button, IconButton, TextField, InputAdornment, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import RestoreIcon from '@mui/icons-material/Restore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataGrid, GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import { getProperties, getBeds, getBedrooms, getLandlords, createProperty, updateProperty, deleteProperty, Property, Bed, Bedroom, Landlord } from '@/services/api';
import PropertyDialog from '@/components/crud/PropertyDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

const COL_VIS_KEY = 'properties_col_visibility';

export default function PropertiesPage() {
  const { can } = useRole();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [bedrooms, setBedrooms] = useState<Bedroom[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
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

  const load = () => {
    getProperties().then(setProperties).catch(() => {});
    getBeds().then(setBeds).catch(() => {});
    getBedrooms().then(setBedrooms).catch(() => {});
    getLandlords().then(setLandlords).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (data: Omit<Property, 'id'>, id?: string) => {
    if (id) await updateProperty(id, data);
    else await createProperty(data);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProperty(deleteId);
    setDeleteId(null);
    await load();
  };

  const columns: GridColDef[] = [
    {
      field: 'inventory',
      headerName: '',
      width: 44,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Manage Inventory">
          <IconButton size="small" component={Link} href={`/properties/${params.row.id}/inventory`} onClick={e => e.stopPropagation()}>
            <MeetingRoomIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
    { field: 'code', headerName: 'Code', width: 90 },
    { field: 'bu', headerName: 'BU', width: 70 },
    { field: 'area', headerName: 'Area', width: 120 },
    { field: 'fullAddress', headerName: 'Address', minWidth: 200, flex: 1 },
    { field: 'eirCode', headerName: 'Eircode', width: 90 },
    { field: 'propertyType', headerName: 'Type', width: 110 },
    {
      field: 'landlordName',
      headerName: 'Landlord',
      width: 130,
      valueGetter: (_v, row) => landlords.find(l => l.id === (row as Property).landlordId)?.name ?? '',
    },
    {
      field: 'bedroomCount',
      headerName: 'Bedrooms',
      width: 95,
      type: 'number',
      valueGetter: (_v, row) => bedrooms.filter(b => b.propertyId === (row as Property).id).length,
    },
    {
      field: 'bedCount',
      headerName: 'Beds',
      width: 70,
      type: 'number',
      valueGetter: (_v, row) => beds.filter(b => b.propertyId === (row as Property).id).length,
    },
    {
      field: 'residentCount',
      headerName: 'Residents',
      width: 90,
      type: 'number',
      valueGetter: (_v, row) =>
        beds.filter(b => b.propertyId === (row as Property).id && b.activeBooking?.residentId).length,
    },
    { field: 'electricityStatus', headerName: 'Electricity', width: 110 },
    { field: 'gasStatus', headerName: 'Gas', width: 90 },
    {
      field: 'officeKeysCount',
      headerName: 'Office Keys',
      width: 90,
      valueGetter: (_v, row) => (row as Property).officeKeysCount > 0 ? 'Yes' : 'No',
    },
    { field: 'keysCount', headerName: 'Keys', width: 75, type: 'number' },
    { field: 'fobCount', headerName: 'Fobs', width: 75, type: 'number' },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <Box onClick={e => e.stopPropagation()}>
          {can('property:write') && (
            <IconButton size="small" onClick={() => { setEditing(params.row as Property); setDialogOpen(true); }}>
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
  const filtered = properties.filter(p =>
    [p.code, p.bu, p.area, p.fullAddress].some(v => v?.toLowerCase().includes(q))
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Properties</Typography>
        {can('property:write') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            Add Property
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search by code, BU, area or address…"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 340 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <Tooltip title="Reset column visibility to default">
          <IconButton size="small" onClick={resetView}><RestoreIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <Box sx={{ height: 500, minWidth: 650, bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <DataGrid
            rows={filtered}
            columns={columns}
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick

            columnVisibilityModel={columnVisibility}
            onColumnVisibilityModelChange={handleColumnVisibilityChange}
            onRowDoubleClick={params => router.push(`/properties/${params.row.id}/inventory`)}
            slots={{ footer: CustomGridFooter }}
            slotProps={{ footer: { pageSizeOptions: [10, 25] } }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6' },
              '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer > button:has(.MuiDataGrid-sortIcon)': { display: 'none' },
            }}
          />
        </Box>
      </Box>

      <PropertyDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        landlords={landlords}
      />
      <ConfirmDialog
        open={!!deleteId}
        message="Delete this property? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
