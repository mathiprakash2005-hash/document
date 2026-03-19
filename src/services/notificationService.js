import { db, collection, addDoc, query, where, getDocs, updateDoc, doc, onSnapshot, serverTimestamp, orderBy, limit } from '../config/firebase';

// Create notification
export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Get user notifications
export const getUserNotifications = async (userId) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Mark as read
export const markAsRead = async (notificationId) => {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
};

// Clear all notifications for a user
export const clearAllNotifications = async (userId) => {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { cleared: true })));
};

// Listen to notifications (excludes cleared)
export const listenToNotifications = (userId, callback) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(n => !n.cleared);
    callback(notifications);
  });
};

// FARMER NOTIFICATIONS
export const notifyPrescriptionApproved = async (farmerId, doctorName, animalId) => {
  await createNotification(
    farmerId,
    'prescription_approved',
    '✅ Prescription Approved',
    `Your prescription request has been approved by Dr. ${doctorName}`,
    { animalId, doctorName }
  );
};

export const notifyPrescriptionRejected = async (farmerId, reason, animalId) => {
  await createNotification(
    farmerId,
    'prescription_rejected',
    '❌ Prescription Rejected',
    `Your prescription was rejected. Reason: ${reason}`,
    { animalId, reason }
  );
};

export const notifyNewPrescription = async (farmerId, animalId) => {
  await createNotification(
    farmerId,
    'prescription_added',
    '📝 New Prescription Added',
    `New prescription added for Animal ${animalId}`,
    { animalId }
  );
};

export const notifyWithdrawalEnding = async (farmerId, animalId, daysLeft) => {
  await createNotification(
    farmerId,
    'withdrawal_ending',
    '⏰ Withdrawal Period Ending Soon',
    `Withdrawal period ending in ${daysLeft} days for Animal ${animalId}`,
    { animalId, daysLeft }
  );
};

export const notifyWithdrawalCompleted = async (farmerId, animalId) => {
  await createNotification(
    farmerId,
    'withdrawal_completed',
    '✅ Withdrawal Period Completed',
    `Withdrawal period completed! Animal ${animalId} is safe for sale`,
    { animalId }
  );
};

export const notifyWithdrawalActive = async (farmerId, animalId) => {
  await createNotification(
    farmerId,
    'withdrawal_active',
    '⚠️ Withdrawal Period Active',
    `Animal ${animalId} is still in withdrawal period – cannot sell yet`,
    { animalId }
  );
};

export const notifyMedicationReminder = async (farmerId, animalId, medication) => {
  await createNotification(
    farmerId,
    'medication_reminder',
    '💊 Medication Reminder',
    `Time to give medication for Animal ${animalId}`,
    { animalId, medication }
  );
};

export const notifyTreatmentDue = async (farmerId, animalId, medication) => {
  await createNotification(
    farmerId,
    'treatment_due',
    '📅 Treatment Due Today',
    `${medication} is due today for Animal ${animalId}`,
    { animalId, medication }
  );
};

export const notifyTreatmentCompleted = async (farmerId, animalId) => {
  await createNotification(
    farmerId,
    'treatment_completed',
    '✅ Treatment Completed',
    `Treatment completed for Animal ${animalId}`,
    { animalId }
  );
};

export const notifyDoctorResponded = async (farmerId, doctorName) => {
  await createNotification(
    farmerId,
    'doctor_responded',
    '👨‍⚕️ Doctor Responded',
    `Doctor has responded to your consultation request`,
    { doctorName }
  );
};

export const notifyConsultationScheduled = async (farmerId, doctorName, date) => {
  await createNotification(
    farmerId,
    'consultation_scheduled',
    '📞 Consultation Scheduled',
    `Consultation scheduled with Dr. ${doctorName}`,
    { doctorName, date }
  );
};

export const notifyConsultationCompleted = async (farmerId) => {
  await createNotification(
    farmerId,
    'consultation_completed',
    '✅ Consultation Completed',
    `Consultation completed – check prescription`,
    {}
  );
};

export const notifyAnimalSold = async (farmerId, animalId, buyerName) => {
  await createNotification(
    farmerId,
    'animal_sold',
    '💰 Animal Sold',
    `Your animal ${animalId} has been purchased by ${buyerName}`,
    { animalId, buyerName }
  );
};

