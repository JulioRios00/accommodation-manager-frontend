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
import PersonIcon from '@mui/icons-material/Person';
import HandymanIcon from '@mui/icons-material/Handyman';
import EngineeringIcon from '@mui/icons-material/Engineering';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BusinessIcon from '@mui/icons-material/Business';
import UploadIcon from '@mui/icons-material/Upload';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import appTheme from '@/theme';
import { useRole } from '@/hooks/useRole';

const DRAWER_WIDTH = 220;
const SIDEBAR_BG = '#424242';

const ALL_NAV_ITEMS = [
  { label: 'Dashboard',         href: '/dashboard',         icon: <DashboardIcon />,  roles: null },
  { label: 'Properties',        href: '/properties',        icon: <ApartmentIcon />,  roles: null },
  { label: 'Beds',              href: '/beds',              icon: <BedIcon />,         roles: null },
  { label: 'Residents',         href: '/residents',         icon: <PeopleIcon />,      roles: null },
  { label: 'Bookings',          href: '/bookings',          icon: <BookOnlineIcon />,  roles: null },
  { label: 'Landlords',         href: '/landlords',         icon: <PersonIcon />,      roles: null },
  { label: 'Service Providers', href: '/service-providers', icon: <EngineeringIcon />, roles: null },
  { label: 'Maintenance',       href: '/maintenance',       icon: <HandymanIcon />,    roles: null },
  { label: 'Key Log',           href: '/key-logs',          icon: <VpnKeyIcon />,      roles: null },
  { label: 'Payments',          href: '/payments',          icon: <PaymentsIcon />,    roles: null },
  { label: 'Reports',           href: '/reports',           icon: <AssessmentIcon />,  roles: null },
  { label: 'Business Units',    href: '/companies',         icon: <BusinessIcon />,    roles: null },
  { label: 'Import Data',       href: '/import',            icon: <UploadIcon />,      roles: null },
  { label: 'User Management',   href: '/users',             icon: <PeopleAltIcon />,   roles: ['sysadmin', 'manager'] },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useRole();
  const navItems = ALL_NAV_ITEMS.filter(item => !item.roles || item.roles.includes(role));
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
      <Box sx={{ mt: 'auto', p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <UserButton
          appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }}
        />
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
          Account
        </Typography>
      </Box>
    </>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ bgcolor: '#424242', px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700 }}>AccomManager</Typography>
        <UserButton appearance={{ elements: { avatarBox: { width: 30, height: 30 } } }} />
      </Box>
      <Box sx={{ flex: 1, p: 2, maxWidth: 600, mx: 'auto', width: '100%' }}>{children}</Box>
    </Box>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname.startsWith('/portal')) {
    return <PortalShell>{children}</PortalShell>;
  }

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
