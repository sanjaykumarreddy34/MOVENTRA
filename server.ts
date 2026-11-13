import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, generateNextCustomerId, generateNextBookingId } from './server/db.ts';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  requireAuth,
  requireAdmin,
  SESSION_COOKIE_NAME,
  type AuthenticatedRequest,
} from './server/auth.ts';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));

// In-memory demo OTP store for phone verification
const phoneOtpStore: Record<string, { phone: string; code: string; expiresAt: number }> = {};

function formatUser(row: any) {
  const statsRow = db
    .prepare(
      `SELECT
        COUNT(*) as totalBookings,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as activeBookings,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedBookings,
        SUM(CASE WHEN status = 'Upcoming' THEN 1 ELSE 0 END) as upcomingBookings
      FROM bookings WHERE user_id = ?`
    )
    .get(row.id) as any;

  return {
    id: row.id,
    customerId: row.customer_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    profilePhoto: row.profile_photo || null,
    savedAddresses: JSON.parse(row.saved_addresses || '[]'),
    isSample: Boolean(row.is_sample),
    createdAt: row.created_at,
    stats: {
      totalBookings: statsRow?.totalBookings || 0,
      activeBookings: statsRow?.activeBookings || 0,
      completedBookings: statsRow?.completedBookings || 0,
      upcomingBookings: statsRow?.upcomingBookings || 0,
    },
  };
}

function formatBooking(row: any) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    serviceType: row.service_type,
    pickupCity: row.pickup_city,
    pickupAddress: row.pickup_address,
    pickupLat: row.pickup_lat,
    pickupLng: row.pickup_lng,
    destinationCity: row.destination_city,
    destinationAddress: row.destination_address,
    destinationLat: row.destination_lat,
    destinationLng: row.destination_lng,
    distanceKm: row.distance_km,
    durationText: row.duration_text,
    rooms: row.rooms,
    furnitureItems: row.furniture_items,
    packingBoxes: row.packing_boxes,
    floorNumber: row.floor_number,
    hasLift: Boolean(row.has_lift),
    packingType: row.packing_type,
    loadingRequired: Boolean(row.loading_required),
    carpenterRequired: Boolean(row.carpenter_required),
    movingDate: row.moving_date,
    preferredTime: row.preferred_time,
    specialInstructions: row.special_instructions,
    furniturePhotos: JSON.parse(row.furniture_photos || '[]'),
    priceBreakdown: JSON.parse(row.price_breakdown || '{}'),
    estimatedPrice: row.estimated_price,
    finalAmount: row.final_amount,
    paymentStatus: row.payment_status,
    status: row.status,
    trackingStage: row.tracking_stage,
    assignedVehicle: row.assigned_vehicle,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    estimatedArrival: row.estimated_arrival,
    lastUpdate: row.last_update,
    isSample: Boolean(row.is_sample),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function calculatePriceBreakdown(params: {
  serviceType: string;
  distanceKm: number;
  rooms: number;
  furnitureItems: number;
  packingBoxes: number;
  floorNumber: number;
  hasLift: boolean;
  packingType: 'Standard' | 'Premium';
  loadingRequired: boolean;
  carpenterRequired: boolean;
}) {
  const rule = db
    .prepare('SELECT * FROM pricing_rules WHERE service_type = ?')
    .get(params.serviceType) as any;

  if (!rule) {
    throw new Error('Pricing rule not found for selected service.');
  }

  const dist = Math.max(1, Number(params.distanceKm) || 1);
  const rooms = Math.max(1, Number(params.rooms) || 1);
  const items = Math.max(0, Number(params.furnitureItems) || 0);
  const boxes = Math.max(0, Number(params.packingBoxes) || 0);
  const floor = Math.max(0, Number(params.floorNumber) || 0);

  const transportation = Math.round(rule.base_charge + dist * rule.per_km_rate);
  const packingBase = params.packingType === 'Premium' ? rule.packing_premium : rule.packing_standard;
  const packing = Math.round(packingBase + boxes * rule.per_box_charge);
  const labour = Math.round(rooms * rule.per_room_charge + items * rule.per_item_charge);
  const loading = params.loadingRequired ? Math.round(rule.loading_charge) : 0;
  const unloading = params.loadingRequired ? Math.round(rule.unloading_charge) : 0;
  const carpenter =
    params.carpenterRequired || params.serviceType === 'Carpenter Services'
      ? Math.round(rule.carpenter_charge)
      : 0;
  const additional = !params.hasLift && floor > 1 ? Math.round((floor - 1) * 350) : 0;

  const total = transportation + packing + labour + loading + unloading + carpenter + additional;
  return {
    transportation,
    packing,
    labour,
    loading,
    unloading,
    carpenter,
    additional,
    total,
  };
}

