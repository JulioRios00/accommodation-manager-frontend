'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert, Stack } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import { updateCompanyProfile } from '@/services/api';
import { useCompanyProfile, DEFAULT_APP_NAME } from '@/lib/CompanyProfileProvider';
import { useRole } from '@/hooks/useRole';

const MAX_NAME_LENGTH = 60;
/** Matches the server's cap on the stored data URL. Base64 inflates by about 4/3,
 *  so this is roughly 384KB of actual image. */
const MAX_LOGO_DATA_URL_LENGTH = 512 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

export default function CompanyProfilePage() {
  const { appName, logoDataUrl, loaded, setProfile } = useCompanyProfile();
  const { can } = useRole();
  const editable = can('companyProfile:edit');

  const [name, setName] = useState(appName);
  const [logo, setLogo] = useState<string | null>(logoDataUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Seed the form once the provider's first fetch lands, so it doesn't start on
  // the default name and then jump.
  useEffect(() => {
    if (!loaded) return;
    setName(appName);
    setLogo(logoDataUrl);
  }, [loaded, appName, logoDataUrl]);

  const pickFile = (file: File) => {
    setError(null);
    setSaved(false);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Logo must be a PNG, JPEG, SVG or WebP image.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError('Could not read that file.');
    reader.onload = () => {
      const result = String(reader.result ?? '');
      if (result.length > MAX_LOGO_DATA_URL_LENGTH) {
        setError('That image is too large (max ~384KB). Try a smaller or more compressed file.');
        return;
      }
      setLogo(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const profile = await updateCompanyProfile({ appName: name.trim(), logoDataUrl: logo });
      setProfile(profile); // updates the sidebar immediately
      setSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save the company profile.');
    } finally {
      setSaving(false);
    }
  };

  const trimmed = name.trim();
  const dirty = trimmed !== appName || logo !== logoDataUrl;
  const canSave = editable && dirty && trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH && !saving;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Company Profile Setup</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        The name and logo shown at the top of the sidebar. Changes apply for everyone as soon as
        they are saved.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saved && !dirty && <Alert severity="success" sx={{ mb: 2 }}>Company profile saved.</Alert>}
      {!editable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You can view the company profile, but only a sysadmin can change it.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 640 }}>
        <TextField
          label="Application name"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false); }}
          disabled={!editable}
          fullWidth
          size="small"
          slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
          helperText={
            trimmed.length === 0
              ? 'Required — this replaces the name in the sidebar.'
              : `${name.length}/${MAX_NAME_LENGTH}. Leave as "${DEFAULT_APP_NAME}" to keep the default.`
          }
          error={trimmed.length === 0}
          sx={{ mb: 3 }}
        />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Logo</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Square images work best — it renders at 28×28 next to the name. PNG, JPEG, SVG or WebP, up to ~384KB.
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 1, alignItems: 'center' }}>
          <Box
            sx={{
              width: 56, height: 56, borderRadius: 1.5, flexShrink: 0,
              border: '1px dashed', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: '#424242', overflow: 'hidden',
            }}
          >
            {logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logo} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>None</Typography>}
          </Box>

          <Button
            variant="outlined" size="small" startIcon={<UploadIcon />}
            disabled={!editable} onClick={() => fileInput.current?.click()}
          >
            {logo ? 'Replace' : 'Upload'}
          </Button>
          {!!logo && (
            <Button
              variant="text" size="small" color="error" startIcon={<DeleteIcon />}
              disabled={!editable} onClick={() => { setLogo(null); setSaved(false); }}
            >
              Remove
            </Button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            hidden
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) pickFile(file);
              // Reset so picking the same file again still fires onChange.
              e.target.value = '';
            }}
          />
        </Stack>
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          variant="text"
          disabled={!editable || !dirty || saving}
          onClick={() => { setName(appName); setLogo(logoDataUrl); setError(null); setSaved(false); }}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
