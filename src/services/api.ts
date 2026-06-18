import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });

export interface DashboardStats {
  totalProperties: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  onRadarBeds: number;
}

export interface Property {
  id: string;
  code: string;
  bu: string;
  area: string | null;
  fullAddress: string | null;
  officeKeys: boolean;
  keysCount: number;
  securityKeysCount: number;
  fobCount: number;
  electricityStatus: string | null;
  gasStatus: string | null;
}

export interface Resident {
  id: string;
  fullName: string;
  email: string | null;
  telephone: string | null;
  nationality: string | null;
  personalId: string | null;
  iban: string | null;
  emergencyContact: string | null;
  source: string | null;
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
  resident?: Resident;
  bed?: { bedNumber: number; bedroomType: string; property?: Property };
}

export interface Bed {
  id: string;
  propertyId: string;
  propertyCode?: string;
  bedNumber: number;
  bedroomType: string;
  sex: string;
  bedSize: string;
  depositAmount: number;
  rentAmount: number;
  activeBooking?: Booking | null;
}

// --- Read ---
export const getDashboardStats = () => api.get<DashboardStats>('/dashboard/stats').then(r => r.data);
export const getProperties = () => api.get<Property[]>('/properties').then(r => r.data);
export const getBeds = (propertyId?: string) =>
  api.get<Bed[]>('/beds', { params: propertyId ? { propertyId } : {} }).then(r => r.data);
export const getResidents = () => api.get<Resident[]>('/residents').then(r => r.data);
export const getBookings = (status?: string) =>
  api.get<Booking[]>('/bookings', { params: status ? { status } : {} }).then(r => r.data);
export const importXlsx = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

// --- Create / Update ---
export const createProperty = (data: Omit<Property, 'id'>) =>
  api.post<Property>('/properties', data).then(r => r.data);
export const updateProperty = (id: string, data: Partial<Property>) =>
  api.put<Property>(`/properties/${id}`, data).then(r => r.data);
export const deleteProperty = (id: string) =>
  api.delete(`/properties/${id}`);

export const createBed = (data: Omit<Bed, 'id' | 'propertyCode' | 'activeBooking'>) =>
  api.post<Bed>('/beds', data).then(r => r.data);
export const updateBed = (id: string, data: Partial<Omit<Bed, 'propertyCode' | 'activeBooking'>>) =>
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