// ==========================================
// CONFIG & MAPS KEY ENDPOINT
// ==========================================
app.get('/api/config/maps', (_req, res) => {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  res.json({ apiKey });
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================
app.post('/api/auth/register', (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body || {};
    const cleanName = String(fullName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').replace(/\D/g, '');

    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
    }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid Gmail address ending in @gmail.com.' });
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and confirmation password do not match.' });
    }

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this Gmail address already exists.' });
    }

    const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
    if (existingPhone) {
      return res.status(409).json({ error: 'An account with this Indian mobile number already exists.' });
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    let customerId = '';

    const createTx = db.transaction(() => {
      customerId = generateNextCustomerId();
      db.prepare(`
        INSERT INTO users (id, customer_id, full_name, email, phone, password_hash, role, saved_addresses, is_sample, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'customer', '[]', 0, ?)
      `).run(userId, customerId, cleanName, cleanEmail, cleanPhone, hashPassword(String(password)), now);

      db.prepare(`
        INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
        VALUES (?, ?, NULL, ?, ?, 'confirmation', 0, ?)
      `).run(
        crypto.randomUUID(),
        userId,
        `Welcome to MOVENTRA, ${cleanName}!`,
        `Your unique Customer ID ${customerId} is now active. Book a move or plan routes across 20 Indian cities.`,
        now
      );
    });

    createTx();

    const token = signSessionToken({ userId, role: 'customer' }, 60 * 60 * 24 * 7);
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.status(201).json({
      message: `Account created successfully! Your Customer ID is ${customerId}.`,
      user: formatUser(userRow),
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, rememberMe, portal } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;
    if (!userRow || !verifyPassword(String(password), userRow.password_hash)) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    if (portal === 'admin' && userRow.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. This portal is restricted to authorized administrators.' });
    }

    const ttlSeconds = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    const token = signSessionToken({ userId: userRow.id, role: userRow.role }, ttlSeconds);
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ttlSeconds * 1000,
    });

    res.json({
      message: 'Signed in successfully.',
      user: formatUser(userRow),
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Login failed.' });
  }
});

app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email, phone, newPassword, confirmPassword } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').replace(/\D/g, '');

    if (!cleanEmail || !/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please provide your registered email and 10-digit mobile number.' });
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE email = ? AND phone = ?')
      .get(cleanEmail, cleanPhone) as any;

    if (!userRow) {
      return res.status(404).json({ error: 'No account found matching both that email address and mobile number.' });
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      hashPassword(String(newPassword)),
      userRow.id
    );

    res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Password reset failed.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ message: 'Logged out successfully.' });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId);
  if (!userRow) {
    return res.status(401).json({ error: 'User account not found.' });
  }
  res.json({ user: formatUser(userRow) });
});

// ==========================================
// PROFILE ENDPOINTS
// ==========================================
app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { fullName, profilePhoto, savedAddresses } = req.body || {};
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId) as any;
    if (!userRow) return res.status(404).json({ error: 'User not found.' });

    const nextName = fullName !== undefined ? String(fullName).trim() : userRow.full_name;
    if (nextName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }

    const nextPhoto = profilePhoto !== undefined ? profilePhoto : userRow.profile_photo;
    const nextAddresses =
      savedAddresses !== undefined ? JSON.stringify(savedAddresses) : userRow.saved_addresses;

    db.prepare('UPDATE users SET full_name = ?, profile_photo = ?, saved_addresses = ? WHERE id = ?').run(
      nextName,
      nextPhoto,
      nextAddresses,
      userRow.id
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userRow.id);
    res.json({ message: 'Profile updated successfully.', user: formatUser(updated) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update profile.' });
  }
});

