import fs from 'fs';
import path from 'path';

// Grievance records live in one JSON file, same reasoning as the vector store:
// no database to install, nothing to configure, works offline on a laptop.
const FILE = path.join(process.cwd(), 'data', 'grievances.json');

export const GRIEVANCE_CATEGORIES = [
  { value: 'scheme', label: 'Scheme query' },
  { value: 'pmfby', label: 'PMFBY / crop insurance' },
  { value: 'financial', label: 'Financial' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

export const STATUSES = ['submitted', 'in_review', 'forwarded', 'resolved', 'closed'];

function readAll() {
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    // A corrupt file should not take the whole demo down.
    return [];
  }
}

function writeAll(records) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(records, null, 2));
}

/**
 * Reference IDs look like GRV-M4K2P8QZ.
 *
 * Base 36 keeps a millisecond timestamp down to 8 characters, so it is short
 * enough to read out over a phone or write on paper -- which matters, because
 * the person filing may not have the SMS or the app to fall back on. It also
 * sorts chronologically, and a 4-character random suffix stops two people
 * filing in the same millisecond from colliding.
 */
export function generateReferenceId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GRV-${stamp}${rand}`;
}

export function createGrievance({ name, phone, category, description, language }) {
  const records = readAll();
  const now = new Date().toISOString();

  const record = {
    referenceId: generateReferenceId(),
    name: String(name).trim(),
    phone: String(phone).trim(),
    category,
    description: String(description).trim(),
    language: language || 'en',
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
    history: [{ status: 'submitted', at: now, note: 'Grievance received.' }],
  };

  records.push(record);
  writeAll(records);
  return record;
}

export function getGrievance(referenceId) {
  const id = String(referenceId || '').trim().toUpperCase();
  return readAll().find((r) => r.referenceId === id) || null;
}

/** Used by the demo status updater; a real deployment would wire this to staff. */
export function updateGrievanceStatus(referenceId, status, note = '') {
  const records = readAll();
  const record = records.find((r) => r.referenceId === referenceId);
  if (!record) return null;

  const now = new Date().toISOString();
  record.status = status;
  record.updatedAt = now;
  record.history.push({ status, at: now, note });

  writeAll(records);
  return record;
}

export function listGrievances() {
  return readAll();
}
