/**
 * TEDxSreyas Institute — firebase-config.js
 * ─────────────────────────────────────────
 * Firebase initialisation + shared ticket-system business logic.
 * Replace the placeholder values below with your actual Firebase project credentials.
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════
//  ❶ FIREBASE CONFIGURATION — paste your project's firebaseConfig here
// ═══════════════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyByVc_5VdZz4jzIexcgQBUrqpCZWGDn1j8",
  authDomain: "tedxsreyas-1c936.firebaseapp.com",
  projectId: "tedxsreyas-1c936",
  storageBucket: "tedxsreyas-1c936.firebasestorage.app",
  messagingSenderId: "480734384253",
  appId: "1:480734384253:web:319c483a4267ff84e02114",
  measurementId: "G-BDR5M1DYE9"
};

// ═══════════════════════════════════════════════════════════════════
//  ❷ BREVO CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
const BREVO_CONFIG = {
  apiKey: "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",
  senderEmail: "tedxsreyasinstitute@gmail.com",
  senderName: "TEDxSreyas Institute"
};

// ═══════════════════════════════════════════════════════════════════
//  2.5 IMGBB CONFIGURATION — Free Image Hosting (Bypasses Firebase Storage)
//      Get your free API key at https://api.imgbb.com/
// ═══════════════════════════════════════════════════════════════════
const IMGBB_API_KEY = "48e1e2b510202964328a2e216aab0ed1";

// ═══════════════════════════════════════════════════════════════════
//  ❸ EVENT & PAYMENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
const EVENT_CONFIG = {
  name: "TEDx Sreyas Institute",
  date: "4 July 2026",
  venue: "Sreyas Institute of Engineering & Technology, Hyderabad",
  upiId: "mssreyasinstituteofengineeringandtechnology.eazypay@icici",
  upiName: "TEDx Sreyas Institute",
  reservationMinutes: 7                  // Minutes before a reservation expires
};

// ═══════════════════════════════════════════════════════════════════
//  ❹ TICKET SLABS — edit capacity and price as needed
//     Slabs activate automatically: when a slab's approved count
//     reaches capacity the next slab becomes the active one.
// ═══════════════════════════════════════════════════════════════════
const TICKET_SLABS = {
  S1: { id: "S1", name: "Slab 1 (Early Bird)", price: 299, capacity: 50, order: 1 },
  S2: { id: "S2", name: "Slab 2", price: 399, capacity: 100, order: 2 },
  S3: { id: "S3", name: "Slab 3", price: 399, capacity: 97, order: 3 }
};

// ═══════════════════════════════════════════════════════════════════
//  ❺ ADMIN PASSWORD (simple password protection for the admin panel)
//     For production security, switch to Firebase Authentication.
// ═══════════════════════════════════════════════════════════════════
const ADMIN_PASSWORD_HASH = "tedxadmin2026"; // Change this!

// ─────────────────────────────────────────────────────────────────
//  Firebase Initialisation
// ─────────────────────────────────────────────────────────────────
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const db = firebase.firestore();
const storage = firebase.storage();

// ─────────────────────────────────────────────────────────────────
//  Expose globals so all pages can use them without re-importing
// ─────────────────────────────────────────────────────────────────
window.TEDx = window.TEDx || {};
Object.assign(window.TEDx, {
  db,
  storage,
  EVENT_CONFIG,
  TICKET_SLABS,
  BREVO_CONFIG,
  ADMIN_PASSWORD_HASH
});

// ═══════════════════════════════════════════════════════════════════
//  BOT / CRAWLER DETECTION — skip expensive Firestore reads for bots
//  Saves tens of thousands of reads/day from Google, Bing, Facebook,
//  WhatsApp link preview, and other automated crawlers.
// ═══════════════════════════════════════════════════════════════════
const _IS_BOT = /bot|crawl|spider|slurp|facebookexternalhit|WhatsApp|Telegram|preview|Googlebot|bingbot|yandex|baidu|duckduck|sogou|exabot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|GPTBot|Claude|Applebot|LinkedInBot|Twitterbot|Discordbot/i.test(navigator.userAgent);
window.TEDx._isBot = _IS_BOT;
if (_IS_BOT) console.log('[TEDx] Bot detected — Firestore reads suppressed.');

// ═══════════════════════════════════════════════════════════════════
//  CORE TICKET SYSTEM FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// ── In-memory cache for slab info (avoids repeated expensive queries) ──
let _slabInfoCache = null;
let _slabInfoCacheTime = 0;
const SLAB_CACHE_TTL = 120000; // 2 minutes — reduces Firestore reads significantly

/**
 * LIGHTWEIGHT version: only reads slab documents (3 reads).
 * Trusts the activeCount field instead of re-counting all registrations.
 * Use this for public-facing pages (booking, index).
 */
