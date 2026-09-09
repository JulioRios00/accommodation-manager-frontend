'use client';
import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, Stepper, Step, StepLabel, Button } from '@mui/material';
import EntityFieldStep from '@/components/custom-report/EntityFieldStep';
import FilterStep from '@/components/custom-report/FilterStep';
import SortStep from '@/components/custom-report/SortStep';
import PreviewStep from '@/components/custom-report/PreviewStep';
import {
  ReportEntityMeta, ReportFieldMeta, ReportEntityKey, ReportFilter, ReportSort, ReportQueryRequest,
  getReportEntities, getReportEntityFields,
} from '@/services/api';

const STEPS = ['Entity & Fields', 'Filters', 'Sort', 'Preview & Export'];

// Shaped exactly like the API payload so a future "save this report for reuse" feature can
// persist this object as-is without a state-shape rewrite.
interface ReportConfig {
  entity: ReportEntityKey | '';
  fields: string[];
  filters: ReportFilter[];
  sort: ReportSort[];
}

export default function CustomReportBuilderPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [entities, setEntities] = useState<ReportEntityMeta[]>([]);
  const [fields, setFields] = useState<ReportFieldMeta[]>([]);
  const [config, setConfig] = useState<ReportConfig>({ entity: '', fields: [], filters: [], sort: [] });

  useEffect(() => { getReportEntities().then(setEntities).catch(() => {}); }, []);

  const selectEntity = useCallback((entity: ReportEntityKey) => {
    setConfig({ entity, fields: [], filters: [], sort: [] });
    getReportEntityFields(entity).then(setFields).catch(() => setFields([]));
  }, []);

  const selectedFields = fields.filter(f => config.fields.includes(f.key));

  const request: ReportQueryRequest = {
    entity: (config.entity || 'properties') as ReportEntityKey,
    fields: config.fields,
    filters: config.filters,
    sort: config.sort,
  };

  const canGoNext = [
    !!config.entity && config.fields.length > 0,
    true,
    true,
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Custom Report Builder</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pick a data entity, choose fields, filter and sort, then preview and export to PDF or XLSX.
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        {activeStep === 0 && (
          <EntityFieldStep
            entities={entities}
            selectedEntity={config.entity}
            onSelectEntity={selectEntity}
            fields={fields}
            selectedFields={config.fields}
            onChangeFields={f => setConfig(c => ({ ...c, fields: f }))}
          />
        )}
        {activeStep === 1 && (
          <FilterStep fields={fields} filters={config.filters} onChange={f => setConfig(c => ({ ...c, filters: f }))} />
        )}
        {activeStep === 2 && (
          <SortStep fields={fields} sort={config.sort} onChange={s => setConfig(c => ({ ...c, sort: s }))} />
        )}
        {activeStep === 3 && <PreviewStep fields={selectedFields} request={request} />}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={activeStep === 0} onClick={() => setActiveStep(s => s - 1)}>Back</Button>
        <Button
          variant="contained"
          disabled={activeStep === STEPS.length - 1 || !canGoNext[activeStep]}
          onClick={() => setActiveStep(s => s + 1)}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}
