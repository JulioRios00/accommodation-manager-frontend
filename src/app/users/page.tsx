'use client';
import { useEffect, useState } from 'react';
import {
  Avatar, Box, Chip, MenuItem, Paper, Select, SelectChangeEvent,
  Table, TableBody, TableCell, TableHead, TableRow,
  Tooltip, Typography, Alert, CircularProgress,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import { getUsers, updateUserRole, ClerkUser } from '@/services/api';
import { useRole } from '@/hooks/useRole';

const ROLES = ['sysadmin', 'manager', 'administrator', 'staff', 'maintenance'] as const;
type Role = typeof ROLES[number];

const ROLE_LABEL: Record<string, string> = {
  sysadmin: 'SysAdmin',
  manager: 'Manager',
  administrator: 'Administrator',
  staff: 'Staff',
  maintenance: 'Maintenance',
  resident: 'Resident',
};

const ROLE_COLOR: Record<string, string> = {
  sysadmin: '#7b0000',
  manager: '#1565c0',
  administrator: '#2e7d32',
  staff: '#616161',
  maintenance: '#E65100',
  resident: '#6a1b9a',
};

// Permissions matrix: sections × roles
type AccessLevel = 'Full' | 'View+Edit' | 'View' | 'None';

interface SectionPerm {
  section: string;
  sysadmin: AccessLevel;
  manager: AccessLevel;
  administrator: AccessLevel;
  staff: AccessLevel;
  maintenance: AccessLevel;
}

const PERMISSIONS_MATRIX: SectionPerm[] = [
  { section: 'Dashboard',         sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'View' },
  { section: 'Properties',        sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'View' },
  { section: 'Beds',              sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'View' },
  { section: 'Residents',         sysadmin: 'Full',      manager: 'Full',      administrator: 'View+Edit', staff: 'View',  maintenance: 'View' },
  { section: 'Bookings',          sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'View' },
  { section: 'Landlords',         sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'None' },
  { section: 'Service Providers', sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'View' },
  { section: 'Maintenance',       sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'View+Edit' },
  { section: 'Key Log',           sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'View' },
  { section: 'Payments',          sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'None' },
  { section: 'Reports',           sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'None' },
  { section: 'Companies',         sysadmin: 'Full',      manager: 'Full',      administrator: 'View',      staff: 'View',  maintenance: 'None' },
  { section: 'Import Data',       sysadmin: 'Full',      manager: 'Full',      administrator: 'None',      staff: 'None',  maintenance: 'None' },
  { section: 'User Management',   sysadmin: 'Full',      manager: 'Full',      administrator: 'None',      staff: 'None',  maintenance: 'None' },
];

function AccessChip({ level }: { level: AccessLevel }) {
  const cfg: Record<AccessLevel, { label: string; color: string }> = {
    'Full':      { label: 'Full Access',  color: '#1565c0' },
    'View+Edit': { label: 'View + Edit',  color: '#2e7d32' },
    'View':      { label: 'View Only',    color: '#616161' },
    'None':      { label: 'No Access',    color: '#bdbdbd' },
  };
  const { label, color } = cfg[level];
  return (
    <Chip
      label={label}
      size="small"
      sx={{ bgcolor: color, color: 'white', fontWeight: 600, fontSize: 11 }}
    />
  );
}

export default function UsersPage() {
  const { role } = useRole();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  if (role !== 'sysadmin' && role !== 'manager') {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">You do not have permission to access User Management.</Alert>
      </Box>
    );
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setSaving(userId);
    setError(null);
    setSuccess(null);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setSuccess('Role updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to update role. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>User Management</Typography>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      {/* ── User list ─────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Users</Typography>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#FFF0E6' }}>
                <TableCell sx={{ fontWeight: 700, width: 44 }} />
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }}>Access</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} sx={{ '&:hover': { bgcolor: '#FDEEDE' } }}>
                  <TableCell>
                    <Avatar src={user.imageUrl} sx={{ width: 30, height: 30, fontSize: 13 }}>
                      {user.fullName.charAt(0)}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.fullName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    {user.role === 'resident' ? (
                      <Chip label="Resident" size="small" sx={{ bgcolor: ROLE_COLOR.resident, color: 'white', fontWeight: 600 }} />
                    ) : (
                      <Select
                        value={user.role as Role}
                        onChange={(e: SelectChangeEvent) => handleRoleChange(user.id, e.target.value)}
                        size="small"
                        disabled={saving === user.id}
                        sx={{
                          fontSize: 13,
                          minWidth: 150,
                          '& .MuiSelect-select': { py: 0.5, color: ROLE_COLOR[user.role] ?? '#424242', fontWeight: 600 },
                        }}
                      >
                        {ROLES.map(r => (
                          <MenuItem key={r} value={r} sx={{ color: ROLE_COLOR[r], fontWeight: 600, fontSize: 13 }}>
                            {ROLE_LABEL[r]}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`Role: ${ROLE_LABEL[user.role] ?? user.role}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {(user.role === 'sysadmin' || user.role === 'manager') ? (
                          <CheckIcon sx={{ color: '#1565c0', fontSize: 18 }} />
                        ) : user.role === 'staff' ? (
                          <BlockIcon sx={{ color: '#bdbdbd', fontSize: 18 }} />
                        ) : (
                          <CheckIcon sx={{ color: '#616161', fontSize: 18 }} />
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── Permissions matrix ────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Role Permissions Matrix</Typography>
          <Typography variant="caption" color="text.secondary">
            Access levels per section by role. Resident access is restricted to the portal only.
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#FFF0E6' }}>
                <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Section</TableCell>
                {ROLES.map(r => (
                  <TableCell key={r} align="center" sx={{ fontWeight: 700, color: ROLE_COLOR[r], minWidth: 130 }}>
                    {ROLE_LABEL[r]}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {PERMISSIONS_MATRIX.map(row => (
                <TableRow key={row.section} sx={{ '&:hover': { bgcolor: '#FDEEDE' } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{row.section}</TableCell>
                  {ROLES.map(r => (
                    <TableCell key={r} align="center"><AccessChip level={row[r]} /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Full Access</strong> = View + Insert + Edit + Delete &nbsp;|&nbsp;
            <strong>View + Edit</strong> = View + Edit only &nbsp;|&nbsp;
            <strong>View Only</strong> = Read-only &nbsp;|&nbsp;
            <strong>No Access</strong> = Section hidden / restricted
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
