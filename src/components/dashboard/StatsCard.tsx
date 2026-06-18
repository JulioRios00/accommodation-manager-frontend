'use client';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
}

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <Card sx={{ flex: 1, minWidth: 160 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              bgcolor: color,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              color: 'white',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
