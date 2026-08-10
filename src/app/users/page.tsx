'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Box, Button, Chip, MenuItem, Paper, Select, SelectChangeEvent,
  Table, TableBody, TableCell, TableHead, TableRow,
  Tooltip, Typography, Alert, CircularProgress,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveIcon from '@mui/icons-material/Save';
import {
  getUsers, updateUserRole, updateRolePermissions, resetRolePermissions, ClerkUser,
} from '@/services/api';
import { useRole } from '@/hooks/useRole';
import { usePermissions } from '@/lib/PermissionsProvider';
import {
  ACCESS_LEVELS, AccessLevel, EDITABLE_ROLES, MATRIX_ROLES, PermissionMatrix,
  SECTIONS, Section, UserRole, resolveMatrix,
} from '@/lib/permissions';

/** Roles assignable from this screen. */
const ROLES: UserRole[] = ['sysadmin', 'manager', 'administrator', 'staff', 'maintenance'];

// 'staff' is stored as-is; only the label reads "Sales" to distinguish sales staff
// from the other staff roles (Administrator and Maintenance are staff too).
const ROLE_LABEL: Record<string, string> = {
  sysadmin: 'SysAdmin',
  manager: 'Manager',
  administrator: 'Administrator',
  staff: 'Sales',
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

const LEVEL_CFG: Record<AccessLevel, { label: string; color: string }> = {
  'Full':      { label: 'Full Access', color: '#1565c0' },
  'View+Edit': { label: 'View + Edit', color: '#2e7d32' },
  'View':      { label: 'View Only',   color: '#616161' },
  'None':      { label: 'No Access',   color: '#bdbdbd' },
};

function AccessChip({ level }: { level: AccessLevel }) {
  const { label, color } = LEVEL_CFG[level];
  return (
    <Chip label={label} size="small" sx={{ bgcolor: color, color: 'white', fontWeight: 600, fontSize: 11 }} />
  );
}

type Draft = Record<UserRole, Record<Section, AccessLevel>>;

export default function UsersPage() {
  const { role, can } = useRole();
  const { overrides, setOverrides } = usePermissions();

  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Matrix editing — only sysadmin may change it; everyone else sees it read-only.
  const canEditMatrix = role === 'sysadmin';
  const resolved = useMemo(() => resolveMatrix(overrides), [overrides]);
  const [draft, setDraft] = useState<Draft>(resolved);
  const [savingMatrix, setSavingMatrix] = useState(false);

  useEffect(() => { setDraft(resolved); }, [resolved]);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(
    () => MATRIX_ROLES.some(r => SECTIONS.some(s => draft[r]?.[s] !== resolved[r]?.[s])),
    [draft, resolved],
  );

  if (!can('user:view')) {
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

  const setCell = (r: UserRole, section: Section, level: AccessLevel) =>
    setDraft(d => ({ ...d, [r]: { ...d[r], [section]: level } }));

  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    setError(null);
    setSuccess(null);
    try {
      // sysadmin is always Full and is never persisted.
      const payload: PermissionMatrix = {};
      for (const r of EDITABLE_ROLES) {
        payload[r] = Object.fromEntries(SECTIONS.map(s => [s, draft[r][s]])) as Record<Section, AccessLevel>;
      }
      setOverrides(await updateRolePermissions(payload));
      setSuccess('Permissions matrix saved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save the permissions matrix. Please try again.');
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleResetMatrix = async () => {
    setSavingMatrix(true);
    setError(null);
    setSuccess(null);
    try {
      setOverrides(await resetRolePermissions());
      setSuccess('Permissions matrix reset to defaults.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to reset the permissions matrix. Please try again.');
    } finally {
      setSavingMatrix(false);
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
                        value={user.role as UserRole}
                        onChange={(e: SelectChangeEvent) => handleRoleChange(user.id, e.target.value)}
                        size="small"
                        disabled={saving === user.id || !can('user:edit')}
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
        <Box sx={{
          px: 2.5, py: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Role Permissions Matrix</Typography>
            <Typography variant="caption" color="text.secondary">
              {canEditMatrix
                ? 'Edit access levels per section and role, then save. SysAdmin always keeps full access.'
                : 'Access levels per section by role. Only a SysAdmin can change these.'}
              {' '}Resident access is restricted to the portal only.
            </Typography>
          </Box>
          {canEditMatrix && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small" startIcon={<RestoreIcon />} onClick={handleResetMatrix}
                disabled={savingMatrix}
              >
                Reset to defaults
              </Button>
              <Button
                size="small" variant="contained" startIcon={<SaveIcon />}
                onClick={handleSaveMatrix} disabled={savingMatrix || !dirty}
              >
                {savingMatrix ? 'Saving…' : 'Save changes'}
              </Button>
            </Box>
          )}
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#FFF0E6' }}>
                <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Section</TableCell>
                {MATRIX_ROLES.map(r => (
                  <TableCell key={r} align="center" sx={{ fontWeight: 700, color: ROLE_COLOR[r], minWidth: 150 }}>
                    {ROLE_LABEL[r]}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {SECTIONS.map(section => (
                <TableRow key={section} sx={{ '&:hover': { bgcolor: '#FDEEDE' } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{section}</TableCell>
                  {MATRIX_ROLES.map(r => {
                    const level = draft[r]?.[section] ?? 'None';
                    // sysadmin is fixed at Full — rendered as a static chip so it can't be locked out.
                    if (!canEditMatrix || r === 'sysadmin') {
                      return <TableCell key={r} align="center"><AccessChip level={level} /></TableCell>;
                    }
                    return (
                      <TableCell key={r} align="center">
                        <Select
                          value={level}
                          onChange={(e: SelectChangeEvent) => setCell(r, section, e.target.value as AccessLevel)}
                          size="small"
                          variant="outlined"
                          disabled={savingMatrix}
                          renderValue={(v) => <AccessChip level={v as AccessLevel} />}
                          sx={{
                            fontSize: 13, height: 30, minWidth: 132,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                          }}
                        >
                          {ACCESS_LEVELS.map(l => (
                            <MenuItem key={l} value={l}><AccessChip level={l} /></MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                    );
                  })}
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
