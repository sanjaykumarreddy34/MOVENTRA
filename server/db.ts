import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import { hashPassword } from './auth.ts';

const dbPath = path.resolve(process.cwd(), 'moventra.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      customer_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      profile_photo TEXT,
      saved_addresses TEXT NOT NULL DEFAULT '[]',
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_cities (
      id TEXT PRIMARY KEY,
      city_name TEXT UNIQUE NOT NULL,
      state TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      pickup_available INTEGER NOT NULL DEFAULT 1,
      destination_available INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      hub_address TEXT NOT NULL,
      fleet_count INTEGER NOT NULL DEFAULT 8,
      services_available TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pricing_rules (
      id TEXT PRIMARY KEY,
      service_type TEXT UNIQUE NOT NULL,
      base_charge REAL NOT NULL,
      per_km_rate REAL NOT NULL,
      per_room_charge REAL NOT NULL,
      per_item_charge REAL NOT NULL,
      per_box_charge REAL NOT NULL,
      packing_standard REAL NOT NULL,
      packing_premium REAL NOT NULL,
      loading_charge REAL NOT NULL,
      unloading_charge REAL NOT NULL,
      carpenter_charge REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      vehicle_number TEXT UNIQUE NOT NULL,
      vehicle_type TEXT NOT NULL,
      capacity_tons REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      service_type TEXT NOT NULL,
      pickup_city TEXT NOT NULL,
      pickup_address TEXT NOT NULL,
      pickup_lat REAL NOT NULL,
      pickup_lng REAL NOT NULL,
      destination_city TEXT NOT NULL,
      destination_address TEXT NOT NULL,
      destination_lat REAL NOT NULL,
      destination_lng REAL NOT NULL,
      distance_km REAL NOT NULL,
      duration_text TEXT NOT NULL,
      rooms INTEGER NOT NULL,
      furniture_items INTEGER NOT NULL,
      packing_boxes INTEGER NOT NULL,
      floor_number INTEGER NOT NULL DEFAULT 0,
      has_lift INTEGER NOT NULL DEFAULT 1,
      packing_type TEXT NOT NULL DEFAULT 'Standard',
      loading_required INTEGER NOT NULL DEFAULT 1,
      carpenter_required INTEGER NOT NULL DEFAULT 0,
      moving_date TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      special_instructions TEXT NOT NULL DEFAULT '',
      furniture_photos TEXT NOT NULL DEFAULT '[]',
      price_breakdown TEXT NOT NULL,
      estimated_price REAL NOT NULL,
      final_amount REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      status TEXT NOT NULL DEFAULT 'Upcoming',
      tracking_stage INTEGER NOT NULL DEFAULT 1,
      assigned_vehicle TEXT,
      driver_name TEXT,
      driver_phone TEXT,
      estimated_arrival TEXT,
      last_update TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      booking_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      booking_id TEXT,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      admin_reply TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const now = new Date().toISOString();

  // Seed 20 Indian cities if empty
  const cityCount = (db.prepare('SELECT COUNT(*) as c FROM service_cities').get() as { c: number }).c;
  if (cityCount === 0) {
    const allServices = JSON.stringify([
      'House Shifting',
      'Office Shifting',
      'Carpenter Services',
      'Packers and Movers',
    ]);
    const cities = [
      ['Hyderabad', 'Telangana', 17.385, 78.4867, 'Plot 42, HITEC Logistics Park, Madhapur, Hyderabad 500081', 18],
      ['Bangalore', 'Karnataka', 12.9716, 77.5946, 'Sector 4, HSR Layout Freight Hub, Bengaluru 560102', 22],
      ['Mumbai', 'Maharashtra', 19.076, 72.8777, 'Unit 19, Andheri East Cargo Terminal, Mumbai 400069', 24],
      ['Delhi', 'Delhi NCR', 28.6139, 77.209, 'Block B, Okhla Industrial Phase II, New Delhi 110020', 21],
      ['Chennai', 'Tamil Nadu', 13.0827, 80.2707, 'NH-48 Ambattur Relocation Depot, Chennai 600058', 15],
      ['Kolkata', 'West Bengal', 22.5726, 88.3639, 'Salt Lake Sector V Logistics Wing, Kolkata 700091', 14],
      ['Pune', 'Maharashtra', 18.5204, 73.8567, 'Hinjewadi Phase 1 Fleet Terminal, Pune 411057', 16],
      ['Ahmedabad', 'Gujarat', 23.0225, 72.5714, 'SG Highway Transit Hub, Makarba, Ahmedabad 380051', 12],
      ['Jaipur', 'Rajasthan', 26.9124, 75.7873, 'Vishwakarma Industrial Area Hub, Jaipur 302013', 10],
      ['Lucknow', 'Uttar Pradesh', 26.8467, 80.9462, 'Gomti Nagar Transport Corridor, Lucknow 226010', 9],
      ['Chandigarh', 'Chandigarh', 30.7333, 76.7794, 'Industrial Area Phase I Depot, Chandigarh 160002', 11],
      ['Jalandhar', 'Punjab', 31.326, 75.5762, 'GT Road Model Town Cargo Point, Jalandhar 144003', 7],
      ['Ludhiana', 'Punjab', 30.901, 75.8573, 'Focal Point Phase IV Terminal, Ludhiana 141010', 8],
      ['Amritsar', 'Punjab', 31.634, 74.8723, 'Ranjit Avenue Moving Center, Amritsar 143001', 6],
      ['Kochi', 'Kerala', 9.9312, 76.2673, 'Edappally NH-66 Logistics Hub, Kochi 682024', 10],
      ['Indore', 'Madhya Pradesh', 22.7196, 75.8577, 'Vijay Nagar Dewas Naka Depot, Indore 452010', 9],
      ['Bhopal', 'Madhya Pradesh', 23.2599, 77.4126, 'Govindpura Industrial Hub, Bhopal 462023', 7],
      ['Patna', 'Bihar', 25.5941, 85.1376, 'Patliputra Logistics Terminal, Patna 800013', 7],
      ['Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185, 'Gajuwaka Port Corridor Hub, Visakhapatnam 530026', 8],
      ['Bhubaneswar', 'Odisha', 20.2961, 85.8245, 'Patia Infocity Transit Hub, Bhubaneswar 751024', 8],
    ] as const;

    const insertCity = db.prepare(`
      INSERT INTO service_cities (id, city_name, state, lat, lng, pickup_available, destination_available, is_active, hub_address, fleet_count, services_available)
      VALUES (?, ?, ?, ?, ?, 1, 1, 1, ?, ?, ?)
    `);
    for (const [name, state, lat, lng, hub, fleet] of cities) {
      insertCity.run(crypto.randomUUID(), name, state, lat, lng, hub, fleet, allServices);
    }
  }

  // Seed pricing rules
  const pricingCount = (db.prepare('SELECT COUNT(*) as c FROM pricing_rules').get() as { c: number }).c;
  if (pricingCount === 0) {
    const insertPrice = db.prepare(`
      INSERT INTO pricing_rules (
        id, service_type, base_charge, per_km_rate, per_room_charge, per_item_charge, per_box_charge,
        packing_standard, packing_premium, loading_charge, unloading_charge, carpenter_charge, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPrice.run(crypto.randomUUID(), 'House Shifting', 3500, 18, 1200, 220, 90, 1500, 3200, 1200, 1200, 950, now);
    insertPrice.run(crypto.randomUUID(), 'Office Shifting', 6500, 24, 1800, 300, 110, 2400, 4800, 1800, 1800, 1400, now);
    insertPrice.run(crypto.randomUUID(), 'Carpenter Services', 1200, 10, 350, 280, 40, 400, 900, 500, 500, 1600, now);
    insertPrice.run(crypto.randomUUID(), 'Packers and Movers', 4200, 20, 1300, 240, 100, 1800, 3600, 1400, 1400, 1100, now);
  }

  // Seed drivers & fleet
  const driverCount = (db.prepare('SELECT COUNT(*) as c FROM drivers').get() as { c: number }).c;
  if (driverCount === 0) {
    const insertDriver = db.prepare(`
      INSERT INTO drivers (id, name, phone, vehicle_number, vehicle_type, capacity_tons, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertDriver.run(crypto.randomUUID(), 'Rajesh Verma', '9849012345', 'TS-09-UB-4821', 'Eicher Pro 2095XL Closed Container', 7.5, 'On Trip');
    insertDriver.run(crypto.randomUUID(), 'Suresh Nair', '9880154321', 'KA-01-AG-7714', 'Tata Ultra T.12 Insulated Box', 9.0, 'Available');
    insertDriver.run(crypto.randomUUID(), 'Vikram Deshmukh', '9820478910', 'MH-12-TR-3190', 'Ashok Leyland Ecomet 1615', 11.0, 'On Trip');
    insertDriver.run(crypto.randomUUID(), 'Harpreet Gill', '9814066512', 'PB-10-CX-9045', 'BharatBenz 1217C Closed Body', 8.5, 'Available');
    insertDriver.run(crypto.randomUUID(), 'Karthik Subramanian', '9840922318', 'TN-07-BZ-6102', 'Eicher Pro 3015XL Container', 10.5, 'Available');
  }

  // Seed Demo Admin & Sample Customer (clearly flagged as is_sample = 1)
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const adminId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, customer_id, full_name, email, phone, password_hash, role, saved_addresses, is_sample, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'admin', '[]', 0, ?)
    `).run(adminId, 'ADM-2026-00001', 'MOVENTRA Operations Lead', 'admin@moventra.in', '9000000001', hashPassword('Admin@Moventra2026'), now);

    const sampleUserId = crypto.randomUUID();
    const sampleAddresses = JSON.stringify([
      { id: 'addr-1', label: 'Home (Hyderabad)', city: 'Hyderabad', address: 'Flat 402, Prestige Ivy League, Kondapur, Hyderabad 500084' },
      { id: 'addr-2', label: 'Work (Bangalore)', city: 'Bangalore', address: 'Tower B, Embassy GolfLinks, Domlur, Bengaluru 560071' },
    ]);
    db.prepare(`
      INSERT INTO users (id, customer_id, full_name, email, phone, password_hash, role, saved_addresses, is_sample, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'customer', ?, 1, ?)
    `).run(sampleUserId, 'MOV-2026-00001', 'Aarav Sharma', 'aarav.sharma@gmail.com', '9876543210', hashPassword('Moventra@2026'), sampleAddresses, '2026-06-15T10:00:00.000Z');

    const sampleUser2Id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, customer_id, full_name, email, phone, password_hash, role, saved_addresses, is_sample, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'customer', '[]', 1, ?)
    `).run(sampleUser2Id, 'MOV-2026-00002', 'Priya Menon', 'priya.menon@gmail.com', '9845011223', hashPassword('Moventra@2026'), '2026-08-20T09:30:00.000Z');

    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        id, booking_id, user_id, customer_id, service_type,
        pickup_city, pickup_address, pickup_lat, pickup_lng,
        destination_city, destination_address, destination_lat, destination_lng,
        distance_km, duration_text, rooms, furniture_items, packing_boxes,
        floor_number, has_lift, packing_type, loading_required, carpenter_required,
        moving_date, preferred_time, special_instructions, furniture_photos,
        price_breakdown, estimated_price, final_amount, payment_status,
        status, tracking_stage, assigned_vehicle, driver_name, driver_phone,
        estimated_arrival, last_update, is_sample, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    // Active Booking (In Transit)
    insertBooking.run(
      crypto.randomUUID(), 'BK-2026-00001', sampleUserId, 'MOV-2026-00001', 'House Shifting',
      'Hyderabad', 'Flat 402, Prestige Ivy League, Kondapur, Hyderabad 500084', 17.4622, 78.3568,
      'Bangalore', 'Villa 18, Palm Meadows, Whitefield, Bengaluru 560066', 12.9698, 77.7499,
      574, '9 hrs 20 mins', 3, 14, 28,
      4, 1, 'Premium', 1, 1,
      '2026-11-12', '08:00 AM - 10:00 AM', 'Handle 65-inch OLED TV and rosewood dining set with extra corner guards.',
      JSON.stringify({ transportation: 13832, packing: 6120, labour: 3600, loading: 1200, unloading: 1200, carpenter: 950, additional: 400, total: 27302 }),
      27302, 27302, 'Paid',
      'Active', 6, 'TS-09-UB-4821 (Eicher Pro 2095XL)', 'Rajesh Verma', '9849012345',
      '2026-11-13 06:30 PM', 'Crossed Kurnool Highway Toll Plaza along NH-44.', '2026-11-10T11:15:00.000Z', now
    );

    // Upcoming Booking
    insertBooking.run(
      crypto.randomUUID(), 'BK-2026-00002', sampleUserId, 'MOV-2026-00001', 'Carpenter Services',
      'Bangalore', 'Tower B, Embassy GolfLinks, Domlur, Bengaluru 560071', 12.9507, 77.6431,
      'Bangalore', 'Villa 18, Palm Meadows, Whitefield, Bengaluru 560066', 12.9698, 77.7499,
      18, '45 mins', 2, 6, 4,
      2, 1, 'Standard', 1, 1,
      '2026-11-24', '10:00 AM - 12:00 PM', 'Assemble modular teak wardrobe and hydraulic king bed.',
      JSON.stringify({ transportation: 1380, packing: 560, labour: 700, loading: 500, unloading: 500, carpenter: 1600, additional: 250, total: 5490 }),
      5490, 5490, 'Pending',
      'Upcoming', 1, null, null, null,
      '2026-11-24 02:00 PM', 'Booking confirmed. Crew allocation scheduled 24h prior.', '2026-11-12T09:00:00.000Z', now
    );

    // Completed Booking
    insertBooking.run(
      crypto.randomUUID(), 'BK-2026-00003', sampleUserId, 'MOV-2026-00001', 'Packers and Movers',
      'Pune', 'B-704, Magarpatta City, Hadapsar, Pune 411028', 18.5145, 73.9267,
      'Hyderabad', 'Flat 402, Prestige Ivy League, Kondapur, Hyderabad 500084', 17.4622, 78.3568,
      562, '9 hrs 45 mins', 2, 10, 20,
      7, 1, 'Premium', 1, 0,
      '2026-09-14', '07:00 AM - 09:00 AM', 'All kitchen fragile boxes labelled in blue.',
      JSON.stringify({ transportation: 15440, packing: 5600, labour: 2600, loading: 1400, unloading: 1400, carpenter: 0, additional: 350, total: 26790 }),
      26790, 26790, 'Paid',
      'Completed', 9, 'MH-12-TR-3190 (Ashok Leyland Ecomet)', 'Vikram Deshmukh', '9820478910',
      '2026-09-15 05:15 PM', 'Delivered and unpacked cleanly. Signed POD received.', '2026-09-08T14:20:00.000Z', '2026-09-15T17:30:00.000Z'
    );

    // Cancelled Booking
    insertBooking.run(
      crypto.randomUUID(), 'BK-2026-00004', sampleUserId, 'MOV-2026-00001', 'Office Shifting',
      'Mumbai', 'Level 5, Supreme Business Park, Powai, Mumbai 400076', 19.1176, 72.906,
      'Pune', 'Level 3, Panchshil Tech Park, Yerwada, Pune 411006', 18.5529, 73.8801,
      148, '3 hrs 10 mins', 4, 18, 30,
      5, 1, 'Standard', 1, 1,
      '2026-07-28', '09:00 AM - 11:00 AM', 'Weekend IT workstation shift.',
      JSON.stringify({ transportation: 10052, packing: 5700, labour: 7200, loading: 1800, unloading: 1800, carpenter: 1400, additional: 500, total: 28452 }),
      28452, 0, 'Refunded',
      'Cancelled', 1, null, null, null,
      null, 'Cancelled by customer 5 days before moving date.', '2026-07-19T10:10:00.000Z', '2026-07-23T12:00:00.000Z'
    );

    // Second customer completed sample booking for Admin Analytics richness
    insertBooking.run(
      crypto.randomUUID(), 'BK-2026-00005', sampleUser2Id, 'MOV-2026-00002', 'Office Shifting',
      'Chennai', 'TIDEL Park, Taramani, Chennai 600113', 12.9896, 80.2485,
      'Kochi', 'Infopark Phase 2, Kakkanad, Kochi 682042', 10.0104, 76.3652,
      685, '11 hrs 30 mins', 5, 22, 40,
      3, 1, 'Premium', 1, 1,
      '2026-10-05', '06:00 AM - 08:00 AM', 'Server racks in anti-static foam crates.',
      JSON.stringify({ transportation: 22940, packing: 9200, labour: 9000, loading: 1800, unloading: 1800, carpenter: 1400, additional: 800, total: 46940 }),
      46940, 46940, 'Paid',
      'Completed', 9, 'TN-07-BZ-6102 (Eicher Pro 3015XL)', 'Karthik Subramanian', '9840922318',
      '2026-10-06 04:00 PM', 'Office relocation handed over cleanly.', '2026-09-29T16:00:00.000Z', '2026-10-06T16:15:00.000Z'
    );

    // Sample notifications for Aarav
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertNotif.run(crypto.randomUUID(), sampleUserId, 'BK-2026-00001', 'Shipment In Transit along NH-44', 'Vehicle TS-09-UB-4821 driven by Rajesh Verma crossed Kurnool Toll Plaza. ETA tomorrow 6:30 PM.', 'transit', 0, now);
    insertNotif.run(crypto.randomUUID(), sampleUserId, 'BK-2026-00001', 'Payment Received (₹27,302)', 'Thank you! Payment for booking BK-2026-00001 is verified and settled.', 'payment', 0, '2026-11-11T14:00:00.000Z');
    insertNotif.run(crypto.randomUUID(), sampleUserId, 'BK-2026-00002', 'Booking BK-2026-00002 Confirmed', 'Your Carpenter Services request in Bangalore is scheduled for Nov 24, 2026.', 'confirmation', 1, '2026-11-12T09:05:00.000Z');
  }
}

export function generateNextCustomerId(): string {
  const rows = db
    .prepare("SELECT customer_id FROM users WHERE customer_id LIKE 'MOV-2026-%' ORDER BY customer_id DESC LIMIT 1")
    .all() as { customer_id: string }[];
  if (rows.length === 0) return 'MOV-2026-00001';
  const lastNum = parseInt(rows[0].customer_id.split('-')[2] || '0', 10);
  const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
  return `MOV-2026-${String(nextNum).padStart(5, '0')}`;
}

export function generateNextBookingId(): string {
  const rows = db
    .prepare("SELECT booking_id FROM bookings WHERE booking_id LIKE 'BK-2026-%' ORDER BY booking_id DESC LIMIT 1")
    .all() as { booking_id: string }[];
  if (rows.length === 0) return 'BK-2026-00001';
  const lastNum = parseInt(rows[0].booking_id.split('-')[2] || '0', 10);
  const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
  return `BK-2026-${String(nextNum).padStart(5, '0')}`;
}
