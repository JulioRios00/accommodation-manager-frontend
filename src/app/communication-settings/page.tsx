'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert, Divider, Chip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { getEmailTemplate, saveEmailTemplate, EmailTemplateKey, EMAIL_TEMPLATE_VARIABLES } from '@/services/api';

const SAMPLE_VALUES: Record<string, string> = {
  residentName: 'Ana Silva',
  amountDue: '€470.00',
  dueDate: '05/09/2026',
  daysOverdue: '4',
};

const TEMPLATES: { key: EmailTemplateKey; label: string }[] = [
  { key: 'd1_reminder', label: 'D+1 Reminder' },
  { key: 'd4_urgent', label: 'D+4 Urgent Overdue' },
];

function unsupportedVariables(text: string): string[] {
  const found = new Set<string>();
  const re = /\{\{(\w+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!(EMAIL_TEMPLATE_VARIABLES as readonly string[]).includes(m[1])) found.add(m[1]);
  }
  return [...found];
}

function renderPreview(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (full, name) => SAMPLE_VALUES[name] ?? full);
}

function TemplateEditor({ templateKey, label }: { templateKey: EmailTemplateKey; label: string }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getEmailTemplate(templateKey).then(t => { setSubject(t.subject); setBody(t.body); }).catch(() => {});
  }, [templateKey]);

  const badVars = [...new Set([...unsupportedVariables(subject), ...unsupportedVariables(body)])];

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveEmailTemplate(templateKey, { subject, body });
      setMessage({ type: 'success', text: 'Template saved — takes effect on the next scheduled run.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Failed to save template.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{label}</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <TextField label="Subject" fullWidth size="small" value={subject} onChange={e => setSubject(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Body (HTML)" fullWidth multiline minRows={8} value={body} onChange={e => setBody(e.target.value)} />
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Available variables: </Typography>
            {EMAIL_TEMPLATE_VARIABLES.map(v => (
              <Chip key={v} label={`{{${v}}}`} size="small" sx={{ mr: 0.5, fontFamily: 'monospace' }} />
            ))}
          </Box>
          {badVars.length > 0 && (
            <Alert severity="error" sx={{ mt: 1 }}>
              Unsupported variable(s): {badVars.map(v => `{{${v}}}`).join(', ')}
            </Alert>
          )}
          {message && <Alert severity={message.type} sx={{ mt: 1 }}>{message.text}</Alert>}
          <Button
            variant="contained" startIcon={<SaveIcon />} sx={{ mt: 2 }}
            disabled={saving || badVars.length > 0}
            onClick={handleSave}
          >
            Save
          </Button>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">Live preview (sample data)</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{renderPreview(subject)}</Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
            <div dangerouslySetInnerHTML={{ __html: renderPreview(body) }} />
          </Paper>
        </Box>
      </Box>
    </Paper>
  );
}

export default function CommunicationSettingsPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Communication Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Edit the automated overdue-rent reminder emails sent by the daily escalation job.
      </Typography>
      {TEMPLATES.map(t => <TemplateEditor key={t.key} templateKey={t.key} label={t.label} />)}
    </Box>
  );
}
