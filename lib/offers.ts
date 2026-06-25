import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface Offer {
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  price: number;
  currency?: string;
  durationText?: string;
  validUntil?: Timestamp | string | null;
  badgeText?: string;
  includedItems?: string[];
  includedClasses?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const COLLECTION = 'offers';

export async function getActiveOffers(): Promise<Offer[]> {
  const q = query(
    collection(db, COLLECTION),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Offer))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function createOffer(data: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateOffer(id: string, data: Partial<Omit<Offer, 'id' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOffer(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
