'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, IconButton, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import { getCompanies, createCompany, updateCompany, deleteCompany, Company } from '@/services/api';
import CompanyDialog from '@/components/crud/CompanyDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

export default function CompaniesPage() {
  const { can } = useRole();
  const [items, setItems] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => getCompanies().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const columns: GridColDef[] = [
    { field: 'bu', headerName: 'BU', width: 80 },
    { field: 'name', headerName: 'Company Name', minWidth: 200, flex: 1 },
    { field: 'contactEmail', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    { field: 'address', headerName: 'Address', minWidth: 200, flex: 1 },
    {
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => (
        <Box>
          {can('property:write') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
          {can('property:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
        </Box>
      ),
    },
  ];

  const q = search.toLowerCase();
  const filtered = items.filter(i => [i.bu, i.name, i.contactEmail, i.phone].some(v => v?.toLowerCase().includes(q)));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Business Units</Typography>
        <TextField size="small" placeholder="Search by BU, name, email…" value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        {can('property:write') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>Add</Button>}
      </Box>
      <DataGrid
        rows={filtered} columns={columns} getRowId={r => r.id} autoHeight disableRowSelectionOnClick
        pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ footer: CustomGridFooter }}
        slotProps={{ footer: { pageSizeOptions: [25, 50] } }}
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6' },
          '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
          '& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer > button:has(.MuiDataGrid-sortIcon)': { display: 'none' },
        }}
      />
      <CompanyDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)}
        onSave={async (data, id) => { if (id) await updateCompany(id, data); else await createCompany(data); await load(); }} />
      <ConfirmDialog open={!!deleteId} title="Delete Business Unit" message="This action cannot be undone."
        onConfirm={async () => { await deleteCompany(deleteId!); setDeleteId(null); await load(); }} onCancel={() => setDeleteId(null)} />
    </Box>
  );
}
