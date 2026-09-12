'use client';
import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, Chip, Alert, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import {
  getDisbursementLedger, updateDisbursementNotes, markLandlordPaymentPaid, exportLandlordDisbursements,
  DisbursementLedgerRow,
} from '@/services/api';

const EMPTY_SELECTION: GridRowSelectionModel = { type: 'include', ids: new Set() };

export default function LandlordDisbursementsPage() {
  const [rows, setRows] = useState<DisbursementLedgerRow[]>([]);
  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = () => getDisbursementLedger().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  const visibleRows = useMemo(
    () => statusFilter === 'pending' ? rows.filter(r => r.status !== 'paid') : rows,
    [rows, statusFilter],
  );

  const selectedIds = useMemo(
    () => selection.type === 'include'
      ? [...selection.ids] as string[]
      : visibleRows.filter(r => !selection.ids.has(r.paymentId)).map(r => r.paymentId),
    [selection, visibleRows],
  );

  const handleNotesCommit = async (id: string, notes: string) => {
    await updateDisbursementNotes(id, notes || null);
    await load();
    return notes;
  };

  const handleMarkPaid = async () => {
    if (!markPaidId) return;
    await markLandlordPaymentPaid(markPaidId);
    setMarkPaidId(null);
    await load();
  };

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      await exportLandlordDisbursements(selectedIds);
    } catch (err: any) {
      setExportError(err?.response?.data?.message ?? 'Export failed — check the selected rows.');
    } finally {
      setExporting(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'propertyCode', headerName: 'Property', width: 100 },
    { field: 'month', headerName: 'Month', width: 90 },
    { field: 'dateDue', headerName: 'Due Date', width: 110 },
    { field: 'netAmount', headerName: 'Net Amount (€)', width: 130, type: 'number' },
    { field: 'beneficiaryName', headerName: 'Payee', minWidth: 150, flex: 1 },
    { field: 'iban', headerName: 'IBAN', width: 200 },
    { field: 'bic', headerName: 'BIC', width: 110 },
    { field: 'paymentDescription', headerName: 'Reference', width: 200 },
    {
      field: 'notes', headerName: 'Notes', minWidth: 180, flex: 1,
      editable: true,
    },
    {
      field: 'status', headerName: 'Status', width: 130,
      renderCell: (p) => {
        const row = p.row as DisbursementLedgerRow;
        if (row.status === 'paid') {
          return <Chip label={`Paid ${row.datePaid ? new Date(row.datePaid).toLocaleDateString() : ''}`} size="small" color="success" />;
        }
        return <Chip label="Pending" size="small" color="warning" />;
      },
    },
    {
      field: 'actions', headerName: '', width: 140, sortable: false,
      renderCell: (p) => {
        const row = p.row as DisbursementLedgerRow;
        if (row.status === 'paid') return null;
        return (
          <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => setMarkPaidId(row.paymentId)}>
            Mark Paid
          </Button>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Landlord Disbursements</Typography>
          <Typography variant="body2" color="text.secondary">
            Rents due to be paid out to landlords — select rows to export a bank batch file.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(_, v) => v && setStatusFilter(v)}>
            <ToggleButton value="pending">Pending</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained" startIcon={<DownloadIcon />}
            disabled={!selectedIds.length || exporting}
            onClick={handleExport}
          >
            Export Batch File ({selectedIds.length})
          </Button>
        </Box>
      </Box>

      {exportError && <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>}

      <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <DataGrid
          autoHeight
          rows={visibleRows}
          columns={columns}
          getRowId={r => r.paymentId}
          checkboxSelection
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
          isRowSelectable={(p) => (p.row as DisbursementLedgerRow).status !== 'paid'}
          processRowUpdate={async (newRow) => {
            await handleNotesCommit(newRow.paymentId, newRow.notes ?? '');
            return newRow;
          }}
          getRowClassName={(p) => (p.row as DisbursementLedgerRow).status === 'paid' ? 'disbursement-paid-row' : ''}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ footer: CustomGridFooter }}
          slotProps={{ footer: { pageSizeOptions: [25, 50] } }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6', fontWeight: 700 },
            '& .disbursement-paid-row': { opacity: 0.55 },
          }}
        />
      </Box>

      <ConfirmDialog
        open={!!markPaidId} title="Mark as Paid"
        message="Confirm this disbursement has actually been paid out via bank transfer. This records an immutable timestamp and cannot be undone."
        onConfirm={handleMarkPaid} onCancel={() => setMarkPaidId(null)}
      />
    </Box>
  );
}
