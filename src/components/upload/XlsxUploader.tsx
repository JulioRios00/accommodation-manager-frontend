'use client';
import { useState, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import {
  importXlsx, startImportJob, getImportJobStatus,
  downloadImportIssueReport, downloadImportIssueReportFor,
  type ImportSkipReason,
} from '@/services/api';

interface XlsxUploaderProps {
  onImported?: () => void;
  endpoint?: string;
  label?: string;
  accept?: string;
  /** Runs the import as a background job and polls for the result instead of
   *  awaiting the upload response directly — needed for imports large enough
   *  to outlast a proxy's request timeout (e.g. Accommodation Control). */
  background?: boolean;
}

const POLL_INTERVAL_MS = 3000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function XlsxUploader({ onImported, endpoint, label, accept = '.xlsx,.xlsm', background }: XlsxUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // How to fetch the "what didn't import" file for the run just finished. A job id when the
  // import ran in the background, the returned result when it answered directly — null when
  // every row went in, so the button only appears if there is something to look at.
  const [issues, setIssues] = useState<{ jobId: string } | { result: { message?: string; skipReasons?: ImportSkipReason[] } } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileAsync = async (file: File) => {
    const { jobId } = await startImportJob(file, endpoint);
    for (;;) {
      await sleep(POLL_INTERVAL_MS);
      const job = await getImportJobStatus(jobId, endpoint);
      if (job.status === 'completed') {
        setMessage({ type: 'success', text: job.result?.message ?? 'Import complete.' });
        const skipped = (job.result?.skipReasons as ImportSkipReason[] | undefined) ?? [];
        if (skipped.length) setIssues({ jobId });
        onImported?.();
        return;
      }
      if (job.status === 'failed') {
        setMessage({ type: 'error', text: job.error ?? 'Failed to import file. Please try again.' });
        return;
      }
    }
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setMessage(null);
    setIssues(null);
    try {
      if (background) {
        await handleFileAsync(file);
      } else {
        const result = await importXlsx(file, endpoint);
        setMessage({ type: 'success', text: result.message });
        if (result.skipReasons?.length) setIssues({ result });
        onImported?.();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to import file. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!issues) return;
    setDownloading(true);
    try {
      await ('jobId' in issues ? downloadImportIssueReport(issues.jobId, endpoint) : downloadImportIssueReportFor(issues.result));
    } catch {
      // The job behind a background import is discarded an hour after it finishes, which
      // is the likeliest reason this fails — say what to do rather than just "error".
      setMessage({ type: 'error', text: 'Could not build the report. If the import finished over an hour ago, run it again and download straight away.' });
    } finally {
      setDownloading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <Box>
      <Box
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: '2px dashed #1a237e',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          '&:hover': { bgcolor: '#f3f4f6' },
        }}
      >
        <UploadFileIcon sx={{ fontSize: 40, color: '#1a237e' }} />
        <Typography variant="body1" sx={{ mt: 1 }}>
          {label ?? 'Drag & drop an XLSX file here, or click to select'}
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </Box>
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2">Importing...</Typography>
        </Box>
      )}
      {message && (
        <Alert severity={message.type} sx={{ mt: 1 }}>
          {message.text}
        </Alert>
      )}
      {issues && (
        <Button
          size="small"
          startIcon={downloading ? <CircularProgress size={14} /> : <DownloadIcon />}
          onClick={handleDownload}
          disabled={downloading}
          sx={{ mt: 1 }}
        >
          Download rows that were not imported
        </Button>
      )}
    </Box>
  );
}
