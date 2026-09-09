import { supabase } from './supabaseClient.js';

export const GRIEVANCE_CATEGORIES = [
  { value: 'scheme', label: 'Scheme query' },
  { value: 'pmfby', label: 'PMFBY / crop insurance' },
  { value: 'financial', label: 'Financial' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

export const STATUSES = ['submitted', 'in_review', 'forwarded', 'resolved', 'closed'];

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

function formatGrievance(row) {
  if (!row) return null;
  return {
    id: row.id,
    referenceId: row.reference_id,
    name: row.name,
    phone: row.phone,
    category: row.category,
    description: row.description,
    language: row.language,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history: row.history || [],
  };
}

export async function createGrievance({ name, phone, category, description, language }) {
  const now = new Date().toISOString();
  const referenceId = generateReferenceId();

  const initialHistory = [{ status: 'submitted', at: now, note: 'Grievance received.' }];

  const { data, error } = await supabase
    .from('grievances')
    .insert({
      reference_id: referenceId,
      name: String(name).trim(),
      phone: String(phone).trim(),
      category,
      description: String(description).trim(),
      language: language || 'en',
      status: 'submitted',
      created_at: now,
      updated_at: now,
      history: initialHistory,
    })
    .select()
    .single();

  if (error) {
    console.error('[createGrievance Supabase Error]', error);
    throw new Error(`Failed to create grievance: ${error.message}`);
  }

  return formatGrievance(data);
}

export async function getGrievance(referenceId) {
  const id = String(referenceId || '').trim().toUpperCase();
  if (!id) return null;

  const { data, error } = await supabase
    .from('grievances')
    .select('*')
    .eq('reference_id', id)
    .maybeSingle();

  if (error) {
    console.error('[getGrievance Supabase Error]', error);
    return null;
  }

  return formatGrievance(data);
}

/** Used by the demo status updater; a real deployment would wire this to staff. */
export async function updateGrievanceStatus(referenceId, status, note = '') {
  const id = String(referenceId || '').trim().toUpperCase();
  const existing = await getGrievance(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedHistory = [...(existing.history || []), { status, at: now, note }];

  const { data, error } = await supabase
    .from('grievances')
    .update({
      status,
      updated_at: now,
      history: updatedHistory,
    })
    .eq('reference_id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateGrievanceStatus Supabase Error]', error);
    return null;
  }

  return formatGrievance(data);
}

export async function listGrievances() {
  const { data, error } = await supabase
    .from('grievances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listGrievances Supabase Error]', error);
    return [];
  }

  return (data || []).map(formatGrievance);
}
