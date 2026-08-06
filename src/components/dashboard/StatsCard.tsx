'use client';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: string;
  onClick?: () => void;
  active?: boolean;
}

export default function StatsCard({ title, value, icon, color, onClick, active }: StatsCardProps) {
  return (
    <Card
      sx={{
        flex: 1,
        cursor: onClick ? 'pointer' : 'default',
        outline: active ? `2px solid ${color}` : 'none',
        transition: 'outline 0.15s, box-shadow 0.15s',
        '&:hover': onClick ? { boxShadow: 3 } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: '10px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              bgcolor: color,
              borderRadius: 1.5,
              p: 0.75,
              display: 'flex',
              alignItems: 'center',
              color: 'white',
              flexShrink: 0,
              '& svg': { fontSize: 20 },
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '1rem' }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
