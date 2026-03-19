import { db, collection, addDoc, serverTimestamp } from '../config/firebase';

// Notify farmer when certificate is generated
export const notifyCertificateGeneratedForFarmer = async (farmerId, animalId) => {
  await addDoc(collection(db, 'notifications'), {
    userId: farmerId,
    type: 'certificate_generated',
    title: '📄 Certificate Generated',
    message: `Health certificate generated for Animal ${animalId}`,
    data: { animalId },
    read: false,
    createdAt: serverTimestamp()
  });
};

// Notify buyer when certificate is ready
export const notifyCertificateReadyForBuyer = async (buyerId, animalId) => {
  await addDoc(collection(db, 'notifications'), {
    userId: buyerId,
    type: 'certificate_ready',
    title: '📄 Certificate Ready',
    message: `Certificate available for download`,
    data: { animalId },
    read: false,
    createdAt: serverTimestamp()
  });
};
