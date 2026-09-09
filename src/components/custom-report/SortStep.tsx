'use client';
import { Box, Typography, TextField, MenuItem, IconButton, Button, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { ReportFieldMeta, ReportSort } from '@/services/api';

interface Props {
  fields: ReportFieldMeta[];
  sort: ReportSort[];
  onChange: (sort: ReportSort[]) => void;
}

export default function SortStep({ fields, sort, onChange }: Props) {
  const sortableFields = fields.filter(f => f.sortable);

  const addSort = () => {
    const used = new Set(sort.map(s => s.field));
    const next = sortableFields.find(f => !used.has(f.key));
    if (!next) return;
    onChange([...sort, { field: next.key, direction: 'ASC' }]);
  };

  const update = (index: number, patch: Partial<ReportSort>) => {
    const next = sort.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const remove = (index: number) => onChange(sort.filter((_, i) => i !== index));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= sort.length) return;
    const next = sort.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Sort order</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addSort} disabled={sort.length >= sortableFields.length}>
          Add sort key
        </Button>
      </Box>

      {!sort.length && (
        <Typography variant="body2" color="text.secondary">No sort applied — rows return in default order.</Typography>
      )}

      {sort.map((s, index) => (
        <Paper key={index} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>{index + 1}.</Typography>
          <TextField
            select label="Field" size="small" value={s.field} sx={{ minWidth: 200 }}
            onChange={e => update(index, { field: e.target.value })}
          >
            {sortableFields.map(f => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
          </TextField>
          <TextField
            select label="Direction" size="small" value={s.direction} sx={{ minWidth: 140 }}
            onChange={e => update(index, { direction: e.target.value as 'ASC' | 'DESC' })}
          >
            <MenuItem value="ASC">Ascending</MenuItem>
            <MenuItem value="DESC">Descending</MenuItem>
          </TextField>
          <IconButton size="small" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUpwardIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => move(index, 1)} disabled={index === sort.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => remove(index)}><DeleteIcon fontSize="small" /></IconButton>
        </Paper>
      ))}
    </Box>
  );
}
