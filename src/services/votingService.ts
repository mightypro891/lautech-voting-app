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
import { sendVoteNotification, sendSuspiciousActivityAlert, sendAdminActionNotification, sendBulkVoteNotification } from './emailService';

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

// Bot detection algorithms - Adjusted for student voting system
async function detectBotActivity(voterId: string, candidateId: string, additionalVotes: number = 1): Promise<{ isBot: boolean; reason?: string }> {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const fifteenMinutesAgo = now - (15 * 60 * 1000);

  try {
    // Check recent votes from this voter
    const recentVotesQuery = query(
      VOTES_COLLECTION,
      where('voterId', '==', voterId),
      where('timestamp', '>=', oneHourAgo)
    );
    const recentVotes = await getDocs(recentVotesQuery);

    // Check votes in last 15 minutes (more aggressive check)
    const veryRecentVotesQuery = query(
      VOTES_COLLECTION,
      where('voterId', '==', voterId),
      where('timestamp', '>=', fifteenMinutesAgo)
    );
    const veryRecentVotes = await getDocs(veryRecentVotesQuery);

    // Check total votes in last 24 hours (system-wide, not per voter)
    const dailyVotesQuery = query(
      VOTES_COLLECTION,
      where('timestamp', '>=', oneDayAgo)
    );
    const dailyVotes = await getDocs(dailyVotesQuery);

    // More lenient bot detection rules for student voting
    // Allow reasonable voting frequency for students who might change their minds

    // Check for extremely rapid automated voting (less than 0.5 seconds apart)
    const voteTimes = recentVotes.docs.map(doc => doc.data().timestamp).sort();
    let rapidVoteCount = 0;
    for (let i = 1; i < voteTimes.length; i++) {
      if (voteTimes[i] - voteTimes[i - 1] < 500) { // 0.5 seconds
        rapidVoteCount++;
        if (rapidVoteCount >= 3) { // Allow some rapid clicks but flag if too many
          return { isBot: true, reason: 'Automated rapid voting detected' };
        }
      }
    }

    // Check for excessive voting in short periods (adjusted for bulk voting)
    const effectiveRecentVotes = veryRecentVotes.size + additionalVotes;
    if (effectiveRecentVotes > 12) { // More than 12 votes in 15 minutes (allows bulk voting)
      return { isBot: true, reason: 'Excessive voting in short time period' };
    }

    if (recentVotes.size + additionalVotes > 30) { // More than 30 votes per hour (allows bulk voting)
      return { isBot: true, reason: 'Too many votes per hour' };
    }

    // System-wide daily limit (not per voter) - very high to allow mass voting
    if (dailyVotes.size > 1000) { // More than 1000 total votes in 24 hours
      return { isBot: true, reason: 'System under heavy automated attack' };
    }

    // Check voter record for suspicious patterns
    const voterRef = doc(VOTERS_COLLECTION, voterId);
    const voterSnap = await getDoc(voterRef);
    if (voterSnap.exists()) {
      const voter = voterSnap.data() as VoterRecord;
      const timeSinceLastVote = now - voter.lastVoteTime;

      // Allow very quick votes (students might click rapidly when deciding)
      if (timeSinceLastVote < 200) { // Less than 0.2 seconds
        return { isBot: true, reason: 'Extremely rapid voting detected' };
      }
    }

    return { isBot: false };
  } catch (error) {
    console.error('Bot detection error:', error);
    // Fail open to not block legitimate users
    return { isBot: false };
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
    // Send email alert
    await sendSuspiciousActivityAlert(botCheck.reason!, voterId);
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

    // Check cooldown - students can vote multiple times but must wait between votes
    if (voterSnap.exists()) {
      const voter = voterSnap.data() as VoterRecord;
      const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
      if (now - voter.lastVoteTime < cooldownMs) {
        throw new Error(`You can vote again in ${Math.ceil((cooldownMs - (now - voter.lastVoteTime)) / (60 * 60 * 1000))} hours.`);
      }
    }

    const candidateRef = doc(CANDIDATES_COLLECTION, candidateId);
    const candidateSnap = await tx.get(candidateRef);
    if (!candidateSnap.exists()) {
      throw new Error('Candidate not found.');
    }
    const candidate = candidateSnap.data() as Candidate;

    // Always increment the candidate's vote count (cumulative voting)
    tx.update(candidateRef, { votes: increment(1) });

    // Update voter record with last vote time
    tx.set(voterRef, { lastVoteTime: now }, { merge: true });

    // Log the vote
    const voteLogRef = doc(VOTES_COLLECTION);
    tx.set(voteLogRef, {
      voterId,
      candidateId,
      timestamp: now
    });

    // Log activity
    await logActivity('vote', `Vote cast for ${candidate.name}`, candidateId, candidate.name);

    // Send email notification (async, don't wait)
    sendVoteNotification(candidate.name, (candidate.votes || 0) + 1).catch(console.error);

    return { cooldownExpiresAt: now + settings.cooldownHours * 60 * 60 * 1000 };
  });
}