app.post('/api/profile/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId) as any;
  if (!userRow) return res.status(404).json({ error: 'User not found.' });

  if (!verifyPassword(String(currentPassword || ''), userRow.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New passwords do not match.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(String(newPassword)),
    userRow.id
  );
  res.json({ message: 'Password updated securely.' });
});

app.post('/api/profile/phone-otp', requireAuth, (req: AuthenticatedRequest, res) => {
  const cleanPhone = String(req.body?.phone || '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  }
  const existing = db
    .prepare('SELECT id FROM users WHERE phone = ? AND id != ?')
    .get(cleanPhone, req.auth!.userId);
  if (existing) {
    return res.status(409).json({ error: 'This mobile number is already linked to another account.' });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  phoneOtpStore[req.auth!.userId] = {
    phone: cleanPhone,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  res.json({
    message: 'Verification OTP generated (Demo SMS Verification Mode).',
    demoOtp: code,
  });
});

app.post('/api/profile/verify-phone', requireAuth, (req: AuthenticatedRequest, res) => {
  const { phone, otp } = req.body || {};
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const entry = phoneOtpStore[req.auth!.userId];
  if (!entry || entry.phone !== cleanPhone || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'OTP expired or phone number mismatch. Request a new code.' });
  }
  if (String(otp || '').trim() !== entry.code) {
    return res.status(400).json({ error: 'Incorrect verification code.' });
  }
  delete phoneOtpStore[req.auth!.userId];
  db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(cleanPhone, req.auth!.userId);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId);
  res.json({ message: 'Mobile number verified and updated.', user: formatUser(updated) });
});

// ==========================================
// CITIES & PRICING ENDPOINTS
// ==========================================
app.get('/api/cities', (_req, res) => {
  const cities = db.prepare('SELECT * FROM service_cities ORDER BY city_name ASC').all() as any[];
  const counts = db
    .prepare(
      `SELECT pickup_city as city, COUNT(*) as cnt FROM bookings GROUP BY pickup_city
       UNION ALL
       SELECT destination_city as city, COUNT(*) as cnt FROM bookings WHERE destination_city != pickup_city GROUP BY destination_city`
    )
    .all() as { city: string; cnt: number }[];

  const countMap: Record<string, number> = {};
  for (const row of counts) {
    countMap[row.city] = (countMap[row.city] || 0) + row.cnt;
  }

  res.json({
    cities: cities.map((c) => ({
      id: c.id,
      cityName: c.city_name,
      state: c.state,
      lat: c.lat,
      lng: c.lng,
      pickupAvailable: Boolean(c.pickup_available),
      destinationAvailable: Boolean(c.destination_available),
      isActive: Boolean(c.is_active),
      hubAddress: c.hub_address,
      fleetCount: c.fleet_count,
      servicesAvailable: JSON.parse(c.services_available || '[]'),
      bookingCount: countMap[c.city_name] || 0,
    })),
  });
});

app.get('/api/pricing', (_req, res) => {
  const rules = db.prepare('SELECT * FROM pricing_rules').all() as any[];
  res.json({
    rules: rules.map((r) => ({
      id: r.id,
      serviceType: r.service_type,
      baseCharge: r.base_charge,
      perKmRate: r.per_km_rate,
      perRoomCharge: r.per_room_charge,
      perItemCharge: r.per_item_charge,
      perBoxCharge: r.per_box_charge,
      packingStandard: r.packing_standard,
      packingPremium: r.packing_premium,
      loadingCharge: r.loading_charge,
      unloadingCharge: r.unloading_charge,
      carpenterCharge: r.carpenter_charge,
      updatedAt: r.updated_at,
    })),
  });
});

app.post('/api/pricing/calculate', (req, res) => {
  try {
    const breakdown = calculatePriceBreakdown(req.body || {});
    res.json({ breakdown });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to calculate price.' });
  }
});

// ==========================================
// CUSTOMER BOOKINGS & TRACKING
// ==========================================
app.get('/api/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, u.full_name as customer_name, u.phone as customer_phone
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.auth!.userId);
  res.json({ bookings: rows.map(formatBooking) });
});

