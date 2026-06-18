'use client';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PeopleIcon from '@mui/icons-material/People';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DRAWER_WIDTH = 220;

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Properties', href: '/properties', icon: <ApartmentIcon /> },
  { label: 'Residents', href: '/residents', icon: <PeopleIcon /> },
  { label: 'Bookings', href: '/bookings', icon: <BookOnlineIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#1a237e' },
      }}
    >
      <Box sx={{ p: 2, color: 'white' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          AccomManager
        </Typography>
      </Box>
      <List>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
                sx={{
                  color: 'white',
                  '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)' },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}
