import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Candidate, SystemSettings, VoterRecord } from '../types';

const SYSTEM_SETTINGS_DOC = doc(db, 'settings', 'system');
const CANDIDATES_COLLECTION = collection(db, 'candidates');
const VOTERS_COLLECTION = collection(db, 'voters');
const VOTES_COLLECTION = collection(db, 'votes');
const ACTIVITIES_COLLECTION = collection(db, 'activities');

function simpleHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `voter-${Math.abs(hash)}`;
}

function getDeviceFingerprint() {
  const fingerprint = [navigator.userAgent, screen.width, screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
  return simpleHash(fingerprint);
}

async function logActivity(type: 'vote' | 'candidate_added' | 'candidate_deleted' | 'settings_changed', details: string, candidateId?: string, candidateName?: string) {
  await addDoc(ACTIVITIES_COLLECTION, {
    type,
    details,
    candidateId,
    candidateName,
    timestamp: serverTimestamp(),
  });
}

// Bot detection algorithms
async function detectBotActivity(voterId: string, candidateId: string): Promise<{ isBot: boolean; reason?: string }> {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  try {
    // Check recent votes from this voter
    const recentVotesQuery = query(
      VOTES_COLLECTION,
      where('voterId', '==', voterId),
      where('timestamp', '>=', oneHourAgo)
    );
    const recentVotes = await getDocs(recentVotesQuery);

    // Check total votes in last 24 hours
    const dailyVotesQuery = query(
      VOTES_COLLECTION,
      where('timestamp', '>=', oneDayAgo)
    );
    const dailyVotes = await getDocs(dailyVotesQuery);

    // Bot detection rules
    if (recentVotes.size > 10) {
      return { isBot: true, reason: 'Too many votes in one hour' };
    }

    if (dailyVotes.size > 50) {
      return { isBot: true, reason: 'Excessive daily voting activity' };
    }

    // Check for rapid clicking (votes within 1 second)
    const voteTimes = recentVotes.docs.map(doc => doc.data().timestamp).sort();
    for (let i = 1; i < voteTimes.length; i++) {
      if (voteTimes[i] - voteTimes[i - 1] < 1000) {
        return { isBot: true, reason: 'Rapid voting detected' };
      }
    }

    // Check voter record for suspicious patterns
    const voterRef = doc(VOTERS_COLLECTION, voterId);
    const voterSnap = await getDoc(voterRef);
    if (voterSnap.exists()) {
      const voter = voterSnap.data() as VoterRecord;
      const timeSinceLastVote = now - voter.lastVoteTime;

      if (timeSinceLastVote < 1000) {
        return { isBot: true, reason: 'Voting too quickly' };
      }
    }

    return { isBot: false };
  } catch (error) {
    console.error('Bot detection error:', error);
    return { isBot: false }; // Fail open to not block legitimate users
  }
}

export function getVoterId() {
  const storageKey = 'voterId';
  let voterId = localStorage.getItem(storageKey);
  if (!voterId) {
    voterId = getDeviceFingerprint();
    localStorage.setItem(storageKey, voterId);
  }
  return voterId;
}

export function parseCandidateDoc(docSnap: any): Candidate {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name ?? 'Unnamed',
    position: data.position ?? 'Unknown',
    manifesto: data.manifesto ?? '',
    imageUrl: data.imageUrl ?? '',
    imagePath: data.imagePath ?? '',
    votes: data.votes ?? 0,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

export async function fetchVoterRecord(voterId: string): Promise<VoterRecord | null> {
  const snap = await getDoc(doc(VOTERS_COLLECTION, voterId));
  if (!snap.exists()) return null;
  return snap.data() as VoterRecord;
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const snap = await getDoc(SYSTEM_SETTINGS_DOC);
  if (!snap.exists()) {
    return { votingOpen: true, resultsVisible: false, cooldownHours: 24 };
  }
  return snap.data() as SystemSettings;
}

export function subscribeCandidates(onUpdate: (items: Candidate[]) => void) {
  const q = query(CANDIDATES_COLLECTION, orderBy('position'), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(parseCandidateDoc);
    onUpdate(items);
  });
}

export function subscribeSettings(onUpdate: (settings: SystemSettings) => void) {
  return onSnapshot(SYSTEM_SETTINGS_DOC, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as SystemSettings);
    } else {
      onUpdate({ votingOpen: true, resultsVisible: false, cooldownHours: 24 });
    }
  });
}

export async function fetchActiveVoterCount(): Promise<number> {
  const snap = await getDocs(VOTERS_COLLECTION);
  return snap.size;
}

export async function fetchVotesTodayCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(VOTES_COLLECTION, where('timestamp', '>=', today.getTime()));
  const snap = await getDocs(q);
  return snap.size;
}