app.post('/api/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId) as any;
    if (!userRow) return res.status(404).json({ error: 'Customer not found.' });

    const body = req.body || {};
    const {
      serviceType,
      pickupCity,
      pickupAddress,
      pickupLat,
      pickupLng,
      destinationCity,
      destinationAddress,
      destinationLat,
      destinationLng,
      distanceKm,
      durationText,
      rooms,
      furnitureItems,
      packingBoxes,
      floorNumber,
      hasLift,
      packingType,
      loadingRequired,
      carpenterRequired,
      movingDate,
      preferredTime,
      specialInstructions,
      furniturePhotos,
    } = body;

    if (!serviceType || !pickupCity || !destinationCity || !pickupAddress || !destinationAddress || !movingDate) {
      return res.status(400).json({ error: 'Please complete all required booking location, service, and date fields.' });
    }

    const breakdown = calculatePriceBreakdown({
      serviceType,
      distanceKm: Number(distanceKm) || 25,
      rooms: Number(rooms) || 1,
      furnitureItems: Number(furnitureItems) || 0,
      packingBoxes: Number(packingBoxes) || 0,
      floorNumber: Number(floorNumber) || 0,
      hasLift: Boolean(hasLift),
      packingType: packingType === 'Premium' ? 'Premium' : 'Standard',
      loadingRequired: loadingRequired !== false,
      carpenterRequired: Boolean(carpenterRequired),
    });

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let bookingId = '';

    const tx = db.transaction(() => {
      bookingId = generateNextBookingId();
      db.prepare(`
        INSERT INTO bookings (
          id, booking_id, user_id, customer_id, service_type,
          pickup_city, pickup_address, pickup_lat, pickup_lng,
          destination_city, destination_address, destination_lat, destination_lng,
          distance_km, duration_text, rooms, furniture_items, packing_boxes,
          floor_number, has_lift, packing_type, loading_required, carpenter_required,
          moving_date, preferred_time, special_instructions, furniture_photos,
          price_breakdown, estimated_price, final_amount, payment_status,
          status, tracking_stage, last_update, is_sample, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Upcoming', 1, ?, 0, ?, ?)
      `).run(
        id,
        bookingId,
        userRow.id,
        userRow.customer_id,
        serviceType,
        pickupCity,
        String(pickupAddress).trim(),
        Number(pickupLat) || 17.385,
        Number(pickupLng) || 78.4867,
        destinationCity,
        String(destinationAddress).trim(),
        Number(destinationLat) || 12.9716,
        Number(destinationLng) || 77.5946,
        Math.max(1, Math.round(Number(distanceKm) || 25)),
        String(durationText || 'Calculated'),
        Math.max(1, Number(rooms) || 1),
        Math.max(0, Number(furnitureItems) || 0),
        Math.max(0, Number(packingBoxes) || 0),
        Math.max(0, Number(floorNumber) || 0),
        hasLift ? 1 : 0,
        packingType === 'Premium' ? 'Premium' : 'Standard',
        loadingRequired !== false ? 1 : 0,
        carpenterRequired ? 1 : 0,
        movingDate,
        preferredTime || '09:00 AM - 11:00 AM',
        String(specialInstructions || ''),
        JSON.stringify(Array.isArray(furniturePhotos) ? furniturePhotos.slice(0, 4) : []),
        JSON.stringify(breakdown),
        breakdown.total,
        breakdown.total,
        'Booking confirmed. Awaiting dispatch and vehicle assignment.',
        now,
        now
      );

      db.prepare(`
        INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 'confirmation', 0, ?)
      `).run(
        crypto.randomUUID(),
        userRow.id,
        bookingId,
        `Booking ${bookingId} Confirmed`,
        `Your ${serviceType} move from ${pickupCity} to ${destinationCity} on ${movingDate} is confirmed. Estimated total: ₹${breakdown.total.toLocaleString('en-IN')}.`,
        now
      );
    });

    tx();

    const created = db
      .prepare(
        `SELECT b.*, u.full_name as customer_name, u.phone as customer_phone
         FROM bookings b JOIN users u ON u.id = b.user_id WHERE b.id = ?`
      )
      .get(id);

    res.status(201).json({
      message: `Booking ${bookingId} confirmed!`,
      booking: formatBooking(created),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create booking.' });
  }
});

