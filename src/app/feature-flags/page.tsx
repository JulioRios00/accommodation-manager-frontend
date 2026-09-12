'use client';
import { useState } from 'react';
import { Box, Typography, Paper, Switch, FormControlLabel, Chip, Alert } from '@mui/material';
import { setFeatureFlag, FeatureFlag } from '@/services/api';
import { useFeatureFlags } from '@/lib/FeatureFlagsProvider';
import { useRole } from '@/hooks/useRole';

export default function FeatureFlagsPage() {
  const { flags, refresh } = useFeatureFlags();
  const { can } = useRole();
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (flag: FeatureFlag) => {
    setToggling(flag.key);
    setError(null);
    try {
      await setFeatureFlag(flag.key, !flag.enabled);
      await refresh();
    } catch {
      setError(`Failed to update "${flag.label}". You may not have permission to change this.`);
    } finally {
      setToggling(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Feature Flags</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Kill switches for the Financial Reconciliation module (UC-501/UC-502). Turning a flag off
        immediately hides its nav entry for everyone and blocks its API at the server — a fast
        way to disable a feature without a deploy or rollback.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!can('user:edit') && <Alert severity="info" sx={{ mb: 2 }}>You can view these flags, but only sysadmin/manager can change them.</Alert>}

      {flags.map(flag => (
        <Paper key={flag.key} variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{flag.label}</Typography>
              <Chip label={flag.enabled ? 'Enabled' : 'Disabled'} size="small" color={flag.enabled ? 'success' : 'default'} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{flag.description}</Typography>
            {flag.updatedAt && (
              <Typography variant="caption" color="text.secondary">
                Last changed {new Date(flag.updatedAt).toLocaleString()}
              </Typography>
            )}
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={flag.enabled}
                disabled={!can('user:edit') || toggling === flag.key}
                onChange={() => handleToggle(flag)}
              />
            }
            label=""
          />
        </Paper>
      ))}
    </Box>
  );
}
