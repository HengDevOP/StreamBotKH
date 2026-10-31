/**
 * StreamBotKH Database Module - 100% MongoDB Atlas
 * (SQLite has been completely removed in favor of MongoDB Atlas)
 */

import {
  cleanupExpiredPendingDonationsMongo,
  cleanupOlderDonationsMongo,
  purgeOldSystemIncidentsMongo,
  getMongoMonitoredGroups,
  addMongoMonitoredGroup,
  deleteMongoMonitoredGroup,
  clearMongoMonitoredGroups,
  initMongo
} from './mongo';

export const ADMIN_EMAILS = ['hchenheng@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export function initDatabase() {
  initMongo().catch(() => {});
}

export async function cleanupExpiredPendingDonations() {
  return cleanupExpiredPendingDonationsMongo();
}

export async function cleanupOlderDonations(months = 6) {
  return cleanupOlderDonationsMongo(months);
}

export async function purgeOldSystemIncidents(days = 30) {
  return purgeOldSystemIncidentsMongo(days);
}

export async function getMonitoredGroups(streamerId: string) {
  return getMongoMonitoredGroups(streamerId);
}

export async function addMonitoredGroup(streamerId: string, chatId: string, title: string, username?: string, customId?: string) {
  return addMongoMonitoredGroup(streamerId, chatId, title, username, customId);
}

export async function deleteMonitoredGroup(idOrChatId: string, streamerId: string) {
  return deleteMongoMonitoredGroup(idOrChatId, streamerId);
}

export async function clearMonitoredGroups(streamerId: string) {
  return clearMongoMonitoredGroups(streamerId);
}