export async function fetchRecentVoteCounts(hours = 24): Promise<Record<string, number>> {
  const since = Date.now() - hours * 60 * 60 * 1000;
  const q = query(VOTES_COLLECTION, where('timestamp', '>=', since));
  const snap = await getDocs(q);
  return snap.docs.reduce<Record<string, number>>((acc, docSnap) => {
    const data = docSnap.data() as { candidateId: string };
    if (data.candidateId) {
      acc[data.candidateId] = (acc[data.candidateId] || 0) + 1;
    }
    return acc;
  }, {});
}

export async function voteForCandidate(candidateId: string) {
  const voterId = getVoterId();
  const lastActionKey = 'lastVoteActionTime';
  const lastAction = Number(localStorage.getItem(lastActionKey) || 0);
  const now = Date.now();
  if (now - lastAction < 3000) {
    throw new Error('Please wait a few seconds before voting again.');
  }
  localStorage.setItem(lastActionKey, now.toString());

  // Bot detection check
  const botCheck = await detectBotActivity(voterId, candidateId);
  if (botCheck.isBot) {
    // Log suspicious activity
    await logActivity('vote', `Suspicious voting activity detected: ${botCheck.reason}`, candidateId);
    throw new Error('Suspicious activity detected. Please try again later.');
  }

  return runTransaction(db, async (tx) => {
    const settingsSnap = await tx.get(SYSTEM_SETTINGS_DOC);
    const settings = settingsSnap.exists()
      ? (settingsSnap.data() as SystemSettings)
      : { votingOpen: true, resultsVisible: false, cooldownHours: 24 };

    if (!settings.votingOpen) {
      throw new Error('Voting is currently closed.');
    }

    const voterRef = doc(VOTERS_COLLECTION, voterId);
    const voterSnap = await tx.get(voterRef);
    if (voterSnap.exists()) {
      const voter = voterSnap.data() as VoterRecord;
      const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
      if (now - voter.lastVoteTime < cooldownMs) {
        throw new Error('You can vote again after 24 hours.');
      }
    }

    const candidateRef = doc(CANDIDATES_COLLECTION, candidateId);
    const candidateSnap = await tx.get(candidateRef);
    if (!candidateSnap.exists()) {
      throw new Error('Candidate not found.');
    }
    const candidate = candidateSnap.data() as Candidate;

    tx.update(candidateRef, { votes: increment(1) });
    tx.set(voterRef, { lastVoteTime: now, lastVotedCandidateId: candidateId }, { merge: true });
    const voteLogRef = doc(VOTES_COLLECTION);
    tx.set(voteLogRef, {
      voterId,
      candidateId,
      timestamp: now,
    });

    // Log activity
    await logActivity('vote', `Vote cast for ${candidate.name}`, candidateId, candidate.name);

    return { cooldownExpiresAt: now + settings.cooldownHours * 60 * 60 * 1000 };
  });
}

export async function uploadCandidateImage(candidateId: string, file: Blob, originalName: string) {
  const timestamp = Date.now();
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `candidates/${timestamp}-${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, storagePath }; 
}

export async function createCandidate(data: {
  name: string;
  position: string;
  manifesto?: string;
  imageUrl: string;
  imagePath?: string;
}) {
  const docRef = await addDoc(CANDIDATES_COLLECTION, {
    ...data,
    votes: 0,
    createdAt: serverTimestamp(),
  });
  await logActivity('candidate_added', `New candidate added: ${data.name}`, docRef.id, data.name);
  return docRef.id;
}

export async function updateCandidate(candidateId: string, payload: Partial<Omit<Candidate, 'id' | 'createdAt' | 'votes'>>) {
  const candidateRef = doc(CANDIDATES_COLLECTION, candidateId);
  await updateDoc(candidateRef, payload);
}

export async function deleteCandidate(candidateId: string) {
  const candidateRef = doc(CANDIDATES_COLLECTION, candidateId);
  const snap = await getDoc(candidateRef);
  if (snap.exists()) {
    const data = snap.data() as { imagePath?: string; name: string };
    if (data.imagePath) {
      await deleteObject(ref(storage, data.imagePath));
    }
    await logActivity('candidate_deleted', `Candidate removed: ${data.name}`, candidateId, data.name);
  }
  await deleteDoc(candidateRef);
}

export async function saveSystemSettings(settings: SystemSettings) {
  await setDoc(SYSTEM_SETTINGS_DOC, settings, { merge: true });
  await logActivity('settings_changed', `System settings updated: voting ${settings.votingOpen ? 'opened' : 'closed'}, results ${settings.resultsVisible ? 'visible' : 'hidden'}`);
}
