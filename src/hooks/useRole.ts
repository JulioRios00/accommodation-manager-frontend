'use client';
import { useUser } from '@clerk/nextjs';
import { can, Action, UserRole } from '@/lib/permissions';

export function useRole() {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as UserRole) ?? 'staff';
  return {
    role,
    can: (action: Action) => can(role, action),
  };
}
