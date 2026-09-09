'use client';
import {
  Box, Typography, TextField, MenuItem, Checkbox, FormControlLabel, Button, Paper,
} from '@mui/material';
import { ReportEntityMeta, ReportFieldMeta, ReportEntityKey } from '@/services/api';

interface Props {
  entities: ReportEntityMeta[];
  selectedEntity: ReportEntityKey | '';
  onSelectEntity: (entity: ReportEntityKey) => void;
  fields: ReportFieldMeta[];
  selectedFields: string[];
  onChangeFields: (fields: string[]) => void;
}

export default function EntityFieldStep({
  entities, selectedEntity, onSelectEntity, fields, selectedFields, onChangeFields,
}: Props) {
  const toggleField = (key: string) => {
    onChangeFields(
      selectedFields.includes(key) ? selectedFields.filter(f => f !== key) : [...selectedFields, key],
    );
  };

  return (
    <Box>
      <TextField
        select label="Data Entity" value={selectedEntity}
        onChange={e => onSelectEntity(e.target.value as ReportEntityKey)}
        size="small" sx={{ minWidth: 280, mb: 3 }}
      >
        {entities.map(e => <MenuItem key={e.key} value={e.key}>{e.label}</MenuItem>)}
      </TextField>

      {selectedEntity && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Fields to include</Typography>
            <Box>
              <Button size="small" onClick={() => onChangeFields(fields.map(f => f.key))}>Select all</Button>
              <Button size="small" onClick={() => onChangeFields([])}>Clear all</Button>
            </Box>
          </Box>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 0.5 }}>
              {fields.map(field => (
                <FormControlLabel
                  key={field.key}
                  control={<Checkbox checked={selectedFields.includes(field.key)} onChange={() => toggleField(field.key)} />}
                  label={field.label}
                />
              ))}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
