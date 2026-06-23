'use client';
import { useEffect, useState, useCallback } from 'react';
import { Typography, Box, Chip, Button } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BedIcon from '@mui/icons-material/Bed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import RadarIcon from '@mui/icons-material/Radar';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import StatsCard from '@/components/dashboard/StatsCard';
import XlsxUploader from '@/components/upload/XlsxUploader';
import { getDashboardStats, getBeds, DashboardStats, Bed } from '@/services/api';
import { useRole } from '@/hooks/useRole';

const bedColumns: GridColDef[] = [
  {
    field: 'bedCode',
    headerName: 'Bed Code',
    width: 110,
    renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
        {params.value as string}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    renderCell: (params) => (
      <Chip
        label={params.value as string}
        color={params.value === 'Occupied' ? 'success' : 'default'}
        size="small"
        sx={{ fontWeight: 500 }}
      />
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
];

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

export default function DashboardPage() {
  const { can } = useRole();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([getDashboardStats(), getBeds()]);
      setStats(s);
      setBeds(b);
    } catch { /* backend not ready */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const rows = beds.map((bed) => ({
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
  }));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        {can('import') && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen((v) => !v)}
            sx={{ borderColor: '#114C5A', color: '#114C5A', whiteSpace: 'nowrap' }}
          >
            Import XLSX
          </Button>
        )}
      </Box>

      {/* KPI cards — responsive grid: 2 cols mobile, 3 cols tablet, 5 cols desktop */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <StatsCard title="Properties" value={stats?.totalProperties ?? 0} icon={<ApartmentIcon />}   color="#114C5A" />
        <StatsCard title="Total Beds" value={stats?.totalBeds ?? 0}       icon={<BedIcon />}         color="#114C5A" />
        <StatsCard title="Occupied"   value={stats?.occupiedBeds ?? 0}    icon={<CheckCircleIcon />} color="#2e7d32" />
        <StatsCard title="Available"  value={stats?.availableBeds ?? 0}   icon={<DoNotDisturbIcon />}color="#ef6c00" />
        <StatsCard title="On Radar"   value={stats?.onRadarBeds ?? 0}     icon={<RadarIcon />}       color="#c62828" />
      </Box>

      {/* Collapsible import */}
      {importOpen && (
        <Box sx={{ mb: 3 }}>
          <XlsxUploader onImported={() => { loadData(); setImportOpen(false); }} />
        </Box>
      )}

      {/* Table header row */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          All Beds
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {beds.length} beds
        </Typography>
      </Box>

      {/* Horizontally scrollable on mobile */}
      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <Box
          sx={{
            height: 500,
            minWidth: 700,
            bgcolor: 'white',
            borderRadius: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <DataGrid
            rows={rows}
            columns={bedColumns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
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
