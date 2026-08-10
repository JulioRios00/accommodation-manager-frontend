'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Chip, IconButton, MenuItem, Paper, TextField,
  Tooltip, Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridColumnVisibilityModel, GridColumnResizeParams } from '@mui/x-data-grid';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BedIcon from '@mui/icons-material/Bed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import RadarIcon from '@mui/icons-material/Radar';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EuroIcon from '@mui/icons-material/Euro';
import BarChartIcon from '@mui/icons-material/BarChart';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RestoreIcon from '@mui/icons-material/Restore';
import ClearIcon from '@mui/icons-material/Clear';
import StatsCard from '@/components/dashboard/StatsCard';
import XlsxUploader from '@/components/upload/XlsxUploader';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import { getDashboardStats, getProperties, getBeds, getResidents, getCompanies, DashboardStats, Bed, Property, Resident } from '@/services/api';
import { useRole } from '@/hooks/useRole';

const PROPERTY_TYPES = ['House', 'Apartment', 'Duplex', 'Studio Block', 'Other'];
const AVAILABILITY_WINDOWS = [
  { label: 'All', days: 0 },
  { label: 'Next 30 days', days: 30 },
  { label: 'Next 60 days', days: 60 },
  { label: 'Next 90 days', days: 90 },
];

const PROP_COL_VIS_KEY = 'dashboard_property_col_visibility';
const PROP_COL_DIM_KEY = 'dashboard_property_col_dimensions';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function Cell({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>{children}</Box>;
}

function CellCenter({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>{children}</Box>;
}

export default function DashboardPage() {
  const { can } = useRole();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [buOptions, setBuOptions] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState('');
  const [buFilter, setBuFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [availWindow, setAvailWindow] = useState(0);
  const [statusFilter, setStatusFilter] = useState(''); // 'occupied' | 'onradar' | 'available' | ''

  // Property table selection (for drilling into beds)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Column visibility persistence
  const [propColVis, setPropColVis] = useState<GridColumnVisibilityModel>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const s = localStorage.getItem(PROP_COL_VIS_KEY);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  // Column width persistence — read once on mount via lazy initializer
  const [initialColDimensions] = useState<Record<string, { width: number }>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const s = localStorage.getItem(PROP_COL_DIM_KEY);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  // Key to force-remount property grid (used by reset)
  const [propGridKey, setPropGridKey] = useState(0);

  const handlePropColVisChange = useCallback((model: GridColumnVisibilityModel) => {
    setPropColVis(model);
    try { localStorage.setItem(PROP_COL_VIS_KEY, JSON.stringify(model)); } catch { }
  }, []);

  const handleColumnWidthChange = useCallback((params: GridColumnResizeParams) => {
    try {
      const stored = localStorage.getItem(PROP_COL_DIM_KEY);
      const dims: Record<string, { width: number }> = stored ? JSON.parse(stored) : {};
      dims[params.colDef.field] = { width: params.width };
      localStorage.setItem(PROP_COL_DIM_KEY, JSON.stringify(dims));
    } catch { }
  }, []);

  const resetPropView = () => {
    setPropColVis({});
    setPropGridKey(k => k + 1);
    try {
      localStorage.removeItem(PROP_COL_VIS_KEY);
      localStorage.removeItem(PROP_COL_DIM_KEY);
    } catch { }
  };

  const residentMap = useMemo(() => new Map(residents.map(r => [r.id, r.fullName])), [residents]);

  const loadData = useCallback(async () => {
    try {
      const [s, props, bds, res, comps] = await Promise.all([
        getDashboardStats(), getProperties(), getBeds(), getResidents(), getCompanies(),
      ]);
      setStats(s);
      setProperties(props);
      setBeds(bds);
      setResidents(res);
      setBuOptions((comps.map(c => c.bu).filter(Boolean) as string[]).sort());
    } catch { }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Per-property occupancy + revenue breakdown ───────────────────────────
  const propertyRows = useMemo(() => {
    const now = Date.now();
    const windowEnd = availWindow > 0 ? now + availWindow * 86400000 : null;

    return properties
      .filter(p => {
        if (typeFilter && p.propertyType !== typeFilter) return false;
        if (buFilter && p.bu !== buFilter) return false;
        if (areaFilter) {
          const needle = areaFilter.toLowerCase();
          const haystack = [p.area, p.fullAddress, p.code].join(' ').toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        if (windowEnd) {
          const propertyBeds = beds.filter(b => b.propertyId === p.id);
          const hasBecomingAvailable = propertyBeds.some(b => {
            const end = b.activeBooking?.contractEndDate;
            if (!end) return false;
            const t = new Date(end).getTime();
            return t >= now && t <= windowEnd;
          });
          if (!hasBecomingAvailable) return false;
        }
        return true;
      })
      .map(p => {
        const propertyBeds = beds.filter(b => b.propertyId === p.id);
        const occupied = propertyBeds.filter(b => b.status === 'allocated').length;
        const total = propertyBeds.length;
        const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
        const monthly = propertyBeds
          .filter(b => b.status === 'allocated')
          .reduce((s, b) => s + (b.rentAmount ?? 0), 0);
        const onRadar = propertyBeds.filter(b => {
          const d = daysUntil(b.activeBooking?.contractEndDate);
          return d !== null && d >= 0 && d <= 38;
        }).length;
        return {
          id: p.id,
          code: p.code,
          address: p.fullAddress ?? p.area ?? '—',
          type: p.propertyType ?? '—',
          area: p.area ?? '—',
          total,
          occupied,
          empty: total - occupied,
          occupancyRate,
          monthly,
          onRadar,
        };
      });
  }, [properties, beds, typeFilter, buFilter, areaFilter, availWindow]);

  // ── Status filter on propertyRows ────────────────────────────────────────
  const filteredPropertyRows = useMemo(() => {
    if (!statusFilter) return propertyRows;
    return propertyRows.filter(row => {
      if (statusFilter === 'occupied') return row.occupied > 0;
      if (statusFilter === 'available') return row.empty > 0;
      if (statusFilter === 'onradar') return row.onRadar > 0;
      return true;
    });
  }, [propertyRows, statusFilter]);

  // ── Allowed property IDs for bed filter ─────────────────────────────────
  const allowedPropertyIds = useMemo(
    () => new Set(filteredPropertyRows.map(r => r.id)),
    [filteredPropertyRows],
  );

  // ── Bed rows (filtered by property filter + optional property drill-down) ─
  const bedRows = useMemo(() => {
    const filtersActive = !!(typeFilter || buFilter || areaFilter || availWindow || statusFilter);
    return beds
      .filter(b => {
        if (selectedPropertyId) return b.propertyId === selectedPropertyId;
        if (filtersActive) return allowedPropertyIds.has(b.propertyId);
        return true;
      })
      .filter(b => {
        if (statusFilter === 'occupied') return b.status === 'allocated';
        if (statusFilter === 'available') return b.status !== 'allocated';
        if (statusFilter === 'onradar') {
          const d = daysUntil(b.activeBooking?.contractEndDate);
          return d !== null && d >= 0 && d <= 38;
        }
        return true;
      })
      .map(bed => ({
        id: bed.id,
        bedCode: `${bed.propertyCode ?? '?'}-${bed.bedNumber}`,
        bedroomType: bed.bedroomType,
        sex: bed.sex,
        bedSize: bed.bedSize,
        rentAmount: bed.rentAmount,
        depositAmount: bed.depositAmount,
        status: bed.status === 'allocated' ? 'Occupied' : 'Empty',
        residentName: bed.activeBooking?.residentId ? (residentMap.get(bed.activeBooking.residentId) ?? '—') : '—',
        checkIn: formatDate(bed.activeBooking?.checkInDate),
        contractEnd: formatDate(bed.activeBooking?.contractEndDate),
        daysLeft: daysUntil(bed.activeBooking?.contractEndDate),
      }));
  }, [beds, residentMap, allowedPropertyIds, selectedPropertyId, typeFilter, buFilter, areaFilter, availWindow, statusFilter]);

  // ── Filtered totals ──────────────────────────────────────────────────────
  const filteredMonthly = useMemo(() => filteredPropertyRows.reduce((s, r) => s + r.monthly, 0), [filteredPropertyRows]);
  const filteredOccupied = useMemo(() => filteredPropertyRows.reduce((s, r) => s + r.occupied, 0), [filteredPropertyRows]);
  const filteredTotal = useMemo(() => filteredPropertyRows.reduce((s, r) => s + r.total, 0), [filteredPropertyRows]);
  const filteredOccupancyRate = filteredTotal > 0 ? Math.round((filteredOccupied / filteredTotal) * 100) : 0;
  const filtersActive = !!(typeFilter || buFilter || areaFilter || availWindow || statusFilter);

  // Selected property for drill-down
  const selectedProperty = selectedPropertyId ? properties.find(p => p.id === selectedPropertyId) : null;

  const propertyColumns: GridColDef[] = [
    { field: 'code', headerName: 'Code', width: 90, renderCell: p => <Cell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.value as string}</Typography></Cell> },
    { field: 'address', headerName: 'Address', minWidth: 200, flex: 1 },
    { field: 'type', headerName: 'Type', width: 120 },
    { field: 'area', headerName: 'Area', width: 120 },
    { field: 'total', headerName: 'Beds', width: 70, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as number}</CellCenter> },
    { field: 'occupied', headerName: 'Occupied', width: 90, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as number}</CellCenter> },
    { field: 'empty', headerName: 'Empty', width: 80, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as number}</CellCenter> },
    {
      field: 'occupancyRate', headerName: 'Occupancy', width: 110, align: 'center', headerAlign: 'center',
      renderCell: p => {
        const v = p.value as number;
        const color = v >= 90 ? '#2e7d32' : v >= 60 ? '#ef6c00' : '#c62828';
        return <CellCenter><Chip label={`${v}%`} size="small" sx={{ bgcolor: color, color: 'white', fontWeight: 700, fontSize: 12 }} /></CellCenter>;
      },
    },
    { field: 'onRadar', headerName: 'On Radar', width: 90, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as number}</CellCenter> },
    {
      field: 'monthly', headerName: 'Monthly Rev.', width: 130, align: 'center', headerAlign: 'center',
      renderCell: p => <CellCenter><Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(p.value as number)}</Typography></CellCenter>,
    },
  ];

  const bedColumns: GridColDef[] = [
    {
      field: 'bedCode', headerName: 'Bed', width: 110,
      renderCell: p => <Cell><Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{p.value as string}</Typography></Cell>,
    },
    {
      field: 'status', headerName: 'Status', width: 110,
      renderCell: p => (
        <Cell>
          <Chip
            label={p.value as string}
            size="small"
            sx={p.value === 'Occupied'
              ? { bgcolor: '#2e7d32', color: 'white', fontWeight: 500 }
              : { bgcolor: '#d32f2f', color: 'white', fontWeight: 500 }
            }
          />
        </Cell>
      ),
    },
    { field: 'residentName', headerName: 'Resident', minWidth: 160, flex: 1 },
    { field: 'bedroomType', headerName: 'Room Type', width: 130, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as string}</CellCenter> },
    { field: 'sex', headerName: 'Gender', width: 80, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as string}</CellCenter> },
    { field: 'bedSize', headerName: 'Bed Size', width: 90, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as string}</CellCenter> },
    { field: 'rentAmount', headerName: 'Rent (€)', width: 95, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as number}</CellCenter> },
    { field: 'depositAmount', headerName: 'Deposit (€)', width: 105, align: 'center', headerAlign: 'center', renderCell: p => <CellCenter>{p.value as number}</CellCenter> },
    { field: 'checkIn', headerName: 'Check-in', width: 105 },
    { field: 'contractEnd', headerName: 'Contract End', width: 120 },
    {
      field: 'daysLeft', headerName: 'Days Left', width: 95, align: 'center', headerAlign: 'center',
      renderCell: p => {
        const v = p.value as number | null;
        if (v === null) return <CellCenter>—</CellCenter>;
        if (v < 0) return <CellCenter><Chip label="Ended" size="small" color="error" /></CellCenter>;
        if (v <= 38) return <CellCenter><Chip label={`${v}d`} size="small" color="warning" /></CellCenter>;
        return <CellCenter><Typography variant="body2">{v}d</Typography></CellCenter>;
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Dashboard</Typography>
        {can('import:write') && (
          <Button
            variant="outlined" size="small" startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(v => !v)}
            sx={{ borderColor: '#114C5A', color: '#114C5A', whiteSpace: 'nowrap' }}
          >
            Import XLSX
          </Button>
        )}
      </Box>

      {/* ── Global KPI cards ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(8, 1fr)' }, gap: 1.5, mb: 3 }}>
        <StatsCard title="Properties"    value={stats?.totalProperties ?? 0}  icon={<ApartmentIcon />}   color="#114C5A" />
        <StatsCard title="Total Beds"    value={stats?.totalBeds ?? 0}         icon={<BedIcon />}         color="#114C5A" />
        <StatsCard
          title="Occupied" value={stats?.occupiedBeds ?? 0} icon={<CheckCircleIcon />} color="#2e7d32"
          onClick={() => setStatusFilter(s => s === 'occupied' ? '' : 'occupied')}
          active={statusFilter === 'occupied'}
        />
        <StatsCard
          title="Empty" value={stats?.availableBeds ?? 0} icon={<DoNotDisturbIcon />} color="#d32f2f"
          onClick={() => setStatusFilter(s => s === 'available' ? '' : 'available')}
          active={statusFilter === 'available'}
        />
        <StatsCard
          title="On Radar" value={stats?.onRadarBeds ?? 0} icon={<RadarIcon />} color="#ef6c00"
          onClick={() => setStatusFilter(s => s === 'onradar' ? '' : 'onradar')}
          active={statusFilter === 'onradar'}
        />
        <StatsCard title="Occupancy"     value={`${stats?.occupancyRate ?? 0}%`} icon={<BarChartIcon />}  color="#6a1b9a" />
        <StatsCard title="Monthly Rev."  value={fmt(stats?.monthlyRevenue ?? 0)}  icon={<EuroIcon />}     color="#1565c0" />
        <StatsCard title="Projected Rev." value={fmt(stats?.projectedRevenue ?? 0)} icon={<TrendingUpIcon />} color="#00695c" />
      </Box>

      {/* Collapsible import */}
      {importOpen && (
        <Box sx={{ mb: 3 }}>
          <XlsxUploader onImported={() => { loadData(); setImportOpen(false); }} />
        </Box>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mr: 1 }}>Filter properties:</Typography>
          <TextField
            select label="BU" value={buFilter}
            onChange={e => setBuFilter(e.target.value)}
            size="small" sx={{ minWidth: 120 }}
          >
            <MenuItem value="">All BUs</MenuItem>
            {buOptions.map(bu => <MenuItem key={bu} value={bu}>{bu}</MenuItem>)}
          </TextField>
          <TextField
            select label="Property Type" value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            size="small" sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All types</MenuItem>
            {PROPERTY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField
            select label="Status" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            size="small" sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="occupied"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} />Occupied</Box></MenuItem>
            <MenuItem value="onradar"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef6c00' }} />On Radar</Box></MenuItem>
            <MenuItem value="available"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#d32f2f' }} />Empty</Box></MenuItem>
          </TextField>
          <TextField
            label="Area / Location" value={areaFilter}
            onChange={e => setAreaFilter(e.target.value)}
            size="small" placeholder="Search area or address…" sx={{ minWidth: 200 }}
          />
          <TextField
            select label="Becoming Available"
            value={availWindow}
            onChange={e => setAvailWindow(Number(e.target.value))}
            size="small" sx={{ minWidth: 180 }}
          >
            {AVAILABILITY_WINDOWS.map(w => <MenuItem key={w.days} value={w.days}>{w.label}</MenuItem>)}
          </TextField>
          {filtersActive && (
            <Button size="small" onClick={() => { setTypeFilter(''); setBuFilter(''); setAreaFilter(''); setAvailWindow(0); setStatusFilter(''); }}>
              Clear
            </Button>
          )}
        </Box>

        {/* ── Filtered KPIs ── */}
        {filtersActive && (
          <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Properties matching</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{filteredPropertyRows.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Beds (filtered)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{filteredTotal}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Occupancy (filtered)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#6a1b9a' }}>{filteredOccupancyRate}%</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Monthly Revenue (filtered)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1565c0' }}>{fmt(filteredMonthly)}</Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* ── Property Occupancy & Revenue ─────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Property Occupancy &amp; Revenue</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">{filteredPropertyRows.length} propert{filteredPropertyRows.length !== 1 ? 'ies' : 'y'}</Typography>
          <Tooltip title="Reset column layout"><IconButton size="small" onClick={resetPropView}><RestoreIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      </Box>
      <Box sx={{ height: 320, mb: 3 }}>
        <DataGrid
          key={propGridKey}
          rows={filteredPropertyRows}
          columns={propertyColumns}
          pageSizeOptions={[10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            columns: { dimensions: initialColDimensions },
          }}
          disableRowSelectionOnClick
          columnVisibilityModel={propColVis}
          onColumnVisibilityModelChange={handlePropColVisChange}
          onColumnWidthChange={handleColumnWidthChange}
          onRowDoubleClick={params => setSelectedPropertyId(id => id === params.row.id ? null : params.row.id)}
          slots={{ footer: CustomGridFooter }}
          slotProps={{ footer: { pageSizeOptions: [10, 25] } }}
          sx={{
            border: '1px solid #e0e0e0',
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6', fontWeight: 700 },
            '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer > button:has(.MuiDataGrid-sortIcon)': { display: 'none' },
          }}
        />
      </Box>

      {/* ── Bed-level list ───────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {selectedProperty ? `Beds on ${selectedProperty.code}` : 'All Beds'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">{bedRows.length} bed{bedRows.length !== 1 ? 's' : ''}</Typography>
          {selectedPropertyId && (
            <Tooltip title="Clear property filter">
              <IconButton size="small" onClick={() => setSelectedPropertyId(null)}><ClearIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      {selectedPropertyId && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Showing beds for {selectedProperty?.code ?? ''} — double-click a property row again to clear, or use ✕ above.
        </Typography>
      )}
      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <Box sx={{ height: 500, minWidth: 900, bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <DataGrid
            rows={bedRows}
            columns={bedColumns}
            pageSizeOptions={[25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            slots={{ footer: CustomGridFooter }}
            slotProps={{ footer: { pageSizeOptions: [25, 50] } }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6', fontWeight: 700 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
              '& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer > button:has(.MuiDataGrid-sortIcon)': { display: 'none' },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
