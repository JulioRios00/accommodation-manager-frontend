'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Typography, Box, Button, Chip, IconButton, TextField, InputAdornment, ButtonGroup, Tooltip, Divider, Alert, Snackbar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import BedIcon from '@mui/icons-material/Bed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { getBeds, getBedrooms, getProperties, getResidents, createBed, updateBed, deleteBed, setBedActivation, setBedActivationBulk, BulkActivationResult, Bed, Bedroom, Property, Resident } from '@/services/api';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import ColumnReorderDialog from '@/components/shared/ColumnReorderDialog';
import BedDialog from '@/components/crud/BedDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import StatsCard from '@/components/dashboard/StatsCard';
import { useRole } from '@/hooks/useRole';
import { useTableState } from '@/hooks/useTableState';
import { bedCode } from '@/lib/bedCode';

type BedFormState = Omit<Bed, 'id' | 'propertyCode' | 'activeBooking'>;

const EMPTY_SELECTION: GridRowSelectionModel = { type: 'include', ids: new Set() };

export default function BedsPage() {
  const { can } = useRole();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bedrooms, setBedrooms] = useState<Bedroom[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [cardFilter, setCardFilter] = useState<'total' | 'occupied' | 'empty' | 'inactive' | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bed | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  /** The bed whose activation is being confirmed, and the direction it is going. */
  const [activating, setActivating] = useState<{ bed: Bed; action: 'activate' | 'deactivate' } | null>(null);
  // The backend refuses to deactivate an occupied bed and says who is in it — that
  // message is the useful part, so it is shown rather than a generic failure.
  const [activationError, setActivationError] = useState<string | null>(null);
  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);
  /** The bulk action awaiting confirmation, and the outcome of the last one. */
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkActivationResult | null>(null);
  const [columnReorderOpen, setColumnReorderOpen] = useState(false);
  const { columnVisibility, handleColumnVisibilityChange, resetTableLayout, applyColumnWidths, columnOrder, setColumnOrder, applyColumnOrder, sortModel, handleSortModelChange } = useTableState('beds_col_visibility');

  const load = () => getBeds().then(setBeds).catch(() => {});
  useEffect(() => { load(); }, []);
  // Beds outlive their property's lease, so the picker has to carry the out-of-lease
  // ones too — otherwise editing such a bed shows an empty Property field.
  useEffect(() => { getProperties(true).then(setProperties).catch(() => {}); }, []);
  useEffect(() => { getBedrooms().then(setBedrooms).catch(() => {}); }, []);
  useEffect(() => { getResidents().then(setResidents).catch(() => {}); }, []);

  const residentMap = new Map(residents.map(r => [r.id, r]));

  const handleSave = async (data: BedFormState, id?: string) => {
    if (id) await updateBed(id, data);
    else await createBed(data);
    await load();
  };

  const handleActivation = async () => {
    if (!activating) return;
    const { bed, action } = activating;
    setActivating(null);
    try {
      await setBedActivation(bed.id, action);
      await load();
    } catch (err: any) {
      setActivationError(err?.response?.data?.message ?? 'Could not change this bed. Nothing was saved.');
    }
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
      valueGetter: (_v, row) => bedCode(row as Bed),
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
            label={s === 'allocated' ? 'Allocated' : s === 'inactive' ? 'Inactive' : 'Vacant'}
            size="small"
            sx={{
              // Grey, not green: an inactive bed is not available, so it must not read
              // like a vacancy someone could fill.
              bgcolor: s === 'allocated' ? '#DE9151' : s === 'inactive' ? '#9e9e9e' : '#4caf50',
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
      width: 124,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {can('bed:edit') && (
            <IconButton size="small" onClick={() => { setEditing(params.row as Bed); setDialogOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {can('bed:edit') && (params.row.status === 'inactive' ? (
            <Tooltip title="Put this bed back into lettable stock">
              <IconButton
                size="small"
                color="success"
                onClick={() => setActivating({ bed: params.row as Bed, action: 'activate' })}
              >
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title={
              params.row.status === 'allocated'
                ? 'Occupied — end or move the booking first'
                : 'Take this bed out of lettable stock'
            }>
              {/* A disabled IconButton fires no events, so the tooltip needs a wrapper
                  that still does — otherwise the reason for the disabling is invisible. */}
              <span>
                <IconButton
                  size="small"
                  disabled={params.row.status === 'allocated'}
                  onClick={() => setActivating({ bed: params.row as Bed, action: 'deactivate' })}
                >
                  <BlockIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ))}
          {can('bed:write') && (
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const columnsWithWidthsAndOrder = useMemo(() => {
    const withWidths = applyColumnWidths(columns);
    return applyColumnOrder(withWidths);
  }, [columns, applyColumnWidths, applyColumnOrder]);

  const q = search.toLowerCase();
  const filtered = beds
    .filter(b => {
      if (cardFilter === 'total') return b.status !== 'inactive';
      if (cardFilter === 'occupied') return b.status === 'allocated';
      if (cardFilter === 'empty') return b.status === 'vacant';
      if (cardFilter === 'inactive') return b.status === 'inactive';
      if (statusFilter === 'active') return b.status !== 'inactive';
      if (statusFilter === 'inactive') return b.status === 'inactive';
      return true;
    })
    .filter(b => {
      const residentName = b.activeBooking?.residentId ? residentMap.get(b.activeBooking.residentId)?.fullName : undefined;
      return [
        bedCode(b),
        b.bedroomType, b.sex, b.bedSize, b.propertyCode,
        b.bedroomName, b.name, b.status, residentName,
      ].some(v => v?.toLowerCase().includes(q));
    });

  // 'exclude' is what the header checkbox produces for select-all, where `ids` holds the
  // rows that were unticked — so it has to be resolved against the rows actually on
  // screen, or a filtered-out bed would be swept into the action.
  const selectedIds = useMemo(
    () => selection.type === 'include'
      ? ([...selection.ids] as string[]).filter(id => filtered.some(b => b.id === id))
      : filtered.filter(b => !selection.ids.has(b.id)).map(b => b.id),
    [selection, filtered],
  );

  const selectedBeds = useMemo(
    () => selectedIds.map(id => beds.find(b => b.id === id)).filter((b): b is Bed => !!b),
    [selectedIds, beds],
  );

  // What the action would actually do, so the confirmation can say it rather than claim
  // the whole selection is about to change.
  const bulkPreview = useMemo(() => {
    if (!bulkAction) return { willChange: 0, alreadyThere: 0, blocked: 0 };
    const deactivating = bulkAction === 'deactivate';
    return {
      willChange: selectedBeds.filter(b => deactivating ? b.status === 'vacant' : b.status === 'inactive').length,
      alreadyThere: selectedBeds.filter(b => deactivating ? b.status === 'inactive' : b.status !== 'inactive').length,
      blocked: deactivating ? selectedBeds.filter(b => b.status === 'allocated').length : 0,
    };
  }, [bulkAction, selectedBeds]);

  const runBulk = async () => {
    if (!bulkAction) return;
    setBulkRunning(true);
    try {
      const res = await setBedActivationBulk(selectedIds, bulkAction);
      setBulkResult(res);
      setSelection(EMPTY_SELECTION);
      await load();
    } catch (err: any) {
      setActivationError(err?.response?.data?.message ?? 'Could not change these beds. Nothing was saved.');
    } finally {
      setBulkRunning(false);
      setBulkAction(null);
    }
  };

  const stats = {
    // Total counts lettable stock only; inactive beds get their own card so the drop
    // between the two is visible rather than unexplained.
    total: beds.filter(b => b.status !== 'inactive').length,
    occupied: beds.filter(b => b.status === 'allocated').length,
    empty: beds.filter(b => b.status === 'vacant').length,
    inactive: beds.filter(b => b.status === 'inactive').length,
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Beds</Typography>
        {can('bed:edit') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            Add Bed
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
        <StatsCard
          title="Total Beds"
          value={stats.total}
          icon={<BedIcon />}
          color="#114C5A"
          onClick={() => setCardFilter(cardFilter === 'total' ? null : 'total')}
          active={cardFilter === 'total'}
        />
        <StatsCard
          title="Occupied"
          value={stats.occupied}
          icon={<CheckCircleIcon />}
          color="#2e7d32"
          onClick={() => setCardFilter(cardFilter === 'occupied' ? null : 'occupied')}
          active={cardFilter === 'occupied'}
        />
        <StatsCard
          title="Empty"
          value={stats.empty}
          icon={<DoNotDisturbIcon />}
          color="#d32f2f"
          onClick={() => setCardFilter(cardFilter === 'empty' ? null : 'empty')}
          active={cardFilter === 'empty'}
        />
        <StatsCard
          title="Inactive"
          value={stats.inactive}
          icon={<DoNotDisturbIcon />}
          color="#616161"
          onClick={() => setCardFilter(cardFilter === 'inactive' ? null : 'inactive')}
          active={cardFilter === 'inactive'}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search by bed code, bedroom, room type, status…"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 380 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <ButtonGroup size="small">
          {(['active', 'inactive', 'all'] as const).map(v => (
            <Button
              key={v}
              variant={statusFilter === v ? 'contained' : 'outlined'}
              onClick={() => setStatusFilter(v)}
              disabled={cardFilter !== null}
            >
              {v === 'active' ? 'Active' : v === 'inactive' ? 'Inactive' : 'All'}
            </Button>
          ))}
        </ButtonGroup>
        <Tooltip title="Reorder columns">
          <IconButton size="small" onClick={() => setColumnReorderOpen(true)}><ViewWeekIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title="Reset column layout to default">
          <IconButton size="small" onClick={resetTableLayout}><RestoreIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>

      {can('bed:edit') && selectedIds.length > 0 && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5,
          bgcolor: '#FFF0E6', borderRadius: 1,
        }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {selectedIds.length} bed{selectedIds.length === 1 ? '' : 's'} selected
          </Typography>
          <Button size="small" variant="outlined" color="error" startIcon={<BlockIcon />} onClick={() => setBulkAction('deactivate')}>
            Deactivate
          </Button>
          <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={() => setBulkAction('activate')}>
            Activate
          </Button>
          <Button size="small" onClick={() => setSelection(EMPTY_SELECTION)}>Clear selection</Button>
        </Box>
      )}

      {bulkResult && (
        <Alert severity={bulkResult.failed.length ? 'warning' : 'success'} sx={{ mb: 2 }} onClose={() => setBulkResult(null)}>
          <Typography variant="body2">
            {bulkResult.changed} bed{bulkResult.changed === 1 ? '' : 's'} changed
            {bulkResult.unchanged > 0 && `, ${bulkResult.unchanged} already in that state`}
            {bulkResult.failed.length > 0 && `, ${bulkResult.failed.length} could not be changed`}.
          </Typography>
          {/* The refused ones are named: "4 failed" just sends someone hunting the grid
              for which four. Bed codes, because that is what the grid shows. */}
          {bulkResult.failed.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {bulkResult.failed.map(f => {
                const bed = beds.find(b => b.id === f.id);
                return <li key={f.id}><Typography variant="body2">{bed ? bedCode(bed) : f.id}: {f.reason}</Typography></li>;
              })}
            </Box>
          )}
        </Alert>
      )}

      <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <DataGrid
          autoHeight
          rows={filtered}
          columns={columnsWithWidthsAndOrder}
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          checkboxSelection={can('bed:edit')}
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
          disableRowSelectionOnClick
          columnVisibilityModel={columnVisibility}
          onColumnVisibilityModelChange={handleColumnVisibilityChange}
          sortModel={sortModel}
          onSortModelChange={handleSortModelChange}
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

      <ColumnReorderDialog
        open={columnReorderOpen}
        columns={columns}
        columnOrder={columnOrder}
        onReorder={setColumnOrder}
        onReset={resetTableLayout}
        onClose={() => setColumnReorderOpen(false)}
      />
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
      <ConfirmDialog
        open={!!activating}
        title={activating?.action === 'activate' ? 'Activate bed' : 'Deactivate bed'}
        confirmLabel={activating?.action === 'activate' ? 'Activate' : 'Deactivate'}
        confirmColor={activating?.action === 'activate' ? 'success' : 'error'}
        message={
          activating?.action === 'activate'
            ? `Put bed ${activating ? bedCode(activating.bed) : ''} back into lettable stock? It will count towards vacancies again and can be booked.`
            : `Take bed ${activating ? bedCode(activating.bed) : ''} out of lettable stock? It stays in the records and keeps its history, but stops counting as a vacancy and cannot be booked. Re-importing the spreadsheet will no longer change this bed's status.`
        }
        onConfirm={handleActivation}
        onCancel={() => setActivating(null)}
      />
      <ConfirmDialog
        open={!!bulkAction && !bulkRunning}
        title={bulkAction === 'activate' ? 'Activate beds' : 'Deactivate beds'}
        confirmLabel={bulkAction === 'activate' ? 'Activate' : 'Deactivate'}
        confirmColor={bulkAction === 'activate' ? 'success' : 'error'}
        message={
          `${bulkPreview.willChange} of the ${selectedIds.length} selected bed${selectedIds.length === 1 ? '' : 's'} will be ` +
          `${bulkAction === 'activate' ? 'put back into' : 'taken out of'} lettable stock` +
          (bulkPreview.alreadyThere ? `, ${bulkPreview.alreadyThere} already ${bulkAction === 'activate' ? 'active' : 'inactive'}` : '') +
          (bulkPreview.blocked ? `, and ${bulkPreview.blocked} occupied and will be skipped` : '') +
          `. Re-importing the spreadsheet will no longer change the status of the beds that change here.`
        }
        onConfirm={runBulk}
        onCancel={() => setBulkAction(null)}
      />
      <Snackbar
        open={!!activationError}
        autoHideDuration={8000}
        onClose={() => setActivationError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setActivationError(null)}>{activationError}</Alert>
      </Snackbar>
    </Box>
  );
}
