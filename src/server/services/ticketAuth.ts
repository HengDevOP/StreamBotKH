import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

export interface TicketCaller {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
}

export interface SupportAdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio: string;
  role: string;
  lastActiveAt?: string;
}

export function isUserAdminRecord(userRow: any, email?: string | null): boolean {
  if (isAdminEmail(email || userRow?.email)) return true;
  if (userRow?.isAdmin === true || userRow?.role === 'admin') return true;
  return false;
}

/**
 * Resolves the authenticated caller along with authoritative MongoDB profile and admin role.
 */
export async function getTicketCaller(req: NextRequest): Promise<TicketCaller | null> {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  let row: any = null;
  try {
    const usersCol = await getUsersCollection();
    row = await usersCol.findOne({ userId: authUser.id });
  } catch {
    // Non-fatal fallback to JWT claims
  }

  const email = String(row?.email || authUser.email || '').trim();
  return {
    id: row?.userId || authUser.id,
    email,
    username: row?.username || authUser.username || 'streamer',
    displayName: row?.displayName || authUser.username || 'Streamer',
    avatarUrl: row?.avatarUrl || '',
    isAdmin: isUserAdminRecord(row, email)
  };
}

/**
 * Loads all administrator accounts eligible to handle or receive transferred support tickets.
 */
export async function getSupportAdminDirectory(): Promise<SupportAdminUser[]> {
  try {
    const usersCol = await getUsersCollection();
    const candidates = await usersCol
      .find({
        $or: [
          { isAdmin: true },
          { role: 'admin' },
          { email: 'hchenheng@gmail.com' },
          { email: { $regex: /^hchenheng@gmail\.com$/i } }
        ]
      })
      .toArray();

    const seen = new Set<string>();
    const list: SupportAdminUser[] = [];

    for (const u of candidates as any[]) {
      const emailLower = String(u.email || '').trim().toLowerCase();
      const uid = String(u.userId || u.id || '');
      if (!uid && !emailLower) continue;
      if (!isUserAdminRecord(u, emailLower)) continue;
      const dedupeKey = uid || emailLower;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      list.push({
        id: uid,
        username: u.username || 'admin',
        displayName: u.displayName || u.username || 'Platform Admin',
        email: u.email || '',
        avatarUrl: u.avatarUrl || '',
        bio: u.bio || 'Platform Administrator & Live Support',
        role: 'Admin Support',
        lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : undefined
      });
    }

    return list;
  } catch {
    return [];
  }
}