app.get('/api/bookings/track/:bookingId', requireAuth, (req: AuthenticatedRequest, res) => {
  const code = String(req.params.bookingId || '').trim().toUpperCase();
  const row = db
    .prepare(
      `SELECT b.*, u.full_name as customer_name, u.phone as customer_phone
       FROM bookings b JOIN users u ON u.id = b.user_id WHERE UPPER(b.booking_id) = ?`
    )
    .get(code) as any;

  if (!row) {
    return res.status(404).json({ error: `No booking found with ID ${code}.` });
  }
  if (req.auth!.role !== 'admin' && row.user_id !== req.auth!.userId) {
    return res.status(403).json({ error: 'You are only authorized to track your own bookings.' });
  }
  res.json({ booking: formatBooking(row) });
});

app.post('/api/bookings/:bookingId/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
  const code = String(req.params.bookingId || '').trim().toUpperCase();
  const row = db.prepare('SELECT * FROM bookings WHERE UPPER(booking_id) = ?').get(code) as any;
  if (!row) return res.status(404).json({ error: 'Booking not found.' });
  if (row.user_id !== req.auth!.userId && req.auth!.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized to cancel this booking.' });
  }
  if (row.status === 'Completed' || row.status === 'Cancelled') {
    return res.status(400).json({ error: `Cannot cancel a booking that is already ${row.status}.` });
  }
  if (row.status === 'Active' && row.tracking_stage >= 5) {
    return res.status(400).json({ error: 'Vehicle already dispatched. Please contact support for mid-transit modifications.' });
  }

  const now = new Date().toISOString();
  const nextPay = row.payment_status === 'Paid' ? 'Refunded' : 'Pending';
  db.prepare(
    `UPDATE bookings SET status = 'Cancelled', payment_status = ?, last_update = ?, updated_at = ? WHERE id = ?`
  ).run(nextPay, 'Booking cancelled as requested.', now, row.id);

  db.prepare(`
    INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 'confirmation', 0, ?)
  `).run(
    crypto.randomUUID(),
    row.user_id,
    row.booking_id,
    `Booking ${row.booking_id} Cancelled`,
    `Your booking from ${row.pickup_city} to ${row.destination_city} has been cancelled.`,
    now
  );

  const updated = db
    .prepare(
      `SELECT b.*, u.full_name as customer_name, u.phone as customer_phone
       FROM bookings b JOIN users u ON u.id = b.user_id WHERE b.id = ?`
    )
    .get(row.id);
  res.json({ message: 'Booking cancelled successfully.', booking: formatBooking(updated) });
});

app.post('/api/bookings/:bookingId/pay', requireAuth, (req: AuthenticatedRequest, res) => {
  const code = String(req.params.bookingId || '').trim().toUpperCase();
  const row = db.prepare('SELECT * FROM bookings WHERE UPPER(booking_id) = ?').get(code) as any;
  if (!row) return res.status(404).json({ error: 'Booking not found.' });
  if (row.user_id !== req.auth!.userId && req.auth!.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized.' });
  }
  if (row.status === 'Cancelled') {
    return res.status(400).json({ error: 'Cannot pay for a cancelled booking.' });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE bookings SET payment_status = 'Paid', updated_at = ? WHERE id = ?`).run(now, row.id);
  db.prepare(`
    INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 'payment', 0, ?)
  `).run(
    crypto.randomUUID(),
    row.user_id,
    row.booking_id,
    `Payment Confirmed for ${row.booking_id}`,
    `₹${Number(row.final_amount).toLocaleString('en-IN')} payment recorded. Invoice is available in Booking History.`,
    now
  );

  const updated = db
    .prepare(
      `SELECT b.*, u.full_name as customer_name, u.phone as customer_phone
       FROM bookings b JOIN users u ON u.id = b.user_id WHERE b.id = ?`
    )
    .get(row.id);
  res.json({ message: 'Payment settled successfully.', booking: formatBooking(updated) });
});

// ==========================================
// NOTIFICATIONS & SUPPORT
// ==========================================
app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.auth!.userId) as any[];
  res.json({
    notifications: rows.map((n) => ({
      id: n.id,
      userId: n.user_id,
      bookingId: n.booking_id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
  });
});

app.post('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.auth!.userId
  );
  res.json({ ok: true });
});

app.post('/api/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.auth!.userId);
  res.json({ ok: true });
});

app.get('/api/support', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.auth!.userId) as any[];
  res.json({
    tickets: rows.map((t) => ({
      id: t.id,
      userId: t.user_id,
      customerId: t.customer_id,
      bookingId: t.booking_id,
      subject: t.subject,
      category: t.category,
      message: t.message,
      status: t.status,
      adminReply: t.admin_reply,
      createdAt: t.created_at,
    })),
  });
});

app.post('/api/support', requireAuth, (req: AuthenticatedRequest, res) => {
  const userRow = db.prepare('SELECT customer_id FROM users WHERE id = ?').get(req.auth!.userId) as any;
  const { subject, category, bookingId, message } = req.body || {};
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO support_tickets (id, user_id, customer_id, booking_id, subject, category, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?)
  `).run(
    id,
    req.auth!.userId,
    userRow?.customer_id || '',
    bookingId ? String(bookingId).trim() : null,
    String(subject).trim(),
    String(category || 'General Inquiry'),
    String(message).trim(),
    now
  );

  res.status(201).json({ message: 'Support request submitted. Our relocation desk will respond shortly.' });
});

