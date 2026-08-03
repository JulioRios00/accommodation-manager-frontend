'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Chip, MenuItem, Paper, TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BedIcon from '@mui/icons-material/Bed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import RadarIcon from '@mui/icons-material/Radar';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EuroIcon from '@mui/icons-material/Euro';
import BarChartIcon from '@mui/icons-material/BarChart';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import StatsCard from '@/components/dashboard/StatsCard';
import XlsxUploader from '@/components/upload/XlsxUploader';
import { getDashboardStats, getProperties, getBeds, DashboardStats, Bed, Property } from '@/services/api';
import { useRole } from '@/hooks/useRole';

const PROPERTY_TYPES = ['House', 'Apartment', 'Duplex', 'Studio Block', 'Other'];
const AVAILABILITY_WINDOWS = [
  { label: 'All', days: 0 },
  { label: 'Next 30 days', days: 30 },
  { label: 'Next 60 days', days: 60 },
  { label: 'Next 90 days', days: 90 },
];

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

export default function DashboardPage() {
  const { can } = useRole();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [availWindow, setAvailWindow] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [s, props, bds] = await Promise.all([getDashboardStats(), getProperties(), getBeds()]);
      setStats(s);
      setProperties(props);
      setBeds(bds);
    } catch { /* backend not ready */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Per-property occupancy + revenue breakdown ──────────────────────────
  const propertyRows = useMemo(() => {
    const now = Date.now();
    const windowEnd = availWindow > 0 ? now + availWindow * 86400000 : null;

    return properties
      .filter(p => {
        if (typeFilter && p.propertyType !== typeFilter) return false;
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
          available: total - occupied,
          occupancyRate,
          monthly,
          onRadar,
        };
      });
  }, [properties, beds, typeFilter, areaFilter, availWindow]);

  // ── Filtered beds DataGrid ──────────────────────────────────────────────
  const allowedPropertyIds = useMemo(
    () => new Set(propertyRows.map(r => r.id)),
    [propertyRows],
  );

  const bedRows = useMemo(() => {
    return beds
      .filter(b => !typeFilter && !areaFilter && !availWindow ? true : allowedPropertyIds.has(b.propertyId))
      .map(bed => ({
        id: bed.id,
        bedCode: `${bed.propertyCode ?? '?'}-${bed.bedNumber}`,
        bedroomType: bed.bedroomType,
        sex: bed.sex,
        bedSize: bed.bedSize,
        rentAmount: bed.rentAmount,
        depositAmount: bed.depositAmount,
        status: bed.activeBooking ? 'Occupied' : 'Available',
        residentName: bed.activeBooking?.resident?.fullName ?? '—',
        checkIn: formatDate(bed.activeBooking?.checkInDate),
        contractEnd: formatDate(bed.activeBooking?.contractEndDate),
        daysLeft: daysUntil(bed.activeBooking?.contractEndDate),
      }));
  }, [beds, allowedPropertyIds, typeFilter, areaFilter, availWindow]);

  // ── Filtered totals for second KPI row ─────────────────────────────────
  const filteredMonthly = useMemo(() => propertyRows.reduce((s, r) => s + r.monthly, 0), [propertyRows]);
  const filteredOccupied = useMemo(() => propertyRows.reduce((s, r) => s + r.occupied, 0), [propertyRows]);
  const filteredTotal = useMemo(() => propertyRows.reduce((s, r) => s + r.total, 0), [propertyRows]);
  const filteredOccupancyRate = filteredTotal > 0 ? Math.round((filteredOccupied / filteredTotal) * 100) : 0;
  const filtersActive = !!(typeFilter || areaFilter || availWindow);

  const propertyColumns: GridColDef[] = [
    { field: 'code', headerName: 'Code', width: 90, renderCell: p => <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.value as string}</Typography> },
    { field: 'address', headerName: 'Address', minWidth: 200, flex: 1 },
    { field: 'type', headerName: 'Type', width: 120 },
    { field: 'area', headerName: 'Area', width: 120 },
    { field: 'total', headerName: 'Beds', width: 70, type: 'number' },
    { field: 'occupied', headerName: 'Occupied', width: 90, type: 'number' },
    { field: 'available', headerName: 'Available', width: 90, type: 'number' },
    {
      field: 'occupancyRate', headerName: 'Occupancy %', width: 120, type: 'number',
      renderCell: p => {
        const v = p.value as number;
        const color = v >= 90 ? '#2e7d32' : v >= 60 ? '#ef6c00' : '#c62828';
        return <Chip label={`${v}%`} size="small" sx={{ bgcolor: color, color: 'white', fontWeight: 700, fontSize: 12 }} />;
      },
    },
    { field: 'onRadar', headerName: 'On Radar', width: 90, type: 'number' },
    {
      field: 'monthly', headerName: 'Monthly Rev.', width: 130, type: 'number',
      renderCell: p => <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(p.value as number)}</Typography>,
    },
  ];

  const bedColumns: GridColDef[] = [
    {
      field: 'bedCode', headerName: 'Bed', width: 110,
      renderCell: p => <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{p.value as string}</Typography>,
    },
    {
      field: 'status', headerName: 'Status', width: 110,
      renderCell: p => (
        <Chip label={p.value as string} color={p.value === 'Occupied' ? 'success' : 'default'} size="small" sx={{ fontWeight: 500 }} />
      ),
    },
    { field: 'residentName', headerName: 'Resident', minWidth: 160, flex: 1 },
    { field: 'bedroomType', headerName: 'Room Type', width: 130 },
    { field: 'sex', headerName: 'Sex', width: 70 },
    { field: 'bedSize', headerName: 'Bed Size', width: 90 },
    { field: 'rentAmount', headerName: 'Rent (€)', width: 95, type: 'number' },
    { field: 'depositAmount', headerName: 'Deposit (€)', width: 105, type: 'number' },
    { field: 'checkIn', headerName: 'Check-in', width: 105 },
    { field: 'contractEnd', headerName: 'Contract End', width: 120 },
    {
      field: 'daysLeft', headerName: 'Days Left', width: 95, type: 'number',
      renderCell: p => {
        const v = p.value as number | null;
        if (v === null) return '—';
        if (v < 0) return <Chip label="Ended" size="small" color="error" />;
        if (v <= 38) return <Chip label={`${v}d`} size="small" color="warning" />;
        return <Typography variant="body2">{v}d</Typography>;
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Dashboard</Typography>
        {can('import') && (
          <Button
            variant="outlined" size="small" startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(v => !v)}
            sx={{ borderColor: '#114C5A', color: '#114C5A', whiteSpace: 'nowrap' }}
          >
            Import XLSX
          </Button>
        )}
      </Box>

      {/* ── Global KPI cards (step 3: occupancy; step 4: revenue) ─────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(8, 1fr)' }, gap: 1.5, mb: 3 }}>
        <StatsCard title="Properties"    value={stats?.totalProperties ?? 0}  icon={<ApartmentIcon />}   color="#114C5A" />
        <StatsCard title="Total Beds"    value={stats?.totalBeds ?? 0}         icon={<BedIcon />}         color="#114C5A" />
        <StatsCard title="Occupied"      value={stats?.occupiedBeds ?? 0}      icon={<CheckCircleIcon />} color="#2e7d32" />
        <StatsCard title="Available"     value={stats?.availableBeds ?? 0}     icon={<DoNotDisturbIcon />}color="#ef6c00" />
        <StatsCard title="On Radar"      value={stats?.onRadarBeds ?? 0}       icon={<RadarIcon />}       color="#c62828" />
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

      {/* ── Step 2: Filters ──────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mr: 1 }}>Filter properties:</Typography>
          <TextField
            select label="Property Type" value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            size="small" sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All types</MenuItem>
            {PROPERTY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
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
            <Button size="small" onClick={() => { setTypeFilter(''); setAreaFilter(''); setAvailWindow(0); }}>
              Clear
            </Button>
          )}
        </Box>

        {/* ── Filtered KPIs ── */}
        {filtersActive && (
          <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Properties matching</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{propertyRows.length}</Typography>
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

      {/* ── Per-property occupancy & revenue breakdown (steps 3 + 4) ──────── */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Property Occupancy &amp; Revenue</Typography>
        <Typography variant="body2" color="text.secondary">{propertyRows.length} propert{propertyRows.length !== 1 ? 'ies' : 'y'}</Typography>
      </Box>
      <Box sx={{ height: 320, mb: 3 }}>
        <DataGrid
          rows={propertyRows}
          columns={propertyColumns}
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{
            border: '1px solid #e0e0e0',
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6', fontWeight: 700 },
            '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
          }}
        />
      </Box>

      {/* ── Bed-level list (filtered) ───────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>All Beds</Typography>
        <Typography variant="body2" color="text.secondary">{bedRows.length} bed{bedRows.length !== 1 ? 's' : ''}</Typography>
      </Box>
      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <Box sx={{ height: 500, minWidth: 900, bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <DataGrid
            rows={bedRows}
            columns={bedColumns}
            pageSizeOptions={[25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6', fontWeight: 700 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
