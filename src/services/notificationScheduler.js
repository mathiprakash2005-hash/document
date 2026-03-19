import { db, collection, query, where, getDocs, Timestamp } from '../config/firebase';
import { 
  notifyWithdrawalEnding, 
  notifyWithdrawalCompleted,
  notifyMedicationReminder,
  notifyTreatmentDue,
  notifyFollowupDue
} from './notificationService';

// Check withdrawal periods and send notifications
export const checkWithdrawalPeriods = async () => {
  try {
    const medicationsRef = collection(db, 'medications');
    const q = query(medicationsRef, where('status', 'in', ['active', 'withdrawal-period']));
    const snapshot = await getDocs(q);

    const now = new Date();

    snapshot.forEach(async (doc) => {
      const med = doc.data();
      const withdrawalEnd = med.withdrawalEndDate?.toDate();

      if (!withdrawalEnd) return;

      const daysLeft = Math.ceil((withdrawalEnd - now) / (1000 * 60 * 60 * 24));

      // Notify 2 days before withdrawal ends
      if (daysLeft === 2) {
        await notifyWithdrawalEnding(med.farmerId, med.animalId, daysLeft);
      }

      // Notify when withdrawal period is completed
      if (daysLeft <= 0 && med.status === 'withdrawal-period') {
        await notifyWithdrawalCompleted(med.farmerId, med.animalId);
      }
    });
  } catch (error) {
    console.error('Error checking withdrawal periods:', error);
  }
};

// Check medication reminders
export const checkMedicationReminders = async () => {
  try {
    const medicationsRef = collection(db, 'medications');
    const q = query(medicationsRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    const now = new Date();
    const today = now.toDateString();

    snapshot.forEach(async (doc) => {
      const med = doc.data();
      const endDate = med.endDate?.toDate();

      if (!endDate) return;

      // Check if medication is due today
      if (endDate.toDateString() === today) {
        await notifyTreatmentDue(med.farmerId, med.animalId, med.medicationName);
      }

      // Daily reminder for active medications
      const startDate = med.startDate?.toDate();
      if (startDate && now >= startDate && now <= endDate) {
        await notifyMedicationReminder(med.farmerId, med.animalId, med.medicationName);
      }
    });
  } catch (error) {
    console.error('Error checking medication reminders:', error);
  }
};

// Check follow-up appointments
export const checkFollowups = async () => {
  try {
    const healthRecordsRef = collection(db, 'healthRecords');
    const q = query(healthRecordsRef, where('status', '==', 'requires-attention'));
    const snapshot = await getDocs(q);

    const now = new Date();

    snapshot.forEach(async (doc) => {
      const record = doc.data();
      const checkupDate = record.checkupDate?.toDate();

      if (!checkupDate) return;

      // Notify doctor for follow-up after 7 days
      const daysSinceCheckup = Math.floor((now - checkupDate) / (1000 * 60 * 60 * 24));

      if (daysSinceCheckup === 7 && record.doctorId) {
        await notifyFollowupDue(record.doctorId, record.animalId);
      }
    });
  } catch (error) {
    console.error('Error checking follow-ups:', error);
  }
};

// Initialize scheduler (run every hour)
export const initializeNotificationScheduler = () => {
  // Run immediately
  checkWithdrawalPeriods();
  checkMedicationReminders();
  checkFollowups();

  // Run every hour
  setInterval(() => {
    checkWithdrawalPeriods();
    checkMedicationReminders();
    checkFollowups();
  }, 60 * 60 * 1000); // 1 hour
};
