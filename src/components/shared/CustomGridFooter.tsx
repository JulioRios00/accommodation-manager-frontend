'use client';
import { HTMLAttributes } from 'react';
import { Box, IconButton, MenuItem, Select, Typography } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  GridFooterContainer,
  useGridApiContext,
  useGridSelector,
  gridPaginationModelSelector,
  gridPaginationRowCountSelector,
  gridPageCountSelector,
} from '@mui/x-data-grid';

declare module '@mui/x-data-grid' {
  interface FooterPropsOverrides {
    pageSizeOptions?: number[];
  }
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  pageSizeOptions?: number[];
  sx?: SxProps<Theme>;
}

export default function CustomGridFooter({ pageSizeOptions = [25, 50] }: Props) {
  const apiRef = useGridApiContext();
  const { page, pageSize } = useGridSelector(apiRef, gridPaginationModelSelector);
  const rowCount = useGridSelector(apiRef, gridPaginationRowCountSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);

  const from = rowCount === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, rowCount);

  return (
    <GridFooterContainer sx={{ justifyContent: 'space-between', px: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <IconButton
          size="small"
          disabled={page === 0}
          onClick={() => apiRef.current.setPage(page - 1)}
          aria-label="previous page"
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          disabled={pageCount <= 1 || page >= pageCount - 1}
          onClick={() => apiRef.current.setPage(page + 1)}
          aria-label="next page"
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 0.5, whiteSpace: 'nowrap', color: 'text.secondary' }}>
          {rowCount === 0 ? '0–0 of 0' : `${from}–${to} of ${rowCount}`}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          Rows per page:
        </Typography>
        <Select
          size="small"
          value={pageSize}
          onChange={e => apiRef.current.setPageSize(Number(e.target.value))}
          sx={{ fontSize: 14, height: 30, '.MuiSelect-select': { py: 0.5, pr: '28px !important' } }}
        >
          {pageSizeOptions.map(n => (
            <MenuItem key={n} value={n}>{n}</MenuItem>
          ))}
        </Select>
      </Box>
    </GridFooterContainer>
  );
}
