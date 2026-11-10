'use client';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  /** Defaults to 'Delete' — every caller but the bed activation one is a deletion. */
  confirmLabel?: string;
  confirmColor?: 'error' | 'primary' | 'success';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel, confirmColor, onConfirm, onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title ?? 'Confirm'}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} color={confirmColor ?? 'error'} variant="contained">
          {confirmLabel ?? 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
