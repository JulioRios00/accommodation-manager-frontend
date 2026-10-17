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
import StorefrontIcon from '@mui/icons-material/Storefront';
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
import BuildIcon from '@mui/icons-material/Build';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ForumIcon from '@mui/icons-material/Forum';
import BusinessIcon from '@mui/icons-material/Business';
import UploadIcon from '@mui/icons-material/Upload';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HistoryIcon from '@mui/icons-material/History';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import appTheme from '@/theme';
import { useRole } from '@/hooks/useRole';
import { PermissionsProvider } from '@/lib/PermissionsProvider';
import { FeatureFlagsProvider, useFeatureFlags } from '@/lib/FeatureFlagsProvider';
import { CompanyProfileProvider, useCompanyProfile } from '@/lib/CompanyProfileProvider';
import type { Section } from '@/lib/permissions';
import type { FeatureFlagKey } from '@/services/api';

const DRAWER_WIDTH = 220;
const SIDEBAR_BG = '#424242';

/** `group` drives the dividers in the sidebar; items are rendered in the order below,
 *  grouped by related area as requested by the stakeholder. */
const ALL_NAV_ITEMS: { label: string; href: string; icon: React.ReactNode; section: Section; group: number; featureFlag?: FeatureFlagKey }[] = [
  { label: 'Dashboard',         href: '/dashboard',         icon: <DashboardIcon />,   section: 'Dashboard',         group: 1 },

  { label: 'Bookings',          href: '/bookings',          icon: <BookOnlineIcon />,  section: 'Bookings',          group: 2 },
  { label: 'Properties',        href: '/properties',        icon: <ApartmentIcon />,   section: 'Properties',        group: 2 },
  { label: 'Beds',              href: '/beds',              icon: <BedIcon />,         section: 'Beds',              group: 2 },
  { label: 'Residents',         href: '/residents',         icon: <PeopleIcon />,      section: 'Residents',         group: 2 },
  { label: 'Landlords',         href: '/landlords',         icon: <PersonIcon />,      section: 'Landlords',         group: 2 },

  { label: 'Maintenance',       href: '/maintenance',       icon: <HandymanIcon />,    section: 'Maintenance',       group: 3 },
  { label: 'Service Providers', href: '/service-providers', icon: <EngineeringIcon />, section: 'Service Providers', group: 3 },
  { label: 'Key Log',           href: '/key-logs',          icon: <VpnKeyIcon />,      section: 'Key Log',           group: 3 },

  { label: 'Business Units',    href: '/companies',         icon: <BusinessIcon />,    section: 'Companies',         group: 4 },
  { label: 'Payments',          href: '/payments',          icon: <PaymentsIcon />,    section: 'Payments',          group: 4 },
  { label: 'Landlord Disbursements', href: '/landlord-disbursements', icon: <AccountBalanceIcon />, section: 'Landlord Disbursements', group: 4, featureFlag: 'landlord_disbursements' },

  { label: 'Reports',           href: '/reports',           icon: <AssessmentIcon />,  section: 'Reports',           group: 5 },
  { label: 'Custom Reports',    href: '/reports/custom',    icon: <BuildIcon />,       section: 'Custom Reports',    group: 5 },

  { label: 'Import Data',       href: '/import',            icon: <UploadIcon />,      section: 'Import Data',       group: 6 },
  { label: 'User Management',   href: '/users',             icon: <PeopleAltIcon />,   section: 'User Management',   group: 6 },
  { label: 'Feature Flags',     href: '/feature-flags',     icon: <ToggleOnIcon />,    section: 'User Management',   group: 6 },
  { label: 'Activity Log',      href: '/activity-log',      icon: <HistoryIcon />,     section: 'Activity Log',      group: 6 },
  { label: 'Communication Settings', href: '/communication-settings', icon: <ForumIcon />, section: 'Communication Settings', group: 6, featureFlag: 'overdue_escalation' },
  { label: 'Company Profile Setup',  href: '/company-profile',        icon: <StorefrontIcon />, section: 'Company Profile',    group: 6 },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { level } = useRole();
  const { isEnabled } = useFeatureFlags();
  const { appName, logoDataUrl } = useCompanyProfile();
  const navItems = ALL_NAV_ITEMS.filter(item =>
    level(item.section) !== 'None' && (!item.featureFlag || isEnabled(item.featureFlag)),
  );
  return (
    <>
      <Box sx={{ p: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
        {logoDataUrl && (
          // Plain <img>: the source is a stored data URL, which next/image can't optimise.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoDataUrl}
            alt=""
            style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }}
          />
        )}
        <Typography
          variant="h6"
          noWrap
          title={appName}
          sx={{ fontWeight: 700, color: 'white', letterSpacing: 0.5, minWidth: 0 }}
        >
          {appName}
        </Typography>
      </Box>
      <List sx={{ pt: 0.5 }}>
        {navItems.map((item, idx) => {
          const active = pathname === item.href;
          // Divider wherever the group changes — but never above the first visible
          // item, since permissions and feature flags can hide a whole group.
          const startsGroup = idx > 0 && item.group !== navItems[idx - 1].group;
          return (
            <ListItem key={item.href} disablePadding sx={startsGroup ? { mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.12)' } : undefined}>
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
      <PermissionsProvider>
        <FeatureFlagsProvider>
          <CompanyProfileProvider>
          <Shell>{children}</Shell>
          </CompanyProfileProvider>
        </FeatureFlagsProvider>
      </PermissionsProvider>
    </ThemeProvider>
  );
}
