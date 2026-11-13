import heroTruckImg from './assets/images/hero_moventra_truck_1794551054512.jpg';
import officeShiftingImg from './assets/images/service_office_shifting_1794551055907.jpg';
import carpenterImg from './assets/images/service_carpenter_assembly_1794551056092.jpg';

export type ServiceType =
  | 'House Shifting'
  | 'Office Shifting'
  | 'Carpenter Services'
  | 'Packers and Movers';

export type BookingStatus = 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Paid' | 'Refunded';

export interface SavedAddress {
  id: string;
  label: string;
  city: string;
  address: string;
}

export interface User {
  id: string;
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  profilePhoto: string | null;
  savedAddresses: SavedAddress[];
  isSample?: boolean;
  createdAt: string;
  stats?: {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    upcomingBookings: number;
  };
}

export interface PriceBreakdown {
  transportation: number;
  packing: number;
  labour: number;
  loading: number;
  unloading: number;
  carpenter: number;
  additional: number;
  total: number;
}

export interface Booking {
  id: string;
  bookingId: string;
  userId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  serviceType: ServiceType;
  pickupCity: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationCity: string;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  durationText: string;
  rooms: number;
  furnitureItems: number;
  packingBoxes: number;
  floorNumber: number;
  hasLift: boolean;
  packingType: 'Standard' | 'Premium';
  loadingRequired: boolean;
  carpenterRequired: boolean;
  movingDate: string;
  preferredTime: string;
  specialInstructions: string;
  furniturePhotos: string[];
  priceBreakdown: PriceBreakdown;
  estimatedPrice: number;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  trackingStage: number;
  assignedVehicle: string | null;
  driverName: string | null;
  driverPhone: string | null;
  estimatedArrival: string | null;
  lastUpdate: string;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCity {
  id: string;
  cityName: string;
  state: string;
  lat: number;
  lng: number;
  pickupAvailable: boolean;
  destinationAvailable: boolean;
  isActive: boolean;
  hubAddress: string;
  fleetCount: number;
  servicesAvailable: ServiceType[];
  bookingCount?: number;
}

export interface PricingRule {
  id: string;
  serviceType: ServiceType;
  baseCharge: number;
  perKmRate: number;
  perRoomCharge: number;
  perItemCharge: number;
  perBoxCharge: number;
  packingStandard: number;
  packingPremium: number;
  loadingCharge: number;
  unloadingCharge: number;
  carpenterCharge: number;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  bookingId: string | null;
  title: string;
  message: string;
  type: 'confirmation' | 'vehicle' | 'packing' | 'transit' | 'delivery' | 'payment' | 'support';
  isRead: boolean;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  capacityTons: number;
  status: 'Available' | 'On Trip';
}

export interface SupportTicket {
  id: string;
  userId: string;
  customerId: string;
  bookingId: string | null;
  subject: string;
  category: string;
  message: string;
  status: 'Open' | 'In Review' | 'Resolved';
  adminReply: string | null;
  createdAt: string;
}

export const TRACKING_STAGES = [
  'Booking Confirmed',
  'Vehicle Assigned',
  'Packing Started',
  'Loading Completed',
  'Vehicle Dispatched',
  'In Transit',
  'Reached Destination',
  'Unloading Completed',
  'Delivered Successfully',
] as const;

export const SERVICE_DETAILS: {
  type: ServiceType;
  subtitle: string;
  highlights: string[];
  image: string;
}[] = [
  {
    type: 'House Shifting',
    subtitle: 'End-to-end residential relocation for 1BHK to Villas across India.',
    highlights: [
      'Complete home relocation',
      'Bedroom furniture protection',
      'Kitchen goods & glassware',
      'Household appliances crating',
    ],
    image: '/assets/aistudio/Screenshot_2026-11-13_114955_c9251a10.png',
  },
  {
    type: 'Office Shifting',
    subtitle: 'Zero-downtime corporate & IT workspace relocation with anti-static crates.',
    highlights: [
      'Office furniture & workstations',
      'Computers & server equipment',
      'Indexed office documents',
      'Complete office relocation',
    ],
    image: officeShiftingImg,
  },
  {
    type: 'Carpenter Services',
    subtitle: 'Trained woodcraft technicians for dismantling and precision re-assembly.',
    highlights: [
      'Furniture dismantling',
      'Furniture assembly',
      'Bed & modular installation',
      'Wardrobe, table & chair setup',
    ],
    image: carpenterImg,
  },
  {
    type: 'Packers and Movers',
    subtitle: 'Full-service intercity logistics with 5-layer corrugated & bubble protection.',
    highlights: [
      'Professional multi-layer packing',
      'Trained loading crew',
      'GPS-tracked fleet transport',
      'Unloading & systematic unpacking',
    ],
    image: heroTruckImg,
  },
];
