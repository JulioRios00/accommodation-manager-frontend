'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, IconButton, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getServiceProviders, createServiceProvider, updateServiceProvider, deleteServiceProvider, ServiceProvider } from '@/services/api';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import ServiceProviderDialog from '@/components/crud/ServiceProviderDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

export default function ServiceProvidersPage() {
  const { can } = useRole();
  const [items, setItems] = useState<ServiceProvider[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceProvider | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => getServiceProviders().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async (data: Omit<ServiceProvider, 'id' | 'active'>, id?: string) => {
    if (id) await updateServiceProvider(id, data); else await createServiceProvider(data);
    await load();
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', minWidth: 180, flex: 1 },
    { field: 'contactName', headerName: 'Contact', width: 160 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'specialty', headerName: 'Specialty', width: 140 },
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => (
        <Box>
          {can('serviceProvider:edit') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
          {can('serviceProvider:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
        </Box>
      ),
    },
  ];

  const q = search.toLowerCase();
  const filtered = items.filter(i => [i.name, i.contactName, i.specialty].some(v => v?.toLowerCase().includes(q)));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Service Providers</Typography>
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        {can('serviceProvider:edit') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>Add</Button>}
      </Box>
      <DataGrid rows={filtered} columns={columns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ footer: CustomGridFooter }}
        slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />
      <ServiceProviderDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={handleSave} />
      <ConfirmDialog open={!!deleteId} title="Delete Service Provider" message="This action cannot be undone."
        onConfirm={async () => { await deleteServiceProvider(deleteId!); setDeleteId(null); await load(); }} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