export const notifyPaymentReceived = async (farmerId, animalId, amount) => {
  await createNotification(
    farmerId,
    'payment_received',
    '📦 Payment Received',
    `Payment received for Animal ${animalId}`,
    { animalId, amount }
  );
};

// DOCTOR NOTIFICATIONS
export const notifyNewConsultationRequest = async (doctorId, farmerName, animalId) => {
  await createNotification(
    doctorId,
    'consultation_request',
    '🔔 New Consultation Request',
    `New consultation request from Farmer ${farmerName}`,
    { farmerName, animalId }
  );
};

export const notifyUrgentCase = async (doctorId, animalId) => {
  await createNotification(
    doctorId,
    'urgent_case',
    '🚨 Urgent Case',
    `Urgent: Animal health issue reported`,
    { animalId }
  );
};

export const notifyPendingConsultations = async (doctorId, count) => {
  await createNotification(
    doctorId,
    'pending_consultations',
    '📊 Pending Consultations',
    `${count} consultation requests pending`,
    { count }
  );
};

export const notifyPrescriptionPending = async (doctorId, animalId) => {
  await createNotification(
    doctorId,
    'prescription_pending',
    '⏰ Prescription Pending',
    `Prescription pending for Animal ${animalId}`,
    { animalId }
  );
};

export const notifyBulkPrescriptions = async (doctorId, count) => {
  await createNotification(
    doctorId,
    'bulk_prescriptions',
    '📋 Prescriptions Awaiting Review',
    `${count} prescriptions awaiting review`,
    { count }
  );
};

export const notifyFollowupDue = async (doctorId, animalId) => {
  await createNotification(
    doctorId,
    'followup_due',
    '🩺 Follow-up Due',
    `Follow-up checkup due for Animal ${animalId}`,
    { animalId }
  );
};

export const notifyTreatmentEnding = async (doctorId, animalId) => {
  await createNotification(
    doctorId,
    'treatment_ending',
    '📅 Treatment Ending',
    `Treatment completion approaching for Animal ${animalId}`,
    { animalId }
  );
};

// BUYER NOTIFICATIONS
export const notifyNewAnimalsAvailable = async (buyerId) => {
  await createNotification(
    buyerId,
    'new_animals',
    '🐔 New Animals Available',
    `New healthy animals available for purchase`,
    {}
  );
};

export const notifyWithdrawalFree = async (buyerId, animalId) => {
  await createNotification(
    buyerId,
    'withdrawal_free',
    '✅ Withdrawal-Free Animal',
    `Animal ${animalId} is now withdrawal-free`,
    { animalId }
  );
};

export const notifyCertifiedAnimals = async (buyerId) => {
  await createNotification(
    buyerId,
    'certified_animals',
    '💚 Certified Animals Available',
    `Certified healthy animals added to marketplace`,
    {}
  );
};

export const notifyPurchaseConfirmed = async (buyerId, animalId, amount) => {
  await createNotification(
    buyerId,
    'purchase_confirmed',
    '✅ Purchase Confirmed',
    `Purchase confirmed! Animal ${animalId} – ₹${amount}`,
    { animalId, amount }
  );
};

export const notifyOrderReady = async (buyerId, animalId) => {
  await createNotification(
    buyerId,
    'order_ready',
    '📦 Order Ready',
    `Your order is ready for pickup/delivery`,
    { animalId }
  );
};

export const notifyCertificateGenerated = async (buyerId, animalId) => {
  await createNotification(
    buyerId,
    'certificate_generated',
    '📄 Certificate Generated',
    `Health certificate generated for your purchase`,
    { animalId }
  );
};

export const notifyHealthVerificationComplete = async (buyerId, animalId) => {
  await createNotification(
    buyerId,
    'verification_complete',
    '✅ Verification Complete',
    `Animal ${animalId} health verification complete`,
    { animalId }
  );
};

export const notifyCertificateReady = async (buyerId, animalId) => {
  await createNotification(
    buyerId,
    'certificate_ready',
    '📄 Certificate Ready',
    `Certificate available for download`,
    { animalId }
  );
};
