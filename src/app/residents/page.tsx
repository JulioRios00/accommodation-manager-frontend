'use client';
import { useEffect, useState } from 'react';
import { Typography, Box, Button, IconButton, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import { getResidents, createResident, updateResident, deleteResident, Resident } from '@/services/api';
import ResidentDialog from '@/components/crud/ResidentDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

export default function ResidentsPage() {
  const { can } = useRole();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => getResidents().then(setResidents).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async (data: Omit<Resident, 'id'>, id?: string): Promise<string> => {
    const saved = id ? await updateResident(id, data) : await createResident(data);
    await load();
    return saved.id;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteResident(deleteId);
    setDeleteId(null);
    await load();
  };

  const columns: GridColDef[] = [
    { field: 'fullName', headerName: 'Name', minWidth: 160, flex: 1 },
    { field: 'email', headerName: 'Email', minWidth: 160, flex: 1 },
    { field: 'telephone', headerName: 'Telephone', width: 140 },
    { field: 'nationality', headerName: 'Nationality', width: 130 },
    { field: 'personalId', headerName: 'Personal ID', width: 130 },
    { field: 'source', headerName: 'Source', width: 120 },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {can('resident:edit') && (
            <IconButton size="small" onClick={() => { setEditing(params.row as Resident); setDialogOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {can('resident:delete') && (
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const q = search.toLowerCase();
  const filtered = residents.filter(r =>
    [r.fullName, r.email, r.telephone, r.nationality, r.personalId, r.source]
      .some(v => v?.toLowerCase().includes(q))
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Residents</Typography>
        {can('resident:create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            Add Resident
          </Button>
        )}
      </Box>

      <TextField
        placeholder="Search by name, email, nationality or ID…"
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
            onRowDoubleClick={params => { setEditing(params.row as Resident); setDialogOpen(true); }}
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

      <ResidentDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
      <ConfirmDialog
        open={!!deleteId}
        message="Delete this resident? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
