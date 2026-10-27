'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Typography, Box, Tabs, Tab, Button, IconButton, TextField, InputAdornment, Chip, MenuItem, Tooltip, ButtonGroup } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestoreIcon from '@mui/icons-material/Restore';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import { DataGrid, GridColDef, GridFilterModel } from '@mui/x-data-grid';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import {
  getRentPayments, createRentPayment, updateRentPayment, deleteRentPayment, RentPayment,
  getLandlordPayments, createLandlordPayment, updateLandlordPayment, deleteLandlordPayment, LandlordPayment,
  getDepositTransactions, createDepositTransaction, updateDepositTransaction, deleteDepositTransaction, DepositTransaction,
  getReceivablesLedger, markRentPaymentReceived, ReceivablesLedgerRow,
  getDepositRefundQueue, completeDepositRefund, DepositRefundQueueRow,
  getProperties, getResidents, getBeds, getLandlords, getBookings,
  Property, Resident, Bed, Landlord, Booking,
} from '@/services/api';
import RentPaymentDialog from '@/components/crud/RentPaymentDialog';
import LandlordPaymentDialog from '@/components/crud/LandlordPaymentDialog';
import DepositTransactionDialog from '@/components/crud/DepositTransactionDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import ColumnReorderDialog from '@/components/shared/ColumnReorderDialog';
import { bedCode } from '@/lib/bedCode';
import { useRole } from '@/hooks/useRole';
import { useTableState } from '@/hooks/useTableState';
import { useQueryParamState, useDebouncedQueryParamState, useRestoreQueryParams } from '@/hooks/useQueryParamState';
import { useFeatureFlags } from '@/lib/FeatureFlagsProvider';

const statusChip = (v: string) => {
  const color = v === 'paid' || v === 'done' ? 'success' : v === 'partial' || v === 'partially_paid' ? 'warning' : 'default';
  return <Chip label={v} color={color as any} size="small" />;
};

/** The status columns hold a small, fixed vocabulary, so they are declared as
 *  singleSelect: the filter panel then offers "is / is not / is any of" backed by a
 *  dropdown of the real values, instead of free text.
 *
 *  The default 'contains' operator is actively misleading on these columns. Every
 *  payment status ends in "paid" — paid, unpaid, partially_paid — so `contains "paid"`
 *  matches every row, which reads as a filter that does nothing. */
const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid'];
const LATE_STATUSES = ['on_time', 'demand_d1', 'final_demand_d4', 'overdue'];
const LANDLORD_STATUSES = ['pending', 'partial', 'paid'];
const DEPOSIT_STATUSES = ['pending', 'done'];
const DEPOSIT_TYPES = ['receipt', 'refund'];

/** The known values, plus whatever the rows actually hold. Imported data has carried
 *  unexpected statuses before; one of those must still be selectable, or the rows
 *  holding it silently become unfilterable. */
const statusOptions = (known: string[], rows: unknown[], field: string): string[] => {
  const seen = rows
    .map(r => (r as Record<string, unknown>)?.[field])
    .filter((v): v is string => typeof v === 'string' && v !== '');
  return Array.from(new Set([...known, ...seen]));
};

const statusColumn = (
  field: string, headerName: string, width: number, options: string[],
): GridColDef => ({
  field, headerName, width,
  type: 'singleSelect',
  valueOptions: options,
  renderCell: (p) => statusChip(p.value as string),
});

/** Filter models are persisted, so one saved before these columns became singleSelect
 *  still names a text operator the grid will not accept for that column type. Drop just
 *  those items — a stale entry in localStorage must not break the filter panel. */
const SELECT_OPERATORS = new Set(['is', 'not', 'isAnyOf']);
const pruneStaleFilters = (model: GridFilterModel, columns: GridColDef[]): GridFilterModel => {
  const selectFields = new Set(columns.filter(c => c.type === 'singleSelect').map(c => c.field));
  const items = model.items.filter(
    i => !(selectFields.has(i.field) && i.operator && !SELECT_OPERATORS.has(i.operator)),
  );
  // Same reference when nothing changed: the grid treats filterModel as controlled state.
  return items.length === model.items.length ? model : { ...model, items };
};

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

