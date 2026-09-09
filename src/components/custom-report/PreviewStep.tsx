'use client';
import { useState } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import PreviewIcon from '@mui/icons-material/Preview';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import CustomGridFooter from '@/components/shared/CustomGridFooter';
import {
  ReportFieldMeta, ReportQueryRequest, ReportPreviewResult,
  previewCustomReport, exportCustomReportPdf, exportCustomReportXlsx,
} from '@/services/api';

interface Props {
  fields: ReportFieldMeta[];
  request: ReportQueryRequest;
}

export default function PreviewStep({ fields, request }: Props) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [result, setResult] = useState<ReportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await previewCustomReport(request));
    } catch {
      setError('Failed to generate preview. Please check your filters and try again.');
    } finally {
      setLoading(false);
    }
  };

  const runExport = async (format: 'pdf' | 'xlsx') => {
    setExporting(format);
    setError(null);
    try {
      await (format === 'pdf' ? exportCustomReportPdf(request) : exportCustomReportXlsx(request));
    } catch {
      setError(`Failed to export ${format.toUpperCase()}. Please try again.`);
    } finally {
      setExporting(null);
    }
  };

  const columns: GridColDef[] = fields.map(field => ({
    field: field.key,
    headerName: field.label,
    minWidth: 130,
    flex: 1,
    valueFormatter: field.type === 'boolean'
      ? (value: unknown) => (value ? 'Yes' : 'No')
      : undefined,
  }));

  const rows = (result?.rows ?? []).map((row, index) => ({ id: index, ...row }));

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<PreviewIcon />} onClick={generatePreview} disabled={loading || !fields.length}>
          Generate Preview
        </Button>
        <Button
          variant="outlined" startIcon={exporting === 'xlsx' ? <CircularProgress size={16} /> : <TableChartIcon />}
          onClick={() => runExport('xlsx')} disabled={!!exporting || !fields.length}
        >
          Export XLSX
        </Button>
        <Button
          variant="outlined" startIcon={exporting === 'pdf' ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
          onClick={() => runExport('pdf')} disabled={!!exporting || !fields.length}
        >
          Export PDF
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Generating preview…</Typography>
        </Box>
      )}

      {result && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">{result.total} total row{result.total !== 1 ? 's' : ''}</Typography>
            {result.capped && (
              <Alert severity="warning" sx={{ py: 0 }}>
                Showing the first {result.rows.length} rows — export to get all {result.total}.
              </Alert>
            )}
          </Box>
          <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <DataGrid
              autoHeight rows={rows} columns={columns} disableRowSelectionOnClick
              pageSizeOptions={[25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              slots={{ footer: CustomGridFooter }} slotProps={{ footer: { pageSizeOptions: [25, 50] } }}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': { bgcolor: '#FFF0E6', fontWeight: 700 },
                '& .MuiDataGrid-row:hover': { bgcolor: '#FDEEDE' },
              }}
            />
          </Box>
        </>
      )}
    </Box>
  );
}