window.TEDx.getActiveSlabInfo = async function () {
  // Bots don't need real-time ticket data — return sold-out to avoid Firestore reads
  if (_IS_BOT) return { slabId: null, slabData: null, remaining: 0, totalRemaining: 0, soldOut: true, isPaused: false };

  // Return cached result if fresh enough
  if (_slabInfoCache && (Date.now() - _slabInfoCacheTime) < SLAB_CACHE_TTL) {
    console.log('[TEDx] Using cached slab info');
    return _slabInfoCache;
  }

  let snapshot;
  try {
    snapshot = await db.collection('ticket_slabs').get({ source: 'server' });
  } catch (_netErr) {
    // Server unreachable (offline) — fall back to SDK cache
    snapshot = await db.collection('ticket_slabs').get();
  }

  if (snapshot.empty) {
    const result = { slabId: null, slabData: null, remaining: 0, totalRemaining: 0, soldOut: true };
    _slabInfoCache = result;
    _slabInfoCacheTime = Date.now();
    return result;
  }

  const slabs = snapshot.docs
    .map(d => {
      const dbData = d.data();
      const localData = TICKET_SLABS[d.id] || {};
      return { 
        id: d.id, 
        ...dbData,
        name: localData.name || dbData.name,
        price: localData.price || dbData.price,
        capacity: localData.capacity || dbData.capacity
      };
    })
    .sort((a, b) => a.order - b.order);

  let activeSlab = null;
  let totalRemaining = 0;
  let recentFilledMillis = null;

  for (const slab of slabs) {
    const liveCount = slab.activeCount || 0;
    const capacity = (TICKET_SLABS[slab.id] && TICKET_SLABS[slab.id].capacity) ? TICKET_SLABS[slab.id].capacity : slab.capacity;
    const remaining = capacity - liveCount;
    totalRemaining += Math.max(0, remaining);

    if (remaining <= 0) {
      if (slab.filledAt) {
        recentFilledMillis = (typeof slab.filledAt.toMillis === 'function') 
          ? slab.filledAt.toMillis() 
          : (slab.filledAt.seconds ? slab.filledAt.seconds * 1000 : slab.filledAt);
      }
    } else if (!activeSlab) {
      activeSlab = slab;
      activeSlab._liveCount = liveCount;
    }
  }

  let result;
  if (!activeSlab) {
    result = { slabId: null, slabData: null, remaining: 0, totalRemaining: 0, soldOut: true, isPaused: false };
  } else {
    let isPaused = false;
    let pauseExpiresAt = null;

    if (recentFilledMillis) {
      const pauseDuration = 10 * 60 * 1000;
      if (Date.now() < recentFilledMillis + pauseDuration) {
        isPaused = true;
        pauseExpiresAt = recentFilledMillis + pauseDuration;
      }
    }

    const activeCapacity = (TICKET_SLABS[activeSlab.id] && TICKET_SLABS[activeSlab.id].capacity) ? TICKET_SLABS[activeSlab.id].capacity : activeSlab.capacity;
    result = {
      slabId: activeSlab.id,
      slabData: activeSlab,
      remaining: activeCapacity - (activeSlab._liveCount || 0),
      totalRemaining,
      soldOut: false,
      isPaused: isPaused,
      pauseExpiresAt: pauseExpiresAt
    };
  }

  _slabInfoCache = result;
  _slabInfoCacheTime = Date.now();
  return result;
};

/**
 * FULL version: reads all active registrations to recount.
 * Use this ONLY from admin page for accurate healing.
 */
