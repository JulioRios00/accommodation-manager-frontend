'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, IconButton, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getLandlords, createLandlord, updateLandlord, deleteLandlord, Landlord } from '@/services/api';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import LandlordDialog from '@/components/crud/LandlordDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

export default function LandlordsPage() {
  const { can } = useRole();
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Landlord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => getLandlords().then(setLandlords).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async (data: Omit<Landlord, 'id' | 'active'>, id?: string) => {
    if (id) await updateLandlord(id, data);
    else await createLandlord(data);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteLandlord(deleteId);
    setDeleteId(null);
    await load();
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', minWidth: 180, flex: 1 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'bankName', headerName: 'Bank', width: 140 },
    { field: 'iban', headerName: 'IBAN', width: 200 },
    { field: 'paymentMethod', headerName: 'Pay Method', width: 130 },
    { field: 'payoutDay', headerName: 'Payout Day', width: 100, type: 'number' },
    {
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => (
        <Box>
          {can('landlord:write') && (
            <IconButton size="small" onClick={() => { setEditing(params.row as Landlord); setDialogOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {can('landlord:write') && (
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const q = search.toLowerCase();
  const filtered = landlords.filter(l => [l.name, l.email].some(v => v?.toLowerCase().includes(q)));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Landlords</Typography>
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        {can('landlord:write') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>Add</Button>
        )}
      </Box>
      <DataGrid rows={filtered} columns={columns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ footer: CustomGridFooter }}
        slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />
      <LandlordDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={handleSave} />
      <ConfirmDialog open={!!deleteId} title="Delete Landlord" message="This action cannot be undone."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