/** Tabs are addressed by slug rather than index, so the URL reads
 *  `?tab=deposits` and reordering the tabs can't change what a saved link means. */
const TABS = ['rent', 'landlord', 'deposits', 'ledger'] as const;
type TabSlug = (typeof TABS)[number];

function PaymentsContent() {
  const { can } = useRole();
  const { isEnabled, loaded: flagsLoaded } = useFeatureFlags();
  const receivablesLedgerEnabled = isEnabled('receivables_ledger');
  // Coming back via the sidebar lands on a bare /payments, so reinstate the last view.
  useRestoreQueryParams('payments');
  const [tabSlug, setTabSlug] = useQueryParamState<TabSlug>('tab', 'rent', TABS);
  // A link to the ledger shouldn't render a blank page when the flag is off.
  const activeSlug: TabSlug = tabSlug === 'ledger' && !receivablesLedgerEnabled ? 'rent' : tabSlug;
  const tab = TABS.indexOf(activeSlug);
  const setTab = (index: number) => setTabSlug(TABS[index] ?? 'rent');
  const { columnVisibility: rentColVis, handleColumnVisibilityChange: handleRentColVisChange, resetTableLayout: resetRentLayout, applyColumnWidths: applyRentWidths, columnOrder: rentOrder, setColumnOrder: setRentOrder, applyColumnOrder: applyRentOrder, sortModel: rentSortModel, handleSortModelChange: handleRentSortChange, filterModel: rentFilterModel, handleFilterModelChange: handleRentFilterChange, handleColumnWidthChange: handleRentWidthChange } = useTableState('payments_rent_col_visibility');
  const { columnVisibility: landlordColVis, handleColumnVisibilityChange: handleLandlordColVisChange, resetTableLayout: resetLandlordLayout, applyColumnWidths: applyLandlordWidths, columnOrder: landlordOrder, setColumnOrder: setLandlordOrder, applyColumnOrder: applyLandlordOrder, sortModel: landlordSortModel, handleSortModelChange: handleLandlordSortChange, filterModel: landlordFilterModel, handleFilterModelChange: handleLandlordFilterChange, handleColumnWidthChange: handleLandlordWidthChange } = useTableState('payments_landlord_col_visibility');
  const { columnVisibility: depositsColVis, handleColumnVisibilityChange: handleDepositsColVisChange, resetTableLayout: resetDepositsLayout, applyColumnWidths: applyDepositsWidths, columnOrder: depositsOrder, setColumnOrder: setDepositsOrder, applyColumnOrder: applyDepositsOrder, sortModel: depositsSortModel, handleSortModelChange: handleDepositsSortChange, filterModel: depositsFilterModel, handleFilterModelChange: handleDepositsFilterChange, handleColumnWidthChange: handleDepositsWidthChange } = useTableState('payments_deposits_col_visibility');
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [landlordPayments, setLandlordPayments] = useState<LandlordPayment[]>([]);
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [ledger, setLedger] = useState<ReceivablesLedgerRow[]>([]);
  const [refundQueue, setRefundQueue] = useState<DepositRefundQueueRow[]>([]);
  const [markReceivedId, setMarkReceivedId] = useState<string | null>(null);
  const [markRefundCompleteId, setMarkRefundCompleteId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  // All of these live in the URL: this page unmounts on navigation, so component
  // state was being lost every time the user visited another section and returned.
  const [search, setSearch] = useDebouncedQueryParamState('q');
  const [monthFilter, setMonthFilter] = useQueryParamState<string>('rmonth', '');
  const [yearFilter, setYearFilter] = useQueryParamState<string>('ryear', '');
  const [landlordMonthFilter, setLandlordMonthFilter] = useQueryParamState<string>('lmonth', '');
  const [landlordYearFilter, setLandlordYearFilter] = useQueryParamState<string>('lyear', '');
  const [depositTypeFilter, setDepositTypeFilter] = useQueryParamState<'receipt' | 'refund' | 'all'>(
    'dtype', 'all', ['receipt', 'refund', 'all'],
  );
  const [depositStatusFilter, setDepositStatusFilter] = useQueryParamState<'pending' | 'done' | 'all'>(
    'dstatus', 'all', ['pending', 'done', 'all'],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [columnReorderOpen, setColumnReorderOpen] = useState(false);

  const loadReferenceData = () => {
    getProperties().then(setProperties).catch(() => {});
    getResidents().then(setResidents).catch(() => {});
    getBeds().then(setBeds).catch(() => {});
    getLandlords().then(setLandlords).catch(() => {});
    Promise.all([getBookings('active'), getBookings('upcoming'), getBookings('completed')])
      .then(([a, u, c]) => setBookings([...a, ...u, ...c]))
      .catch(() => {});
  };

  // Wait for the flags before the first fetch, so the ledger gate in load() is decided
  // on real values rather than the provider's optimistic "enabled" default.
  useEffect(() => {
    if (!flagsLoaded) return;
    load();
    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagsLoaded]);

  /**
   * Refresh everything after a mutation.
   *
   * Each fetch settles on its own and failures are swallowed, because this runs *after*
   * a save and the dialogs report whatever it throws as a save failure. Two of these
   * endpoints 403 for perfectly ordinary users — /rent-payments/ledger is gated on the
   * `receivables_ledger` flag, and /deposit-transactions/refund-queue is restricted to
   * sysadmin/manager/administrator — so an uncaught Promise.all here surfaced "This
   * feature is currently disabled" on a save that had already succeeded, and left the
   * dialog open as though it had not.
   */
  const load = async () => {
    const settle = <T,>(p: Promise<T>, apply: (v: T) => void) => p.then(apply).catch(() => {});
    await Promise.all([
      settle(getRentPayments(), setRentPayments),
      settle(getLandlordPayments(), setLandlordPayments),
      settle(getDepositTransactions(), setDeposits),
      // Don't even ask for the ledger when the flag is off — it can only 403.
      receivablesLedgerEnabled ? settle(getReceivablesLedger(), setLedger) : Promise.resolve(),
      settle(getDepositRefundQueue(), setRefundQueue),
    ]);
  };

  const handleMarkReceived = async () => {
    if (!markReceivedId) return;
    await markRentPaymentReceived(markReceivedId);
    setMarkReceivedId(null);
    await load();
  };

  const handleMarkRefundComplete = async () => {
    if (!markRefundCompleteId) return;
    await completeDepositRefund(markRefundCompleteId);
    setMarkRefundCompleteId(null);
    await load();
  };

  const propertyById = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);
  const residentById = useMemo(() => new Map(residents.map(r => [r.id, r])), [residents]);
  const bedById = useMemo(() => new Map(beds.map(b => [b.id, b])), [beds]);
  const landlordById = useMemo(() => new Map(landlords.map(l => [l.id, l])), [landlords]);
  const bookingById = useMemo(() => new Map(bookings.map(b => [b.id, b])), [bookings]);
  const refundQueueById = useMemo(() => new Map(refundQueue.map(q => [q.depositTransactionId, q])), [refundQueue]);

  const bedCodeForBed = (bed?: Bed) => bedCode(bed);
  const bedCodeForBooking = (bookingId?: string | null) => {
    if (!bookingId) return '';
    const booking = bookingById.get(bookingId);
    return booking ? bedCodeForBed(bedById.get(booking.bedId)) : '';
  };

  const rentColumns: GridColDef[] = [
    { field: 'month', headerName: 'Month', width: 100 },
    {
      field: 'property', headerName: 'Property', width: 120,
      valueGetter: (_v, row) => propertyById.get((row as RentPayment).propertyId)?.code ?? '',
    },
    {
      field: 'residentName', headerName: 'Resident Name', minWidth: 160, flex: 1,
      valueGetter: (_v, row) => residentById.get((row as RentPayment).residentId)?.fullName ?? '',
    },
    {
      field: 'bedCode', headerName: 'Bed Code', width: 110,
      valueGetter: (_v, row) => bedCodeForBooking((row as RentPayment).bookingId),
    },
    { field: 'rentAmount', headerName: 'Rent (€)', width: 100, type: 'number' },
    { field: 'amountPaid', headerName: 'Paid (€)', width: 100, type: 'number' },
    { field: 'paymentDueDay', headerName: 'Rent Due Day', width: 110, type: 'number' },
    statusColumn('lateStatus', 'Late Status', 130, statusOptions(LATE_STATUSES, rentPayments, 'lateStatus')),
    statusColumn('paymentStatus', 'Payment Status', 130, statusOptions(PAYMENT_STATUSES, rentPayments, 'paymentStatus')),
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => <Box>
        {can('payment:edit') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
        {can('payment:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box> },
  ];

  const landlordColumns: GridColDef[] = [
    { field: 'month', headerName: 'Month', width: 100 },
    {
      field: 'landlordName', headerName: 'Landlord', minWidth: 150, flex: 1,
      valueGetter: (_v, row) => landlordById.get((row as LandlordPayment).landlordId)?.name ?? '',
    },
    {
      field: 'propertyCode', headerName: 'Property Code', width: 120,
      valueGetter: (_v, row) => propertyById.get((row as LandlordPayment).propertyId)?.code ?? '',
    },
    {
      field: 'paymentDay', headerName: 'Payment Day', width: 100,
      valueGetter: (_v, row) => {
        const prop = propertyById.get((row as LandlordPayment).propertyId);
        return prop?.landlordPaymentDueDay ? `${prop.landlordPaymentDueDay}${prop.landlordPaymentDueDay === 1 ? 'st' : prop.landlordPaymentDueDay === 2 ? 'nd' : prop.landlordPaymentDueDay === 3 ? 'rd' : 'th'}` : '—';
      },
    },
    { field: 'amountDue', headerName: 'Due (€)', width: 100, type: 'number' },
    { field: 'amountPaid', headerName: 'Paid (€)', width: 100, type: 'number' },
    { field: 'dateDue', headerName: 'Due Date', width: 110 },
    { field: 'iban', headerName: 'IBAN', width: 180 },
    {
      field: 'paymentReference', headerName: 'Payment Reference', width: 160,
      valueGetter: (_v, row) => propertyById.get((row as LandlordPayment).propertyId)?.paymentReference ?? '',
    },
    { field: 'notes', headerName: 'Notes', minWidth: 160, flex: 1 },
    statusColumn('status', 'Status', 110, statusOptions(LANDLORD_STATUSES, landlordPayments, 'status')),
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => <Box>
        {can('payment:edit') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
        {can('payment:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box> },
  ];

  const ledgerColumns: GridColDef[] = [
    { field: 'month', headerName: 'Month', width: 90 },
    { field: 'propertyCode', headerName: 'Property', width: 100 },
    { field: 'residentName', headerName: 'Resident', minWidth: 160, flex: 1 },
    { field: 'amountDue', headerName: 'Amount Due (€)', width: 130, type: 'number' },
    { field: 'dueDate', headerName: 'Due Date', width: 110 },
    {
      field: 'daysOverdue', headerName: 'Days Overdue', width: 120, type: 'number',
      renderCell: (p) => {
        const v = p.value as number;
        if (v <= 0) return null;
        return <Chip label={v} size="small" color={v >= 4 ? 'error' : 'warning'} />;
      },
    },
    {
      field: 'escalation', headerName: 'Escalation Status', minWidth: 200, flex: 1,
      valueGetter: (_v, row) => {
        const r = row as ReceivablesLedgerRow;
        if (r.d4NoticeSentAt) return `D+4 notice sent ${new Date(r.d4NoticeSentAt).toLocaleDateString()}`;
        if (r.d1ReminderSentAt) return `D+1 reminder sent ${new Date(r.d1ReminderSentAt).toLocaleDateString()}`;
        return '—';
      },
    },
    {
      field: 'actions', headerName: '', width: 160, sortable: false,
      renderCell: (params) => (
        can('payment:edit') &&
        <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => setMarkReceivedId((params.row as ReceivablesLedgerRow).paymentId)}>
          Mark Received
        </Button>
      ),
    },
  ];

  const depositColumns: GridColDef[] = [
    {
      field: 'type', headerName: 'Type', width: 90,
      type: 'singleSelect', valueOptions: statusOptions(DEPOSIT_TYPES, deposits, 'type'),
      renderCell: (p) => <Chip label={p.value} color={p.value === 'refund' ? 'warning' : 'success'} size="small" />,
    },
    { field: 'residentName', headerName: 'Resident', minWidth: 160, flex: 1 },
    {
      field: 'propertyCode', headerName: 'Property Code', width: 120,
      valueGetter: (_v, row) => propertyById.get((row as DepositTransaction).propertyId)?.code ?? '',
    },
    {
      field: 'businessUnit', headerName: 'Business Unit', width: 100,
      valueGetter: (_v, row) => propertyById.get((row as DepositTransaction).propertyId)?.bu ?? '',
    },
    {
      field: 'bedCode', headerName: 'Bed Code', width: 110,
      valueGetter: (_v, row) => bedCodeForBed(bedById.get((row as DepositTransaction).bedId ?? '')),
    },
    { field: 'depositAmount', headerName: 'Deposit Amount (€)', width: 150, type: 'number' },
    { field: 'proRataRentAmount', headerName: 'Pro Rata Rent (€)', width: 140, type: 'number' },
    { field: 'iban', headerName: 'IBAN', width: 180 },
    { field: 'checkoutDate', headerName: 'Checkout Date', width: 120 },
    {
      field: 'refundDueDate', headerName: 'Refund Due', width: 150,
      renderCell: (params) => {
        const row = params.row as DepositTransaction;
        if (row.type !== 'refund' || row.status !== 'pending' || !row.refundDueDate) return null;
        const days = refundQueueById.get(row.id)?.businessDaysRemaining;
        const color = days == null ? 'default' : days < 0 ? 'error' : days <= 1 ? 'warning' : 'success';
        const label = days == null
          ? row.refundDueDate
          : days < 0 ? `${row.refundDueDate} · overdue` : days === 0 ? `${row.refundDueDate} · due today` : `${row.refundDueDate} · ${days}d left`;
        return <Chip label={label} color={color as any} size="small" />;
      },
    },
    { field: 'comments', headerName: 'Comments', minWidth: 160, flex: 1 },
    statusColumn('status', 'Status', 100, statusOptions(DEPOSIT_STATUSES, deposits, 'status')),
    { field: 'dateProcessed', headerName: 'Processed', width: 120 },
    { field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: (params) => (
        <Box>
          {can('payment:edit') && <IconButton size="small" onClick={() => { setEditing(params.row); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>}
          {can('payment:write') && <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
        </Box>
      ) },
  ];

  const rentColumnsWithWidthsAndOrder = useMemo(() => {
    const withWidths = applyRentWidths(rentColumns);
    return applyRentOrder(withWidths);
  }, [rentColumns, applyRentWidths, applyRentOrder]);

  const landlordColumnsWithWidthsAndOrder = useMemo(() => {
    const withWidths = applyLandlordWidths(landlordColumns);
    return applyLandlordOrder(withWidths);
  }, [landlordColumns, applyLandlordWidths, applyLandlordOrder]);

  const depositColumnsWithWidthsAndOrder = useMemo(() => {
    const withWidths = applyDepositsWidths(depositColumns);
    return applyDepositsOrder(withWidths);
  }, [depositColumns, applyDepositsWidths, applyDepositsOrder]);

  // The reorder dialog acts on whichever grid is currently in front. Header
  // drag-reorder is Pro-only on the Community DataGrid, so this dialog is the
  // only way to set the order that applyColumnOrder already persists and applies.
  const activeTable =
    activeSlug === 'rent'
      ? { columns: rentColumnsWithWidthsAndOrder, order: rentOrder, setOrder: setRentOrder, reset: resetRentLayout }
      : activeSlug === 'landlord'
        ? { columns: landlordColumnsWithWidthsAndOrder, order: landlordOrder, setOrder: setLandlordOrder, reset: resetLandlordLayout }
        : { columns: depositColumnsWithWidthsAndOrder, order: depositsOrder, setOrder: setDepositsOrder, reset: resetDepositsLayout };

  const q = search.toLowerCase();
  const filteredRent = rentPayments
    .filter(r => !monthFilter || r.month?.slice(5, 7) === monthFilter)
    .filter(r => !yearFilter || r.month?.slice(0, 4) === yearFilter)
    .filter(r => {
      if (!q) return true;
      const residentName = residentById.get(r.residentId)?.fullName ?? '';
      const bedCode = bedCodeForBooking(r.bookingId);
      return [r.month, residentName, bedCode].some(v => v?.toLowerCase().includes(q));
    });
  const filteredLandlord = landlordPayments
    .filter(l => !landlordMonthFilter || l.month?.slice(5, 7) === landlordMonthFilter)
    .filter(l => !landlordYearFilter || l.month?.slice(0, 4) === landlordYearFilter)
    .filter(l => {
      if (!q) return true;
      const landlordName = landlordById.get(l.landlordId)?.name ?? '';
      const propertyCode = propertyById.get(l.propertyId)?.code ?? '';
      return [l.month, landlordName, propertyCode].some(v => v?.toLowerCase().includes(q));
    });
  const filteredDeposits = deposits
    .filter(d => {
      if (depositTypeFilter === 'receipt' || depositTypeFilter === 'refund') {
        return d.type === depositTypeFilter;
      }
      return true;
    })
    .filter(d => {
      if (depositStatusFilter === 'pending' || depositStatusFilter === 'done') {
        return d.status === depositStatusFilter;
      }
      return true;
    })
    .filter(d => [d.residentName, d.type].some(v => v?.toLowerCase().includes(q)));

  const rentYears = useMemo(
    () => Array.from(new Set(rentPayments.map(r => r.month?.slice(0, 4)).filter(Boolean))).sort().reverse(),
    [rentPayments],
  );

  const landlordYears = useMemo(
    () => Array.from(new Set(landlordPayments.map(l => l.month?.slice(0, 4)).filter(Boolean))).sort().reverse(),
    [landlordPayments],
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    // Keyed on the slug rather than the tab index: the ledger tab has no delete
    // button, and an index-based `else` would have sent its rows to the deposits
    // endpoint if the tabs were ever reordered.
    if (activeSlug === 'rent') await deleteRentPayment(deleteId);
    else if (activeSlug === 'landlord') await deleteLandlordPayment(deleteId);
    else if (activeSlug === 'deposits') await deleteDepositTransaction(deleteId);
    else { setDeleteId(null); return; }
    setDeleteId(null);
    await load();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>Payments</Typography>
        {tab === 0 && (
          <>
            <TextField select size="small" label="Month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} sx={{ width: 140 }}>
              <MenuItem value="">All</MenuItem>
              {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Year" value={yearFilter} onChange={e => setYearFilter(e.target.value)} sx={{ width: 110 }}>
              <MenuItem value="">All</MenuItem>
              {rentYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </>
        )}
        {tab === 1 && (
          <>
            <TextField select size="small" label="Month" value={landlordMonthFilter} onChange={e => setLandlordMonthFilter(e.target.value)} sx={{ width: 140 }}>
              <MenuItem value="">All</MenuItem>
              {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Year" value={landlordYearFilter} onChange={e => setLandlordYearFilter(e.target.value)} sx={{ width: 110 }}>
              <MenuItem value="">All</MenuItem>
              {landlordYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </>
        )}
        {tab === 2 && (
          <>
            <ButtonGroup size="small">
              {(['receipt', 'refund', 'all'] as const).map(v => (
                <Button key={v} variant={depositTypeFilter === v ? 'contained' : 'outlined'} onClick={() => setDepositTypeFilter(v)}>
                  {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
                </Button>
              ))}
            </ButtonGroup>
            <ButtonGroup size="small">
              {(['pending', 'done', 'all'] as const).map(v => (
                <Button key={v} variant={depositStatusFilter === v ? 'contained' : 'outlined'} onClick={() => setDepositStatusFilter(v)}>
                  {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
                </Button>
              ))}
            </ButtonGroup>
          </>
        )}
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        {tab !== 3 && <Tooltip title="Reorder columns"><IconButton size="small" onClick={() => setColumnReorderOpen(true)}><ViewWeekIcon fontSize="small" /></IconButton></Tooltip>}
        {tab === 0 && <Tooltip title="Reset column layout to default"><IconButton size="small" onClick={resetRentLayout}><RestoreIcon fontSize="small" /></IconButton></Tooltip>}
        {tab === 1 && <Tooltip title="Reset column layout to default"><IconButton size="small" onClick={resetLandlordLayout}><RestoreIcon fontSize="small" /></IconButton></Tooltip>}
        {tab === 2 && <Tooltip title="Reset column layout to default"><IconButton size="small" onClick={resetDepositsLayout}><RestoreIcon fontSize="small" /></IconButton></Tooltip>}
        {tab !== 3 && can('payment:edit') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>Add</Button>}
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Resident Payments" />
        <Tab label="Landlord Payments" />
        <Tab label="Deposits" />
        {receivablesLedgerEnabled && <Tab label="Receivables Ledger" />}
      </Tabs>
      {tab === 0 && <DataGrid rows={filteredRent} columns={rentColumnsWithWidthsAndOrder} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} columnVisibilityModel={rentColVis} onColumnVisibilityModelChange={handleRentColVisChange} sortModel={rentSortModel} onSortModelChange={handleRentSortChange} filterModel={pruneStaleFilters(rentFilterModel, rentColumnsWithWidthsAndOrder)} onFilterModelChange={handleRentFilterChange} onColumnWidthChange={(p) => handleRentWidthChange(p.colDef.field, p.width)} slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />}
      {tab === 1 && <DataGrid rows={filteredLandlord} columns={landlordColumnsWithWidthsAndOrder} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} columnVisibilityModel={landlordColVis} onColumnVisibilityModelChange={handleLandlordColVisChange} sortModel={landlordSortModel} onSortModelChange={handleLandlordSortChange} filterModel={pruneStaleFilters(landlordFilterModel, landlordColumnsWithWidthsAndOrder)} onFilterModelChange={handleLandlordFilterChange} onColumnWidthChange={(p) => handleLandlordWidthChange(p.colDef.field, p.width)} slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />}
      {tab === 2 && <DataGrid rows={filteredDeposits} columns={depositColumnsWithWidthsAndOrder} getRowId={r => r.id} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} columnVisibilityModel={depositsColVis} onColumnVisibilityModelChange={handleDepositsColVisChange} sortModel={depositsSortModel} onSortModelChange={handleDepositsSortChange} filterModel={pruneStaleFilters(depositsFilterModel, depositColumnsWithWidthsAndOrder)} onFilterModelChange={handleDepositsFilterChange} onColumnWidthChange={(p) => handleDepositsWidthChange(p.colDef.field, p.width)} slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />}
      {tab === 3 && receivablesLedgerEnabled && <DataGrid rows={ledger} columns={ledgerColumns} getRowId={r => r.paymentId} autoHeight disableRowSelectionOnClick pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [25, 50] } }} />}
      {tab === 0 && <RentPaymentDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onChanged={load} onSave={async (data, id) => { if (id) await updateRentPayment(id, data); else await createRentPayment(data); await load(); }} />}
      {tab === 1 && <LandlordPaymentDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={async (data, id) => { if (id) await updateLandlordPayment(id, data); else await createLandlordPayment(data); await load(); }} />}
      {tab === 2 && <DepositTransactionDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSave={async (data, id) => { if (id) await updateDepositTransaction(id, data); else await createDepositTransaction(data); await load(); }} />}
      <ColumnReorderDialog
        open={columnReorderOpen}
        columns={activeTable.columns}
        columnOrder={activeTable.order}
        onReorder={activeTable.setOrder}
        onReset={activeTable.reset}
        onClose={() => setColumnReorderOpen(false)}
      />
      <ConfirmDialog open={!!deleteId} title="Delete Payment" message="This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <ConfirmDialog
        open={!!markReceivedId} title="Mark as Received"
        message="Confirm this rent charge has been received via bank reconciliation? This will stop further overdue reminder emails for it."
        onConfirm={handleMarkReceived} onCancel={() => setMarkReceivedId(null)}
      />
      <ConfirmDialog
        open={!!markRefundCompleteId} title="Mark Refund Complete"
        message="Confirm this deposit refund has been paid out to the resident? This will email the resident and cannot be undone."
        onConfirm={handleMarkRefundComplete} onCancel={() => setMarkRefundCompleteId(null)}
      />
    </Box>
  );
}

export default function PaymentsPage() {
  // useSearchParams bails out of prerendering, so the part of the tree that reads
  // it needs a Suspense boundary or the production build fails.
  return (
    <Suspense fallback={<Typography variant="h5" sx={{ fontWeight: 700 }}>Payments</Typography>}>
      <PaymentsContent />
    </Suspense>
  );
}
