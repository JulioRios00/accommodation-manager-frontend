'use client';
import { Box, Typography, TextField, MenuItem, IconButton, Button, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { ReportFieldMeta, ReportFilter, ReportFilterOperator, OPERATORS_BY_TYPE } from '@/services/api';

interface Props {
  fields: ReportFieldMeta[];
  filters: ReportFilter[];
  onChange: (filters: ReportFilter[]) => void;
}

const OPERATOR_LABELS: Record<ReportFilterOperator, string> = {
  '=': 'equals', '!=': 'not equals', '>': 'greater than', '>=': 'greater or equal',
  '<': 'less than', '<=': 'less or equal', contains: 'contains', in: 'is one of (comma-separated)',
};

export default function FilterStep({ fields, filters, onChange }: Props) {
  const filterableFields = fields.filter(f => f.filterable);

  const addFilter = () => {
    const first = filterableFields[0];
    if (!first) return;
    onChange([...filters, { field: first.key, operator: OPERATORS_BY_TYPE[first.type][0], value: '' }]);
  };

  const updateFilter = (index: number, patch: Partial<ReportFilter>) => {
    const next = filters.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeFilter = (index: number) => onChange(filters.filter((_, i) => i !== index));

  const fieldFor = (key: string) => fields.find(f => f.key === key);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Filters (combined with AND)</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addFilter} disabled={!filterableFields.length}>Add filter</Button>
      </Box>

      {!filters.length && (
        <Typography variant="body2" color="text.secondary">No filters — the report will include all rows.</Typography>
      )}

      {filters.map((filter, index) => {
        const field = fieldFor(filter.field);
        const operators = field ? OPERATORS_BY_TYPE[field.type] : [];
        return (
          <Paper key={index} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              select label="Field" size="small" value={filter.field} sx={{ minWidth: 180 }}
              onChange={e => {
                const newField = fieldFor(e.target.value);
                updateFilter(index, { field: e.target.value, operator: newField ? OPERATORS_BY_TYPE[newField.type][0] : '=' });
              }}
            >
              {filterableFields.map(f => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
            </TextField>

            <TextField
              select label="Operator" size="small" value={filter.operator} sx={{ minWidth: 200 }}
              onChange={e => updateFilter(index, { operator: e.target.value as ReportFilterOperator })}
            >
              {operators.map(op => <MenuItem key={op} value={op}>{OPERATOR_LABELS[op]}</MenuItem>)}
            </TextField>

            {field?.type === 'enum' && field.enumValues ? (
              <TextField
                select label="Value" size="small" value={String(filter.value ?? '')} sx={{ minWidth: 160 }}
                onChange={e => updateFilter(index, { value: e.target.value })}
              >
                {field.enumValues.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            ) : field?.type === 'boolean' ? (
              <TextField
                select label="Value" size="small" value={String(filter.value ?? 'true')} sx={{ minWidth: 120 }}
                onChange={e => updateFilter(index, { value: e.target.value === 'true' })}
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
            ) : (
              <TextField
                label="Value" size="small" value={String(filter.value ?? '')} sx={{ minWidth: 180 }}
                type={field?.type === 'date' ? 'date' : field?.type === 'number' || field?.type === 'currency' ? 'number' : 'text'}
                slotProps={field?.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
                onChange={e => updateFilter(index, { value: e.target.value })}
              />
            )}

            <IconButton size="small" color="error" onClick={() => removeFilter(index)}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        );
      })}
    </Box>
  );
}
