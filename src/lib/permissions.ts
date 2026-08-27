export type UserRole = 'sysadmin' | 'manager' | 'administrator' | 'staff' | 'resident' | 'maintenance';

/** Access a role has over a section. Ordered least → most privileged by RANK below. */
export type AccessLevel = 'None' | 'View' | 'View+Edit' | 'Full';

const RANK: Record<AccessLevel, number> = { 'None': 0, 'View': 1, 'View+Edit': 2, 'Full': 3 };

export const ACCESS_LEVELS: AccessLevel[] = ['Full', 'View+Edit', 'View', 'None'];

/** Sections the matrix is defined over. Must stay in sync with the backend list. */
export const SECTIONS = [
  'Dashboard', 'Properties', 'Beds', 'Residents', 'Bookings', 'Landlords',
  'Service Providers', 'Maintenance', 'Key Log', 'Payments', 'Reports',
  'Companies', 'Import Data', 'User Management', 'Activity Log',
] as const;

export type Section = typeof SECTIONS[number];

/** sysadmin is always Full and is never stored — the rest are editable in User Management. */
export const EDITABLE_ROLES: UserRole[] = ['manager', 'administrator', 'staff', 'maintenance'];
export const MATRIX_ROLES: UserRole[] = ['sysadmin', ...EDITABLE_ROLES];

export type PermissionMatrix = Partial<Record<UserRole, Partial<Record<Section, AccessLevel>>>>;

/** Short slug used in action strings, e.g. `booking:edit`. */
const SECTION_BY_KEY = {
  dashboard: 'Dashboard',
  property: 'Properties',
  bed: 'Beds',
  resident: 'Residents',
  booking: 'Bookings',
  landlord: 'Landlords',
  serviceProvider: 'Service Providers',
  maintenance: 'Maintenance',
  keyLog: 'Key Log',
  payment: 'Payments',
  report: 'Reports',
  company: 'Companies',
  import: 'Import Data',
  user: 'User Management',
  activityLog: 'Activity Log',
} as const satisfies Record<string, Section>;

type SectionKey = keyof typeof SECTION_BY_KEY;

/**
 * `view`  — read the section (level ≥ View)
 * `edit`  — create and change records (level ≥ View+Edit)
 * `write` — delete records (level = Full)
 */
export type Verb = 'view' | 'edit' | 'write';

export type Action = `${SectionKey}:${Verb}`;

const VERB_MINIMUM: Record<Verb, AccessLevel> = {
  view: 'View',
  edit: 'View+Edit',
  write: 'Full',
};

/** Baseline used whenever a role/section pair has no stored override. */
export const DEFAULT_MATRIX: Record<UserRole, Record<Section, AccessLevel>> = {
  sysadmin:      buildRow('Full'),
  manager:       buildRow('Full'),
  administrator: { ...buildRow('View'), 'Residents': 'View+Edit', 'Import Data': 'None', 'User Management': 'None' },
  staff:         { ...buildRow('View'), 'Import Data': 'None', 'User Management': 'None', 'Activity Log': 'None' },
  maintenance:   {
    ...buildRow('View'),
    'Maintenance': 'View+Edit',
    'Landlords': 'None', 'Payments': 'None', 'Reports': 'None',
    'Companies': 'None', 'Import Data': 'None', 'User Management': 'None', 'Activity Log': 'None',
  },
  resident:      buildRow('None'),
};

function buildRow(level: AccessLevel): Record<Section, AccessLevel> {
  return Object.fromEntries(SECTIONS.map(s => [s, level])) as Record<Section, AccessLevel>;
}

/** Stored overrides layered over {@link DEFAULT_MATRIX}. sysadmin is always Full. */
export function levelFor(
  overrides: PermissionMatrix,
  role: string | undefined | null,
  section: Section,
): AccessLevel {
  if (!role) return 'None';
  if (role === 'sysadmin') return 'Full';
  return overrides[role as UserRole]?.[section]
    ?? DEFAULT_MATRIX[role as UserRole]?.[section]
    ?? 'None';
}

export function can(
  overrides: PermissionMatrix,
  role: string | undefined | null,
  action: Action,
): boolean {
  const [key, verb] = action.split(':') as [SectionKey, Verb];
  const section = SECTION_BY_KEY[key];
  if (!section) return false;
  return RANK[levelFor(overrides, role, section)] >= RANK[VERB_MINIMUM[verb]];
}

/** Merges overrides onto the defaults — used by the User Management editor. */
export function resolveMatrix(overrides: PermissionMatrix): Record<UserRole, Record<Section, AccessLevel>> {
  const resolved = {} as Record<UserRole, Record<Section, AccessLevel>>;
  for (const role of MATRIX_ROLES) {
    resolved[role] = buildRow('None');
    for (const section of SECTIONS) {
      resolved[role][section] = levelFor(overrides, role, section);
    }
  }
  return resolved;
}