export async function voteForMultipleCandidates(positionVotes: Record<string, string>) {
  const voterId = getVoterId();
  const lastActionKey = 'lastVoteActionTime';
  const lastAction = Number(localStorage.getItem(lastActionKey) || 0);
  const now = Date.now();

  if (now - lastAction < 3000) {
    throw new Error('Please wait a few seconds before voting again.');
  }
  localStorage.setItem(lastActionKey, now.toString());

  // Bot detection check
  const totalVotes = Object.keys(positionVotes).length;
  const botCheck = await detectBotActivity(voterId, Object.values(positionVotes)[0], totalVotes);
  if (botCheck.isBot) {
    await logActivity('vote', `Suspicious bulk voting activity detected: ${botCheck.reason}`, undefined, `Bulk vote: ${totalVotes} positions`);
    await sendSuspiciousActivityAlert(botCheck.reason!, voterId);
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

    // Check cooldown - students can vote multiple times but must wait between votes
    if (voterSnap.exists()) {
      const voter = voterSnap.data() as VoterRecord;
      const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
      if (now - voter.lastVoteTime < cooldownMs) {
        throw new Error(`You can vote again in ${Math.ceil((cooldownMs - (now - voter.lastVoteTime)) / (60 * 60 * 1000))} hours.`);
      }
    }

    // Process all votes
    const votePromises = Object.entries(positionVotes).map(async ([position, candidateId]) => {
      const candidateRef = doc(CANDIDATES_COLLECTION, candidateId);
      const candidateSnap = await tx.get(candidateRef);
      if (!candidateSnap.exists()) {
        throw new Error(`Candidate not found for position: ${position}`);
      }
      const candidate = candidateSnap.data() as Candidate;

      // Increment the candidate's vote count (cumulative voting)
      tx.update(candidateRef, { votes: increment(1) });

      // Log the vote
      const voteLogRef = doc(VOTES_COLLECTION);
      tx.set(voteLogRef, {
        voterId,
        candidateId,
        position,
        timestamp: now
      });

      return candidate;
    });

    const candidates = await Promise.all(votePromises);

    // Update voter record with last vote time
    tx.set(voterRef, { lastVoteTime: now }, { merge: true });

    // Log activity
    await logActivity('vote', `Bulk vote cast for ${totalVotes} positions`, undefined, `Bulk vote: ${candidates.map(c => c.name).join(', ')}`);

    // Send email notification (async, don't wait)
    const positionSummary = Object.keys(positionVotes).join(', ');
    sendBulkVoteNotification(positionSummary, totalVotes).catch(console.error);

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
  // Send notification
  sendAdminActionNotification('Candidate Added', `New candidate "${data.name}" has been added to the system`).catch(console.error);
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
    // Send notification
    sendAdminActionNotification('Candidate Deleted', `Candidate "${data.name}" has been removed from the system`).catch(console.error);
  }
  await deleteDoc(candidateRef);
}

export async function saveSystemSettings(settings: SystemSettings) {
  await setDoc(SYSTEM_SETTINGS_DOC, settings, { merge: true });
  await logActivity('settings_changed', `System settings updated: voting ${settings.votingOpen ? 'opened' : 'closed'}, results ${settings.resultsVisible ? 'visible' : 'hidden'}`);
  // Send notification
  sendAdminActionNotification('Settings Updated', `Voting ${settings.votingOpen ? 'opened' : 'closed'}, results ${settings.resultsVisible ? 'made visible' : 'hidden'}`).catch(console.error);
}
