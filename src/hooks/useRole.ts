'use client';
import { useUser } from '@clerk/nextjs';
import { usePermissions } from '@/lib/PermissionsProvider';
import { can, levelFor, Action, AccessLevel, Section, UserRole } from '@/lib/permissions';

export function useRole() {
  const { user } = useUser();
  const { overrides, loaded } = usePermissions();
  const role = (user?.publicMetadata?.role as UserRole) ?? 'staff';
  return {
    role,
    /** True once the stored matrix has been fetched (or failed over to defaults). */
    permissionsLoaded: loaded,
    can: (action: Action) => can(overrides, role, action),
    level: (section: Section): AccessLevel => levelFor(overrides, role, section),
  };
}
