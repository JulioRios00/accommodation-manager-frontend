import axios from 'axios';
import type { PermissionMatrix } from '@/lib/permissions';

// On Vercel (prod & preview), NEXT_PUBLIC_API_URL is empty → use relative /api
// so Vercel rewrites proxy to the backend on the same deployment's origin.
// Locally, set NEXT_PUBLIC_API_URL=http://localhost:3001 in .env.local.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : '/api',
});

/** Wait for Clerk to finish initialising (up to `ms` milliseconds). */
async function waitForClerk(ms = 5000): Promise<void> {
  if (typeof window === 'undefined') return;
  const deadline = Date.now() + ms;
  while (!(window as any).Clerk?.loaded && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 50));
  }
}

/** True when a Clerk session exists and can produce a token. Call after Clerk loads. */
export async function isAuthenticated(): Promise<boolean> {
  await waitForClerk();
  const session = (window as any).Clerk?.session;
  if (!session) return false;
  try {
    return !!(await session.getToken());
  } catch {
    return false;
  }
}

api.interceptors.request.use(async (config) => {
  await waitForClerk();
  const session = (window as any).Clerk?.session;
  if (!session) {
    console.debug('[auth] no Clerk session — request will be unauthenticated', config.url);
    return config;
  }
  const token = await session.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.debug('[auth] token attached', config.url);
  } else {
    console.debug('[auth] session exists but getToken() returned null', config.url);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const current = window.location.pathname;
      if (!current.startsWith('/sign-in')) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(current)}`;
      }
    }
    return Promise.reject(err);
  },
);

export interface DashboardStats {
  totalProperties: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  onRadarBeds: number;
  occupancyRate: number;
  monthlyRevenue: number;
  projectedRevenue: number;
}

export interface Property {
  id: string;
  code: string;
  bu: string;
  area: string | null;
  fullAddress: string | null;
  officeKeysCount: number;
  keysCount: number;
  securityKeysCount: number;
  fobCount: number;
  keyCode: string | null;
  electricityStatus: string | null;
  electricityMprn: string | null;
  electricitySupplier: string | null;
  electricityAccountNumber: string | null;
  electricityKeypadCode: string | null;
  gasStatus: string | null;
  gasGprn: string | null;
  gasSupplier: string | null;
  gasAccountNumber: string | null;
  gasPin: string | null;
  wasteSupplier: string | null;
  wasteAccountNumber: string | null;
  wasteEmail: string | null;
  wastePassword: string | null;
  wastePaymentType: string | null;
  wasteMonthlyAmount: number | null;
  wasteStatus: string | null;
  internetSupplier: string | null;
  internetAccountNumber: string | null;
  internetEmail: string | null;
  internetUsername: string | null;
  internetPassword: string | null;
  internetPaymentType: string | null;
  internetStatus: string | null;
  internetContractEndDate: string | null;
  internetOnlineLink: string | null;
  internetBusinessPhone: string | null;
  internetNotes: string | null;
  wastePhone: string | null;
  salesDescription: string | null;
  eirCode: string | null;
  propertyType: string | null;
  crn: string | null;
  propertyEmail: string | null;
  paymentReference: string | null;
  propertySupplier: string | null;
  paymentNotes: string | null;
  officeKeysComment: string | null;
  landlordId: string | null;
  active?: boolean;
}

export interface Landlord {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  bankName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  iban: string | null;
  bic: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  residentPaymentDueDay: number | null;
  active: boolean;
}

export interface ServiceProvider {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  notes: string | null;
  active: boolean;
}

export interface MaintenanceTicket {
  id: string;
  orderNumber: string;
  propertyId: string;
  category: string | null;
  bedId: string | null;
  residentId: string | null;
  serviceProviderId: string | null;
  responsibleClerkUserId: string | null;
  responsibleClerkUserName: string | null;
  title: string;
  descriptionRequested: string | null;
  additionalDetails: string | null;
  descriptionDone: string | null;
  materials: string | null;
  priority: number;
  urgency: string;
  status: string;
  clientName: string | null;
  clientPhone: string | null;
  approvedBy: string | null;
  approvalDate: string | null;
  paymentApprovedBy: string | null;
  timeframe: string | null;
  chargedBy: string | null;
  houseCompany: string | null;
  maintenanceCost: number | null;
  materialCost: number | null;
  totalCost: number | null;
  entryNoticeDate: string | null;
  entryCheckIn: string | null;
  entryCheckOut: string | null;
  causedByResident: boolean;
  tags: string[];
  clerkUserId: string | null;
  clerkUserName: string | null;
  createdAt: string;
}

export interface TicketActivityLog {
  id: string;
  ticketId: string;
  eventType: string;
  clerkUserId: string | null;
  clerkUserName: string | null;
  comment: string | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface KeyLog {
  id: string;
  propertyId: string;
  bedId: string | null;
  keyType: string;
  takenBy: string;
  takenByType: string;
  takenAt: string;
  expectedReturnAt: string | null;
  actualReturnAt: string | null;
  returnStatus: string;
  notes: string | null;
}

export interface RentPayment {
  id: string;
  residentId: string;
  bookingId: string;
  propertyId: string;
  month: string;
  paymentDueDay: number | null;
  rentAmount: number;
  amountPaid: number;
  lateStatus: string;
  datePaid: string | null;
  notes: string | null;
}

export interface LandlordPayment {
  id: string;
  propertyId: string;
  landlordId: string;
  month: string;
  amountDue: number;
  amountPaid: number;
  dateDue: string | null;
  datePaid: string | null;
  beneficiaryName: string | null;
  iban: string | null;
  bic: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  status: string;
  notes: string | null;
}

export interface DepositTransaction {
  id: string;
  type: string;
  residentId: string;
  bookingId: string | null;
  propertyId: string;
  bedId: string | null;
  residentName: string;
  checkoutDate: string | null;
  depositAmount: number;
  proRataRentAmount: number | null;
  iban: string | null;
  payeeAddress: string | null;
  status: string;
  dateProcessed: string | null;
  bankReference: string | null;
  company: string | null;
  comments: string | null;
}

export interface Company {
  id: string;
  name: string;
  bu: string | null;
  address: string | null;
  contactEmail: string | null;
  phone: string | null;
  active: boolean;
}

export interface DelinquencyRow {
  residentName: string;
  propertyCode: string;
  fullAddress: string;
  rentAmount: number;
  amountPaid: number;
  amountDue: number;
  lateStatus: string;
}

export interface Resident {
  id: string;
  clerkUserId: string | null;
  fullName: string;
  email: string | null;
  telephone: string | null;
  gender: string | null;
  nationality: string | null;
  personalId: string | null;
  iban: string | null;
  emergencyContact: string | null;
  source: string | null;
  paymentDueDay: number | null;
  comments: string | null;
  delinquent: boolean;
  hasObservation: boolean;
  observation: string | null;
}

export interface Booking {
  id: string;
  bedId: string;
  residentId: string;
  checkInDate: string | null;
  contractEndDate: string | null;
  checkOutDate: string | null;
  depositAmount: number;
  rentAmount: number;
  isHeadResident: boolean;
  isTemporary: boolean;
  status: 'active' | 'upcoming' | 'completed';
  comments: string | null;
  /** Summaries joined server-side so grids can show readable codes/names. */
  resident?: { id: string; fullName: string; email: string | null; telephone: string | null } | null;
  bed?: {
    id: string;
    bedNumber: number;
    name: string | null;
    bedroomType: string;
    propertyId: string;
    propertyCode: string | null;
  } | null;
}

export interface Bedroom {
  id: string;
  propertyId: string;
  name: string;
  active: boolean;
}

export interface Bed {
  id: string;
  propertyId: string;
  propertyCode?: string;
  bedNumber: number;
  bedroomId: string | null;
  bedroomName: string | null;
  name: string | null;
  position: number | null;
  status: 'vacant' | 'allocated';
  bedroomType: string;
  sex: string;
  bedSize: string;
  depositAmount: number;
  rentAmount: number;
  activeBooking?: Booking | null;
}

// --- Read ---
export const getDashboardStats = () => api.get<DashboardStats>('/dashboard/stats').then(r => r.data);
export const getProperties = (includeInactive = false) =>
  api.get<Property[]>('/properties', { params: includeInactive ? { includeInactive: 'true' } : undefined }).then(r => r.data);
export const getBeds = (propertyId?: string) =>
  api.get<Bed[]>('/beds', { params: propertyId ? { propertyId } : {} }).then(r => r.data);
export const getResidents = () => api.get<Resident[]>('/residents').then(r => r.data);
export const getBookings = (status?: string) =>
  api.get<Booking[]>('/bookings', { params: status ? { status } : {} }).then(r => r.data);
export const importXlsx = (file: File, endpoint = '/import') => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

// --- Create / Update ---
export const createProperty = (data: Omit<Property, 'id'>) =>
  api.post<Property>('/properties', data).then(r => r.data);
export const updateProperty = (id: string, data: Partial<Property>) =>
  api.put<Property>(`/properties/${id}`, data).then(r => r.data);
export const deleteProperty = (id: string) =>
  api.delete(`/properties/${id}`);

export const createBed = (data: Omit<Bed, 'id' | 'propertyCode' | 'bedroomName' | 'status' | 'activeBooking'>) =>
  api.post<Bed>('/beds', data).then(r => r.data);
export const updateBed = (id: string, data: Partial<Omit<Bed, 'propertyCode' | 'bedroomName' | 'activeBooking'>>) =>
  api.put<Bed>(`/beds/${id}`, data).then(r => r.data);
export const deleteBed = (id: string) =>
  api.delete(`/beds/${id}`);

export const createResident = (data: Omit<Resident, 'id'>) =>
  api.post<Resident>('/residents', data).then(r => r.data);
export const updateResident = (id: string, data: Partial<Resident>) =>
  api.put<Resident>(`/residents/${id}`, data).then(r => r.data);
export const deleteResident = (id: string) =>
  api.delete(`/residents/${id}`);

export const createBooking = (data: Omit<Booking, 'id' | 'resident' | 'bed'>) =>
  api.post<Booking>('/bookings', data).then(r => r.data);
export const updateBooking = (id: string, data: Partial<Omit<Booking, 'resident' | 'bed'>>) =>
  api.put<Booking>(`/bookings/${id}`, data).then(r => r.data);
export const deleteBooking = (id: string) =>
  api.delete(`/bookings/${id}`);

// Landlords
export const getLandlords = () => api.get<Landlord[]>('/landlords').then(r => r.data);
export const createLandlord = (data: Omit<Landlord, 'id' | 'active'>) => api.post<Landlord>('/landlords', data).then(r => r.data);
export const updateLandlord = (id: string, data: Partial<Landlord>) => api.put<Landlord>(`/landlords/${id}`, data).then(r => r.data);
export const deleteLandlord = (id: string) => api.delete(`/landlords/${id}`);

// Service Providers
export const getServiceProviders = () => api.get<ServiceProvider[]>('/service-providers').then(r => r.data);
export const createServiceProvider = (data: Omit<ServiceProvider, 'id' | 'active'>) => api.post<ServiceProvider>('/service-providers', data).then(r => r.data);
export const updateServiceProvider = (id: string, data: Partial<ServiceProvider>) => api.put<ServiceProvider>(`/service-providers/${id}`, data).then(r => r.data);
export const deleteServiceProvider = (id: string) => api.delete(`/service-providers/${id}`);

// Maintenance Tickets
export const getMaintenanceTickets = (params?: { propertyId?: string; status?: string; urgency?: string }) =>
  api.get<MaintenanceTicket[]>('/maintenance-tickets', { params }).then(r => r.data);
export const createMaintenanceTicket = (data: Omit<MaintenanceTicket, 'id' | 'orderNumber' | 'createdAt'>) =>
  api.post<MaintenanceTicket>('/maintenance-tickets', data).then(r => r.data);
export const updateMaintenanceTicket = (id: string, data: Partial<Omit<MaintenanceTicket, 'createdAt'>>) =>
  api.put<MaintenanceTicket>(`/maintenance-tickets/${id}`, data).then(r => r.data);
export const deleteMaintenanceTicket = (id: string) => api.delete(`/maintenance-tickets/${id}`);
export const getMaintenanceQueue = () =>
  api.get<MaintenanceTicket[]>('/maintenance-tickets/queue').then(r => r.data);
export const claimMaintenanceTicket = (id: string) =>
  api.post<MaintenanceTicket>(`/maintenance-tickets/${id}/claim`).then(r => r.data);
export const closeMaintenanceTicket = (id: string, data: { resolutionNotes?: string }) =>
  api.post<MaintenanceTicket>(`/maintenance-tickets/${id}/close`, data).then(r => r.data);
export const getTicketActivity = (ticketId: string) =>
  api.get<TicketActivityLog[]>(`/maintenance-tickets/${ticketId}/activity`).then(r => r.data);
export const addTicketActivity = (ticketId: string, data: Partial<TicketActivityLog>) =>
  api.post<TicketActivityLog>(`/maintenance-tickets/${ticketId}/activity`, data).then(r => r.data);

// Key Logs
export const getKeyLogs = (propertyId?: string) =>
  api.get<KeyLog[]>('/key-logs', { params: propertyId ? { propertyId } : {} }).then(r => r.data);
export const createKeyLog = (data: Omit<KeyLog, 'id'>) => api.post<KeyLog>('/key-logs', data).then(r => r.data);
export const updateKeyLog = (id: string, data: Partial<KeyLog>) => api.put<KeyLog>(`/key-logs/${id}`, data).then(r => r.data);
export const deleteKeyLog = (id: string) => api.delete(`/key-logs/${id}`);

// Checkout
export const checkout = (data: { bookingId: string; checkoutDate: string; keysReturned?: boolean; inspectionNotes?: string | null; depositRefundAmount?: number | null; refundIban?: string | null; proRataRentAmount?: number | null; newResidentLinked?: boolean; newResidentId?: string | null; notes?: string | null; residentName?: string; propertyId?: string; residentId?: string; bedId?: string | null; company?: string | null }) =>
  api.post('/checkout', data).then(r => r.data);

// Rent Payments
export const getRentPayments = (params?: { propertyId?: string; month?: string; residentId?: string }) =>
  api.get<RentPayment[]>('/rent-payments', { params }).then(r => r.data);
export const createRentPayment = (data: Omit<RentPayment, 'id'>) => api.post<RentPayment>('/rent-payments', data).then(r => r.data);
export const updateRentPayment = (id: string, data: Partial<RentPayment>) => api.put<RentPayment>(`/rent-payments/${id}`, data).then(r => r.data);
export const deleteRentPayment = (id: string) => api.delete(`/rent-payments/${id}`);
export const addRentInstallment = (rentPaymentId: string, data: { amount: number; paidAt: string; notes?: string | null }) =>
  api.post(`/rent-payments/${rentPaymentId}/installments`, data).then(r => r.data);

// Landlord Payments
export const getLandlordPayments = (params?: { propertyId?: string; landlordId?: string; month?: string }) =>
  api.get<LandlordPayment[]>('/landlord-payments', { params }).then(r => r.data);
export const createLandlordPayment = (data: Omit<LandlordPayment, 'id'>) => api.post<LandlordPayment>('/landlord-payments', data).then(r => r.data);
export const updateLandlordPayment = (id: string, data: Partial<LandlordPayment>) => api.put<LandlordPayment>(`/landlord-payments/${id}`, data).then(r => r.data);
export const deleteLandlordPayment = (id: string) => api.delete(`/landlord-payments/${id}`);

// Deposit Transactions
export const getDepositTransactions = (params?: { propertyId?: string; type?: string; status?: string }) =>
  api.get<DepositTransaction[]>('/deposit-transactions', { params }).then(r => r.data);
export const createDepositTransaction = (data: Omit<DepositTransaction, 'id'>) => api.post<DepositTransaction>('/deposit-transactions', data).then(r => r.data);
export const updateDepositTransaction = (id: string, data: Partial<DepositTransaction>) => api.put<DepositTransaction>(`/deposit-transactions/${id}`, data).then(r => r.data);
export const deleteDepositTransaction = (id: string) => api.delete(`/deposit-transactions/${id}`);

export type SpaceCategory =
  | 'bedroom' | 'kitchen' | 'bathroom' | 'living_room' | 'dining_room'
  | 'garden' | 'storage' | 'office' | 'utility' | 'other';

export const SPACE_CATEGORY_LABELS: Record<SpaceCategory, string> = {
  bedroom: 'Bedroom', kitchen: 'Kitchen', bathroom: 'Bathroom',
  living_room: 'Living Room', dining_room: 'Dining Room', garden: 'Garden',
  storage: 'Storage', office: 'Office', utility: 'Utility', other: 'Other',
};

export interface SpaceItem {
  id: string;
  spaceId: string;
  name: string;
  quantity: number;
  condition: string | null;
  notes: string | null;
}

export interface PropertySpace {
  id: string;
  propertyId: string;
  category: SpaceCategory;
  name: string;
  active: boolean;
  items?: SpaceItem[];
}

// Property Spaces
export const getPropertySpaces = (propertyId?: string) =>
  api.get<PropertySpace[]>('/property-spaces', { params: propertyId ? { propertyId } : {} }).then(r => r.data);
export const createPropertySpace = (data: { propertyId: string; category: string; name: string }) =>
  api.post<PropertySpace>('/property-spaces', data).then(r => r.data);
export const updatePropertySpace = (id: string, data: Partial<PropertySpace>) =>
  api.put<PropertySpace>(`/property-spaces/${id}`, data).then(r => r.data);
export const deletePropertySpace = (id: string) => api.delete(`/property-spaces/${id}`);

export const createSpaceItem = (spaceId: string, data: Omit<SpaceItem, 'id' | 'spaceId'>) =>
  api.post<SpaceItem>(`/property-spaces/${spaceId}/items`, data).then(r => r.data);
export const updateSpaceItem = (spaceId: string, itemId: string, data: Partial<SpaceItem>) =>
  api.put<SpaceItem>(`/property-spaces/${spaceId}/items/${itemId}`, data).then(r => r.data);
export const deleteSpaceItem = (spaceId: string, itemId: string) =>
  api.delete(`/property-spaces/${spaceId}/items/${itemId}`);

// Bedrooms
export const getBedrooms = (propertyId?: string) =>
  api.get<Bedroom[]>('/bedrooms', { params: propertyId ? { propertyId } : {} }).then(r => r.data);
export const createBedroom = (data: Omit<Bedroom, 'id' | 'active'>) => api.post<Bedroom>('/bedrooms', data).then(r => r.data);
export const updateBedroom = (id: string, data: Partial<Bedroom>) => api.put<Bedroom>(`/bedrooms/${id}`, data).then(r => r.data);
export const deleteBedroom = (id: string) => api.delete(`/bedrooms/${id}`);

// Companies
export const getCompanies = () => api.get<Company[]>('/companies').then(r => r.data);
export const createCompany = (data: Omit<Company, 'id' | 'active'>) => api.post<Company>('/companies', data).then(r => r.data);
export const updateCompany = (id: string, data: Partial<Company>) => api.put<Company>(`/companies/${id}`, data).then(r => r.data);
export const deleteCompany = (id: string) => api.delete(`/companies/${id}`);

// Resident portal
export interface PortalProfile {
  resident: Resident;
  booking: {
    id: string;
    checkInDate: string | null;
    contractEndDate: string | null;
    rentAmount: number;
    depositAmount: number;
    bed: { id: string; bedNumber: number; bedroomType: string } | null;
    property: { id: string; code: string; fullAddress: string | null } | null;
  } | null;
}
export const getPortalProfile = () => api.get<PortalProfile>('/portal/me').then(r => r.data);
export const submitResidentTicket = (data: { category: string; title: string; description?: string | null }) =>
  api.post<MaintenanceTicket>('/portal/tickets', data).then(r => r.data);

// User Management
export interface ClerkUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  imageUrl: string;
  createdAt: number;
}
export const getUsers = () => api.get<ClerkUser[]>('/users').then(r => r.data);
export const updateUserRole = (clerkId: string, role: string) =>
  api.patch(`/users/${clerkId}`, { role }).then(r => r.data);

// Role permissions matrix — only the overrides are stored; defaults live in lib/permissions.
export const getRolePermissions = () =>
  api.get<PermissionMatrix>('/role-permissions').then(r => r.data);
export const updateRolePermissions = (matrix: PermissionMatrix) =>
  api.put<PermissionMatrix>('/role-permissions', matrix).then(r => r.data);
export const resetRolePermissions = () =>
  api.delete<PermissionMatrix>('/role-permissions').then(r => r.data);

// Reports
export const getDelinquencyReport = (params?: { propertyId?: string; month?: string }) =>
  api.get<DelinquencyRow[]>('/reports/delinquency', { params }).then(r => r.data);
export const exportDelinquencyReportCsv = (params?: { propertyId?: string; month?: string }) =>
  api.get('/reports/delinquency', { params: { ...params, format: 'csv' }, responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = 'delinquency-report.csv'; a.click();
    URL.revokeObjectURL(url);
  });