// ==========================================
// ADMIN ENDPOINTS (RBAC PROTECTED)
// ==========================================
app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const stats = db
    .prepare(
      `SELECT
        COUNT(*) as totalBookings,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as activeBookings,
        SUM(CASE WHEN status = 'Upcoming' THEN 1 ELSE 0 END) as upcomingBookings,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedBookings,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
        SUM(CASE WHEN payment_status = 'Paid' THEN final_amount ELSE 0 END) as totalRevenue,
        SUM(CASE WHEN payment_status = 'Paid' AND is_sample = 0 THEN final_amount ELSE 0 END) as liveRevenue,
        SUM(CASE WHEN payment_status = 'Paid' AND is_sample = 1 THEN final_amount ELSE 0 END) as sampleRevenue
      FROM bookings`
    )
    .get() as any;

  const customerStats = db
    .prepare(
      `SELECT COUNT(*) as totalCustomers,
       SUM(CASE WHEN is_sample = 0 THEN 1 ELSE 0 END) as liveCustomers
       FROM users WHERE role = 'customer'`
    )
    .get() as any;

  const citiesServed = (
    db.prepare('SELECT COUNT(*) as c FROM service_cities WHERE is_active = 1').get() as any
  ).c;

  // Monthly revenue (real grouped from paid bookings)
  const paidBookings = db
    .prepare("SELECT final_amount, created_at, service_type, pickup_city FROM bookings WHERE payment_status = 'Paid'")
    .all() as any[];

  const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap: Record<string, number> = { Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
  for (const b of paidBookings) {
    const m = new Date(b.created_at).getMonth();
    const label = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] || 'Nov';
    if (monthlyMap[label] !== undefined) {
      monthlyMap[label] += Number(b.final_amount) || 0;
    }
  }

  // Weekly bookings by day of week from actual bookings
  const allBookings = db.prepare('SELECT created_at, service_type, pickup_city FROM bookings').all() as any[];
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyCounts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const serviceCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};

  for (const b of allBookings) {
    const d = new Date(b.created_at).getDay();
    const label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] || 'Mon';
    weeklyCounts[label] = (weeklyCounts[label] || 0) + 1;
    serviceCounts[b.service_type] = (serviceCounts[b.service_type] || 0) + 1;
    cityCounts[b.pickup_city] = (cityCounts[b.pickup_city] || 0) + 1;
  }

  res.json({
    kpis: {
      totalRevenue: stats?.totalRevenue || 0,
      liveRevenue: stats?.liveRevenue || 0,
      sampleRevenue: stats?.sampleRevenue || 0,
      totalBookings: stats?.totalBookings || 0,
      activeBookings: stats?.activeBookings || 0,
      upcomingBookings: stats?.upcomingBookings || 0,
      completedBookings: stats?.completedBookings || 0,
      cancelledBookings: stats?.cancelledBookings || 0,
      totalCustomers: customerStats?.totalCustomers || 0,
      liveCustomers: customerStats?.liveCustomers || 0,
      citiesServed,
    },
    charts: {
      monthlyRevenue: monthNames.map((label) => ({ label, value: monthlyMap[label] || 0 })),
      weeklyBookings: weekDays.map((label) => ({ label, value: weeklyCounts[label] || 0 })),
      popularServices: Object.entries(serviceCounts).map(([label, value]) => ({ label, value })),
      cityBookings: Object.entries(cityCounts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    },
  });
});

