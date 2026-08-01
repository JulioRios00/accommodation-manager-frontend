export type UserRole = 'sysadmin' | 'manager' | 'administrator' | 'staff' | 'resident';

export type Action =
  | 'property:write'
  | 'bed:write'
  | 'resident:create'
  | 'resident:edit'
  | 'resident:delete'
  | 'booking:write'
  | 'import';

const PERMISSIONS: Record<UserRole, Action[]> = {
  sysadmin:      ['property:write', 'bed:write', 'resident:create', 'resident:edit', 'resident:delete', 'booking:write', 'import'],
  manager:       ['property:write', 'bed:write', 'resident:create', 'resident:edit', 'resident:delete', 'booking:write', 'import'],
  administrator: ['resident:edit'],
  staff:         [],
  resident:      [],
};

export function can(role: string | undefined | null, action: Action): boolean {
  if (!role) return false;
  return PERMISSIONS[role as UserRole]?.includes(action) ?? false;
}
