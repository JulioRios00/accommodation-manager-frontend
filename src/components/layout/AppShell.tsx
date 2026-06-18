'use client';
import { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BedIcon from '@mui/icons-material/Bed';
import PeopleIcon from '@mui/icons-material/People';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import appTheme from '@/theme';

const DRAWER_WIDTH = 220;
const SIDEBAR_BG = '#424242';

const navItems = [
  { label: 'Dashboard',  href: '/dashboard',  icon: <DashboardIcon /> },
  { label: 'Properties', href: '/properties', icon: <ApartmentIcon /> },
  { label: 'Beds',       href: '/beds',       icon: <BedIcon /> },
  { label: 'Residents',  href: '/residents',  icon: <PeopleIcon /> },
  { label: 'Bookings',   href: '/bookings',   icon: <BookOnlineIcon /> },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', letterSpacing: 0.5 }}>
          AccomManager
        </Typography>
      </Box>
      <List sx={{ pt: 0.5 }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                onClick={onNavigate}
                selected={active}
                sx={{
                  mx: 1,
                  my: 0.25,
                  borderRadius: 1.5,
                  color: 'rgba(255,255,255,0.85)',
                  '&.Mui-selected': {
                    bgcolor: '#DE9151',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{ '& .MuiListItemText-primary': { fontSize: 14, fontWeight: active ? 600 : 400 } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerSx = {
    '& .MuiDrawer-paper': {
      width: DRAWER_WIDTH,
      boxSizing: 'border-box',
      bgcolor: SIDEBAR_BG,
      border: 'none',
    },
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{ bgcolor: SIDEBAR_BG, zIndex: theme.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              AccomManager
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={drawerSx}
        >
          <NavContent onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      ) : (
        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, ...drawerSx }}>
          <NavContent />
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minWidth: 0,
          pt: isMobile ? '64px' : 0,
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Shell>{children}</Shell>
    </ThemeProvider>
  );
}