app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM users WHERE role = 'customer' ORDER BY created_at DESC")
    .all() as any[];
  res.json({ customers: rows.map(formatUser) });
});

app.get('/api/admin/bookings', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, u.full_name as customer_name, u.phone as customer_phone
       FROM bookings b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC`
    )
    .all();
  res.json({ bookings: rows.map(formatBooking) });
});

app.patch('/api/admin/bookings/:bookingId', requireAdmin, (req, res) => {
  const code = String(req.params.bookingId || '').trim().toUpperCase();
  const existing = db.prepare('SELECT * FROM bookings WHERE UPPER(booking_id) = ?').get(code) as any;
  if (!existing) return res.status(404).json({ error: 'Booking not found.' });

  const {
    trackingStage,
    assignedVehicle,
    driverName,
    driverPhone,
    estimatedArrival,
    lastUpdate,
    paymentStatus,
    finalAmount,
    status,
  } = req.body || {};

  const stage = trackingStage !== undefined ? Math.min(9, Math.max(1, Number(trackingStage))) : existing.tracking_stage;
  let nextStatus = status || existing.status;
  if (trackingStage !== undefined && !status && existing.status !== 'Cancelled') {
    if (stage === 1) nextStatus = 'Upcoming';
    else if (stage >= 2 && stage <= 8) nextStatus = 'Active';
    else if (stage === 9) nextStatus = 'Completed';
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE bookings SET
      tracking_stage = ?,
      status = ?,
      assigned_vehicle = ?,
      driver_name = ?,
      driver_phone = ?,
      estimated_arrival = ?,
      last_update = ?,
      payment_status = ?,
      final_amount = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    stage,
    nextStatus,
    assignedVehicle !== undefined ? assignedVehicle : existing.assigned_vehicle,
    driverName !== undefined ? driverName : existing.driver_name,
    driverPhone !== undefined ? driverPhone : existing.driver_phone,
    estimatedArrival !== undefined ? estimatedArrival : existing.estimated_arrival,
    lastUpdate !== undefined ? lastUpdate : existing.last_update,
    paymentStatus !== undefined ? paymentStatus : existing.payment_status,
    finalAmount !== undefined ? Number(finalAmount) : existing.final_amount,
    now,
    existing.id
  );

  // Notify customer
  const stageLabels = [
    'Booking Confirmed',
    'Vehicle Assigned',
    'Packing Started',
    'Loading Completed',
    'Vehicle Dispatched',
    'In Transit',
    'Reached Destination',
    'Unloading Completed',
    'Delivered Successfully',
  ];
  const notifType = stage === 2 ? 'vehicle' : stage === 3 || stage === 4 ? 'packing' : stage >= 5 && stage <= 7 ? 'transit' : 'delivery';
  db.prepare(`
    INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    crypto.randomUUID(),
    existing.user_id,
    existing.booking_id,
    `${existing.booking_id}: ${stageLabels[stage - 1] || nextStatus}`,
    lastUpdate || `Tracking milestone updated to ${stageLabels[stage - 1] || nextStatus}.`,
    notifType,
    now
  );

  const updated = db
    .prepare(
      `SELECT b.*, u.full_name as customer_name, u.phone as customer_phone
       FROM bookings b JOIN users u ON u.id = b.user_id WHERE b.id = ?`
    )
    .get(existing.id);

  res.json({ message: 'Booking updated successfully.', booking: formatBooking(updated) });
});

app.get('/api/admin/drivers', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM drivers ORDER BY name ASC').all() as any[];
  res.json({
    drivers: rows.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      vehicleNumber: d.vehicle_number,
      vehicleType: d.vehicle_type,
      capacityTons: d.capacity_tons,
      status: d.status,
    })),
  });
});

