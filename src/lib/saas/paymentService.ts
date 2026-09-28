import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { PaymentRecord, UserSubscription } from '../../types/saas';
import { calculateProExpiration } from './subscriptionService';

/**
 * Creates a new manual WhatsApp payment intent record
 */
export async function createPaymentRequest(
  userId: string,
  userEmail: string,
  plan: 'pro' | 'ultra',
  amountDH: number,
  proofReference?: string,
  whatsappSender?: string
): Promise<PaymentRecord> {
  const paymentId = 'pay_' + Math.random().toString(36).substring(2, 10);
  const paymentRef = doc(db, 'payments', paymentId);

  const newPayment: PaymentRecord = {
    id: paymentId,
    userId,
    userEmail,
    plan,
    amount: amountDH,
    currency: 'DH',
    status: 'pending',
    proofReference: proofReference || '',
    whatsappSender: whatsappSender || '',
    createdAt: new Date().toISOString(),
  };

  await setDoc(paymentRef, newPayment);
  return newPayment;
}

/**
 * Gets payment history for a user
 */
export async function getUserPayments(userId: string): Promise<PaymentRecord[]> {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as PaymentRecord);
}

/**
 * Admin action: Approve payment and automatically activate Pro or Ultra subscription!
 */
export async function approvePayment(
  paymentId: string,
  adminEmail: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const payRef = doc(db, 'payments', paymentId);
  const paySnap = await getDoc(payRef);

  if (!paySnap.exists()) {
    return { success: false, error: 'Payment record not found.' };
  }

  const payment = paySnap.data() as PaymentRecord;

  if (payment.status === 'approved') {
    return { success: false, error: 'Payment is already approved.' };
  }

  const now = new Date();
  const subRef = doc(db, 'subscriptions', payment.userId);

  let expiresAt: string | null = null;
  let isLifetime = false;

  if (payment.plan === 'pro') {
    expiresAt = calculateProExpiration(now).toISOString();
  } else if (payment.plan === 'ultra') {
    expiresAt = null;
    isLifetime = true;
  }

  const updatedSub: UserSubscription = {
    id: payment.userId,
    userId: payment.userId,
    plan: payment.plan,
    status: 'active',
    startedAt: now.toISOString(),
    expiresAt,
    lifetime: isLifetime,
    paymentId: payment.id,
    updatedAt: now.toISOString(),
  };

  await setDoc(subRef, updatedSub, { merge: true });

  await updateDoc(payRef, {
    status: 'approved',
    processedAt: now.toISOString(),
    processedBy: adminEmail,
    adminNote: note || 'Approved via WhatsApp verification.',
  });

  return { success: true };
}

/**
 * Admin action: Reject payment
 */
export async function rejectPayment(
  paymentId: string,
  adminEmail: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const payRef = doc(db, 'payments', paymentId);
  const paySnap = await getDoc(payRef);

  if (!paySnap.exists()) {
    return { success: false, error: 'Payment record not found.' };
  }

  await updateDoc(payRef, {
    status: 'rejected',
    processedAt: new Date().toISOString(),
    processedBy: adminEmail,
    adminNote: reason || 'Payment rejected by administrator.',
  });

  return { success: true };
}
