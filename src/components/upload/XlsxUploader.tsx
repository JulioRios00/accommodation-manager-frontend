'use client';
import { useState, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { importXlsx } from '@/services/api';

interface XlsxUploaderProps {
  onImported?: () => void;
  endpoint?: string;
  label?: string;
  accept?: string;
}

export default function XlsxUploader({ onImported, endpoint, label, accept = '.xlsx,.xlsm' }: XlsxUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await importXlsx(file, endpoint);
      setMessage({ type: 'success', text: result.message });
      onImported?.();
    } catch {
      setMessage({ type: 'error', text: 'Failed to import file. Please try again.' });
    } finally {
      setLoading(false);
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
    </Box>
  );
}