app.post('/api/admin/drivers', requireAdmin, (req, res) => {
  const { name, phone, vehicleNumber, vehicleType, capacityTons } = req.body || {};
  if (!name || !phone || !vehicleNumber || !vehicleType) {
    return res.status(400).json({ error: 'All driver and vehicle fields are required.' });
  }
  const id = crypto.randomUUID();
  try {
    db.prepare(`
      INSERT INTO drivers (id, name, phone, vehicle_number, vehicle_type, capacity_tons, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Available')
    `).run(id, String(name).trim(), String(phone).trim(), String(vehicleNumber).trim().toUpperCase(), String(vehicleType).trim(), Number(capacityTons) || 7.5);
    res.status(201).json({ message: 'Driver added to fleet.' });
  } catch {
    res.status(409).json({ error: 'Vehicle number already registered.' });
  }
});

app.delete('/api/admin/drivers/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM drivers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Driver removed.' });
});

app.put('/api/admin/pricing/:serviceType', requireAdmin, (req, res) => {
  const serviceType = decodeURIComponent(req.params.serviceType);
  const {
    baseCharge,
    perKmRate,
    perRoomCharge,
    perItemCharge,
    perBoxCharge,
    packingStandard,
    packingPremium,
    loadingCharge,
    unloadingCharge,
    carpenterCharge,
  } = req.body || {};

  const now = new Date().toISOString();
  const result = db
    .prepare(`
      UPDATE pricing_rules SET
        base_charge = ?, per_km_rate = ?, per_room_charge = ?, per_item_charge = ?,
        per_box_charge = ?, packing_standard = ?, packing_premium = ?,
        loading_charge = ?, unloading_charge = ?, carpenter_charge = ?, updated_at = ?
      WHERE service_type = ?
    `)
    .run(
      Number(baseCharge),
      Number(perKmRate),
      Number(perRoomCharge),
      Number(perItemCharge),
      Number(perBoxCharge),
      Number(packingStandard),
      Number(packingPremium),
      Number(loadingCharge),
      Number(unloadingCharge),
      Number(carpenterCharge),
      now,
      serviceType
    );

  if (result.changes === 0) return res.status(404).json({ error: 'Service pricing rule not found.' });
  res.json({ message: `Pricing rules updated for ${serviceType}.` });
});

app.put('/api/admin/cities/:id', requireAdmin, (req, res) => {
  const { pickupAvailable, destinationAvailable, isActive, fleetCount, hubAddress } = req.body || {};
  db.prepare(`
    UPDATE service_cities SET
      pickup_available = COALESCE(?, pickup_available),
      destination_available = COALESCE(?, destination_available),
      is_active = COALESCE(?, is_active),
      fleet_count = COALESCE(?, fleet_count),
      hub_address = COALESCE(?, hub_address)
    WHERE id = ?
  `).run(
    pickupAvailable !== undefined ? (pickupAvailable ? 1 : 0) : null,
    destinationAvailable !== undefined ? (destinationAvailable ? 1 : 0) : null,
    isActive !== undefined ? (isActive ? 1 : 0) : null,
    fleetCount !== undefined ? Number(fleetCount) : null,
    hubAddress !== undefined ? String(hubAddress) : null,
    req.params.id
  );
  res.json({ message: 'Service location updated.' });
});

app.get('/api/admin/tickets', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM support_tickets ORDER BY created_at DESC').all() as any[];
  res.json({
    tickets: rows.map((t) => ({
      id: t.id,
      userId: t.user_id,
      customerId: t.customer_id,
      bookingId: t.booking_id,
      subject: t.subject,
      category: t.category,
      message: t.message,
      status: t.status,
      adminReply: t.admin_reply,
      createdAt: t.created_at,
    })),
  });
});

app.patch('/api/admin/tickets/:id', requireAdmin, (req, res) => {
  const { status, adminReply } = req.body || {};
  db.prepare('UPDATE support_tickets SET status = ?, admin_reply = ? WHERE id = ?').run(
    status || 'Resolved',
    adminReply || '',
    req.params.id
  );
  res.json({ message: 'Support ticket updated.' });
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MOVENTRA Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