window.TEDx.getActiveSlabInfoFull = async function () {
  const snapshot = await db.collection('ticket_slabs').get();

  if (snapshot.empty) {
    return { slabId: null, slabData: null, remaining: 0, totalRemaining: 0, soldOut: true };
  }

  const slabs = snapshot.docs
    .map(d => {
      const dbData = d.data();
      const localData = TICKET_SLABS[d.id] || {};
      return { 
        id: d.id, 
        ...dbData,
        name: localData.name || dbData.name,
        price: localData.price || dbData.price,
        capacity: localData.capacity || dbData.capacity
      };
    })
    .sort((a, b) => a.order - b.order);

  const activeStatuses = ['reserved', 'pending_verification', 'approved'];
  const activeSnap = await db.collection('registrations')
    .where('status', 'in', activeStatuses)
    .get();

  const realActiveCount = {};
  activeSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.slabId) {
      realActiveCount[data.slabId] = (realActiveCount[data.slabId] || 0) + 1;
    }
  });

  let activeSlab = null;
  let totalRemaining = 0;

  for (const slab of slabs) {
    const liveCount = realActiveCount[slab.id] || 0;
    const capacity = (TICKET_SLABS[slab.id] && TICKET_SLABS[slab.id].capacity) ? TICKET_SLABS[slab.id].capacity : slab.capacity;
    const remaining = capacity - liveCount;
    totalRemaining += Math.max(0, remaining);

    if (slab.activeCount !== liveCount) {
      console.log(`[TEDx] Auto-healing slab ${slab.id} activeCount from ${slab.activeCount} to ${liveCount}`);
      try { db.collection('ticket_slabs').doc(slab.id).update({ activeCount: liveCount }); } catch(e){}
      slab.activeCount = liveCount;
    }

    if (!activeSlab && remaining > 0) {
      activeSlab = slab;
      activeSlab._liveCount = liveCount;
    }
  }

  if (!activeSlab) {
    return { slabId: null, slabData: null, remaining: 0, totalRemaining: 0, soldOut: true, isPaused: false };
  }

  const activeCapacity = (TICKET_SLABS[activeSlab.id] && TICKET_SLABS[activeSlab.id].capacity) ? TICKET_SLABS[activeSlab.id].capacity : activeSlab.capacity;
  return {
    slabId: activeSlab.id,
    slabData: activeSlab,
    remaining: activeCapacity - (activeSlab._liveCount || 0),
    totalRemaining,
    soldOut: false,
    isPaused: false
  };
};



/**
 * Clean up expired reservations and decrement slab counters accordingly.
 * Call this on page load to keep activeCount accurate.
 */
window.TEDx.cleanupExpiredReservations = async function () {
  if (_IS_BOT) return; // Bots don't need to clean up reservations
  try {
    const now = firebase.firestore.Timestamp.now();
    const snap = await db.collection('registrations')
      .where('status', '==', 'reserved')
      .get();

    if (snap.empty) return;

    // Use server-side reservedAt + configured minutes to determine expiry,
    // instead of client-set expiresAt which can be skewed by wrong clocks (Issue #7)
    const expiredDocs = snap.docs.filter(doc => {
      const data = doc.data();
      if (!data.reservedAt) return false;
      const reservedTime = data.reservedAt.toDate();
      const expiryTime = new Date(reservedTime.getTime() + EVENT_CONFIG.reservationMinutes * 60 * 1000);
      return expiryTime <= now.toDate();
    });

    if (expiredDocs.length === 0) return;

    // Use individual transactions to prevent double-decrement race conditions.
    // A batch could race with expireReservation() on the payment page. (Issue #4, #6)
    let cleanedCount = 0;
    for (const doc of expiredDocs) {
      try {
        await db.runTransaction(async (tx) => {
          const freshDoc = await tx.get(doc.ref);
          if (!freshDoc.exists || freshDoc.data().status !== 'reserved') return;
          tx.update(doc.ref, { status: 'expired', expiredAt: firebase.firestore.FieldValue.serverTimestamp() });
          const slabRef = db.collection('ticket_slabs').doc(freshDoc.data().slabId);
          tx.update(slabRef, { activeCount: firebase.firestore.FieldValue.increment(-1) });
          cleanedCount++;
        });
      } catch (e) { console.warn('[TEDx] Cleanup single-doc error:', e.message); }
    }
    console.log(`[TEDx] Cleaned up ${cleanedCount} expired reservation(s).`);
  } catch (err) {
    console.warn('[TEDx] Cleanup error (non-fatal):', err.message);
  }
};

/**
 * Check if an email or phone number is already registered (non-expired).
 * @param {string} email
 * @param {string} phone
 * @returns {Promise<{duplicate: boolean, field: string|null}>}
 */
