import { NextResponse } from 'next/server';
import {
  createGrievance,
  getGrievance,
  GRIEVANCE_CATEGORIES,
} from '@/lib/grievances';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = GRIEVANCE_CATEGORIES.map((c) => c.value);

// POST /api/grievance
// Body: { name, phone, category, description, language? }
// Returns: { referenceId, status }
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, category, description, language } = body || {};

    const missing = [];
    if (!name || !String(name).trim()) missing.push('name');
    if (!phone || !String(phone).trim()) missing.push('phone');
    if (!description || !String(description).trim()) missing.push('description');

    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required field(s): ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const record = await createGrievance({ name, phone, category, description, language });

    return NextResponse.json({
      referenceId: record.referenceId,
      status: record.status,
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error('[/api/grievance POST]', err);
    return NextResponse.json(
      { error: err.message || 'Could not file the grievance.' },
      { status: 500 }
    );
  }
}

// GET /api/grievance?ref=GRV-XXXXXXXX  --  "track my grievance"
export async function GET(request) {
  try {
    const ref = request.nextUrl.searchParams.get('ref');

    if (!ref) {
      return NextResponse.json(
        { error: 'Add a reference ID, e.g. /api/grievance?ref=GRV-XXXXXXXX' },
        { status: 400 }
      );
    }

    const record = await getGrievance(ref);

    if (!record) {
      return NextResponse.json(
        { error: 'No grievance found with that reference ID. Please check it and try again.' },
        { status: 404 }
      );
    }

    // Deliberately not returning the phone number: anyone who guesses a
    // reference ID could otherwise read a citizen's contact details.
    return NextResponse.json({
      referenceId: record.referenceId,
      name: record.name,
      category: record.category,
      description: record.description,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      history: record.history,
    });
  } catch (err) {
    console.error('[/api/grievance GET]', err);
    return NextResponse.json(
      { error: err.message || 'Could not look up that grievance.' },
      { status: 500 }
    );
  }
}