window.TEDx.checkDuplicate = async function (email, phone) {
  if (_IS_BOT) return { duplicate: false, field: null }; // Bots can't submit forms
  const activeStatuses = ['reserved', 'pending_verification', 'approved'];

  const [emailSnap, phoneSnap] = await Promise.all([
    db.collection('registrations')
      .where('email', '==', email.toLowerCase().trim())
      .get(),
    db.collection('registrations')
      .where('phone', '==', phone.trim())
      .get()
  ]);

  const emailDup = emailSnap.docs.some(doc => activeStatuses.includes(doc.data().status));
  const phoneDup = phoneSnap.docs.some(doc => activeStatuses.includes(doc.data().status));

  if (emailDup) return { duplicate: true, field: 'email' };
  if (phoneDup) return { duplicate: true, field: 'phone' };
  return { duplicate: false, field: null };
};

/**
 * Atomically create a ticket reservation using a Firestore transaction.
 * Prevents two users from reserving the last ticket simultaneously.
 *
 * @param {Object} userData - { name, email, phone, college, branch, year }
 * @returns {Promise<{reservationId: string, slabId: string, amount: number, expiresAt: Date}>}
 */
window.TEDx.createReservation = async function (userData) {
  if (_IS_BOT) throw new Error('SOLD_OUT'); // Bots can't buy tickets
  // Skip cleanup here — it already ran on page load.
  // The transaction below is the real safeguard against over-booking.

  // Invalidate cache so we get fresh data for the reservation check
  _slabInfoCache = null;
  const slabInfo = await window.TEDx.getActiveSlabInfo();
  if (slabInfo.soldOut || slabInfo.remaining <= 0) {
    throw new Error('SOLD_OUT');
  }
  if (slabInfo.isPaused) {
    throw new Error('PAUSED_TEMPORARILY');
  }

  const slabId = slabInfo.slabId;
  const slabRef = db.collection('ticket_slabs').doc(slabId);
  const regRef = db.collection('registrations').doc();

  const expiresAt = new Date(Date.now() + EVENT_CONFIG.reservationMinutes * 60 * 1000);

  await db.runTransaction(async (transaction) => {
    const slabDoc = await transaction.get(slabRef);
    if (!slabDoc.exists) throw new Error('SLAB_NOT_FOUND');

    const { activeCount, filledAt } = slabDoc.data();
    const dbCapacity = slabDoc.data().capacity;
    const capacity = (TICKET_SLABS[slabId] && TICKET_SLABS[slabId].capacity) ? TICKET_SLABS[slabId].capacity : dbCapacity;
    if (activeCount >= capacity) throw new Error('SOLD_OUT');

    const updateData = {
      activeCount: firebase.firestore.FieldValue.increment(1)
    };
    if (activeCount + 1 >= capacity && !filledAt) {
      updateData.filledAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    transaction.update(slabRef, updateData);

    transaction.set(regRef, {
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      phone: userData.phone.trim(),
      slabId: slabId,
      slabName: slabInfo.slabData.name,
      amount: slabInfo.slabData.price,
      status: 'reserved',
      reservedAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
      utrNumber: null,
      screenshotUrl: null,
      uniqueId: null
    });
  });

  return {
    reservationId: regRef.id,
    slabId,
    slabName: slabInfo.slabData.name,
    amount: slabInfo.slabData.price,
    expiresAt,
    name: userData.name.trim(),
    email: userData.email.toLowerCase().trim()
  };
};

/**
 * Expire a single reservation and decrement the slab counter.
 * Called when the payment-page timer runs out.
 * @param {string} reservationId
 * @param {string} slabId
 */
window.TEDx.expireReservation = async function (reservationId, slabId) {
  // Use a transaction to prevent double-decrement if called multiple times
  // (e.g. timer + cleanup + visibilitychange all firing for the same reservation)
  await db.runTransaction(async (tx) => {
    const regRef = db.collection('registrations').doc(reservationId);
    const regDoc = await tx.get(regRef);
    // Only expire if still in 'reserved' status — prevents double-decrement
    if (!regDoc.exists || regDoc.data().status !== 'reserved') return;
    tx.update(regRef, {
      status: 'expired',
      expiredAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    tx.update(db.collection('ticket_slabs').doc(slabId), {
      activeCount: firebase.firestore.FieldValue.increment(-1)
    });
  });
};

/**
 * Submit payment details (UTR + screenshot) and move status to pending_verification.
 * @param {string} reservationId
 * @param {string} utrNumber
 * @param {File}   screenshotFile
 */
window.TEDx.submitPayment = async function (reservationId, utrNumber, screenshotFile) {
  // Check for duplicate UTR number before proceeding (Issue #10)
  const trimmedUtr = utrNumber.trim();
  const utrSnap = await db.collection('registrations')
    .where('utrNumber', '==', trimmedUtr)
    .get();
  const activeUtrDup = utrSnap.docs.some(doc => {
    const s = doc.data().status;
    return (s === 'pending_verification' || s === 'approved') && doc.id !== reservationId;
  });
  if (activeUtrDup) {
    throw new Error('DUPLICATE_UTR');
  }

  // Upload screenshot to ImgBB (Free Image API) instead of Firebase Storage
  const formData = new FormData();
  formData.append('image', screenshotFile);

  const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });

  const imgbbData = await imgbbRes.json();
  if (!imgbbData.success) {
    throw new Error('Image upload failed. Please try again.');
  }

  const screenshotUrl = imgbbData.data.url;

  // Update registration document
  await db.collection('registrations').doc(reservationId).update({
    utrNumber: utrNumber.trim(),
    screenshotUrl,
    status: 'pending_verification',
    submittedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return screenshotUrl;
};

window.TEDx.addOfflineRegistration = async function (userData) {
  const slabId = userData.slabId;
  const slabDoc = await db.collection('ticket_slabs').doc(slabId).get();
  const slabData = slabDoc.exists ? slabDoc.data() : { price: 0, name: 'Offline Slab' };
  const regRef = db.collection('registrations').doc();
  const counterRef = db.collection('counters').doc(slabId);
  let uniqueId;
  await db.runTransaction(async (tx) => {
    const counterDoc = await tx.get(counterRef);
    const currentSerial = counterDoc.exists ? counterDoc.data().nextSerial : 1;
    const serial = currentSerial;
    const paddedSerial = String(serial).padStart(3, '0');
    uniqueId = `TEDX-SIET-${slabId}-${paddedSerial}`;

    tx.set(counterRef, { nextSerial: serial + 1 }, { merge: true });
    tx.set(regRef, {
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      phone: userData.phone.trim(),
      slabId: slabId,
      slabName: slabData.name || slabId,
      amount: slabData.price || 0,
      status: 'approved',
      reservedAt: firebase.firestore.FieldValue.serverTimestamp(),
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      utrNumber: 'SPOT_BOOKING',
      screenshotUrl: null,
      uniqueId,
      serialNumber: serial
    });
    tx.update(db.collection('ticket_slabs').doc(slabId), {
      activeCount: firebase.firestore.FieldValue.increment(1),
      approvedCount: firebase.firestore.FieldValue.increment(1)
    });
  });
  return uniqueId;
};

/**
 * Admin: Approve a registration.
 * Generates a unique ID, updates Firestore, sends confirmation email.
 * @param {string} docId
 * @param {Object} regData - full registration object
 */
window.TEDx.approveRegistration = async function (docId, regData) {
  // Get next serial number for the slab (atomic)
  const counterRef = db.collection('counters').doc(regData.slabId);

  let uniqueId;
  await db.runTransaction(async (tx) => {
    const counterDoc = await tx.get(counterRef);
    const currentSerial = counterDoc.exists ? counterDoc.data().nextSerial : 1;
    const serial = currentSerial;
    const paddedSerial = String(serial).padStart(3, '0');
    uniqueId = `TEDX-SIET-${regData.slabId}-${paddedSerial}`;

    tx.set(counterRef, { nextSerial: serial + 1 }, { merge: true });
    tx.update(db.collection('registrations').doc(docId), {
      status: 'approved',
      uniqueId,
      serialNumber: serial,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Increment approvedCount on slab
    tx.update(db.collection('ticket_slabs').doc(regData.slabId), {
      approvedCount: firebase.firestore.FieldValue.increment(1)
    });
  });

  // Send confirmation email via Brevo
  try {
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #E62B1E; border-bottom: 2px solid #E62B1E; padding-bottom: 10px;">Ticket Confirmed!</h2>
        <p>Hi <strong>${regData.name}</strong>,</p>
        <p>Your payment of <strong>₹${regData.amount}</strong> for <strong>${regData.slabName}</strong> is successful.</p>
        <div style="background: #f8f9fa; border-left: 4px solid #E62B1E; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 1.1rem;">Your Unique Ticket ID is: <strong style="color: #E62B1E; font-size: 1.3rem;">${uniqueId}</strong></p>
        </div>
        <p><strong>Event Date:</strong> ${EVENT_CONFIG.date}</p>
        <p><strong>Venue:</strong> ${EVENT_CONFIG.venue}</p>
        <br>
        <p style="font-size: 0.9rem; color: #666;">Please show this email at the registration desk on the day of the event.</p>
        <p>Regards,<br><strong>TEDx Sreyas Institute Team</strong></p>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_CONFIG.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_CONFIG.senderName,
          email: BREVO_CONFIG.senderEmail
        },
        to: [
          {
            email: regData.email,
            name: regData.name
          }
        ],
        subject: 'Your TEDx Sreyas Institute Ticket is Confirmed!',
        htmlContent: emailHtml
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API Error: ${errorText}`);
    }
  } catch (emailErr) {
    console.warn('[TEDx] Email send failed (non-fatal):', emailErr.message);
    throw emailErr; // rethrow so admin UI shows the error
  }

  return uniqueId;
};

/**
 * Admin: Reject a registration and free up the ticket slot.
 * @param {string} docId
 * @param {string} slabId
 * @param {string} reason
 */
window.TEDx.rejectRegistration = async function (docId, slabId, reason = '') {
  // Fetch registration data for the rejection email before updating status
  const regDoc = await db.collection('registrations').doc(docId).get();
  const regData = regDoc.exists ? regDoc.data() : null;

  const batch = db.batch();
  batch.update(db.collection('registrations').doc(docId), {
    status: 'rejected',
    rejectReason: reason,
    rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.update(db.collection('ticket_slabs').doc(slabId), {
    activeCount: firebase.firestore.FieldValue.increment(-1),
    rejectedCount: firebase.firestore.FieldValue.increment(1)
  });
  await batch.commit();

  // Send rejection email notification so the user knows (Issue #12)
  if (regData && regData.email) {
    try {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h2 style="color: #E62B1E; border-bottom: 2px solid #E62B1E; padding-bottom: 10px;">Ticket Registration Update</h2>
          <p>Hi <strong>${regData.name}</strong>,</p>
          <p>Unfortunately, your payment for <strong>${regData.slabName}</strong> (₹${regData.amount}) could not be verified and your registration has been <strong style="color: #E62B1E;">rejected</strong>.</p>
          ${reason ? `<div style="background: #f8f9fa; border-left: 4px solid #E62B1E; padding: 15px; margin: 20px 0;"><p style="margin: 0;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
          <p>If you believe this is an error, please contact us at <a href="mailto:tedxsreyasinstitute@gmail.com">tedxsreyasinstitute@gmail.com</a> with your transaction details.</p>
          <p>You may also <a href="https://tedxsreyas.com/booking.html">register again</a> with a valid payment.</p>
          <br>
          <p style="font-size: 0.9rem; color: #666;">Regards,<br><strong>TEDx Sreyas Institute Team</strong></p>
        </div>
      `;

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_CONFIG.apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: BREVO_CONFIG.senderName, email: BREVO_CONFIG.senderEmail },
          to: [{ email: regData.email, name: regData.name }],
          subject: 'TEDx Sreyas Institute — Registration Update',
          htmlContent: emailHtml
        })
      });
    } catch (emailErr) {
      console.warn('[TEDx] Rejection email failed (non-fatal):', emailErr.message);
      // Don't rethrow — the rejection itself succeeded
    }
  }
};

/**
 * Admin: Delete a single registration completely and free up counts if applicable.
 * @param {string} docId
 * @param {string} slabId
 * @param {string} status
 */
window.TEDx.deleteRegistration = async function (docId, slabId, status) {
  const batch = db.batch();
  batch.delete(db.collection('registrations').doc(docId));

  if (slabId) {
    const slabRef = db.collection('ticket_slabs').doc(slabId);
    const updates = {};

    if (['reserved', 'pending_verification', 'approved'].includes(status)) {
      updates.activeCount = firebase.firestore.FieldValue.increment(-1);
    }

    if (status === 'approved') {
      updates.approvedCount = firebase.firestore.FieldValue.increment(-1);
    } else if (status === 'rejected') {
      updates.rejectedCount = firebase.firestore.FieldValue.increment(-1);
    }

    if (Object.keys(updates).length > 0) {
      batch.update(slabRef, updates);
    }
  }

  await batch.commit();
};



console.log('[TEDx] firebase-config.js loaded ✓');
