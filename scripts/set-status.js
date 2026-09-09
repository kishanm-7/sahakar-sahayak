import './load-env.js';
import { updateGrievanceStatus, listGrievances, STATUSES } from '../lib/grievances.js';

// Move a grievance along, so the Track page has something to show during a
// demo. In a real deployment a cooperative officer would do this from a staff
// dashboard; that dashboard is out of scope here.
//
//   node scripts/set-status.js                                  (list them all)
//   node scripts/set-status.js GRV-XXXXXXXX in_review "Assigned to officer"

const [ref, status, ...noteParts] = process.argv.slice(2);

if (!ref) {
  const all = await listGrievances();
  if (!all.length) {
    console.log('\nNo grievances filed yet.\n');
  } else {
    console.log('');
    for (const g of all) {
      console.log(`  ${g.referenceId}  ${g.status.padEnd(10)}  ${g.category.padEnd(10)}  ${g.name}`);
    }
    console.log(`\nStatuses: ${STATUSES.join(', ')}\n`);
  }
  process.exit(0);
}

if (!STATUSES.includes(status)) {
  console.error(`\n  Status must be one of: ${STATUSES.join(', ')}\n`);
  process.exit(1);
}

const updated = await updateGrievanceStatus(ref.toUpperCase(), status, noteParts.join(' '));

if (!updated) {
  console.error(`\n  No grievance found with reference ${ref}\n`);
  process.exit(1);
}

console.log(`\n  ${updated.referenceId} is now "${updated.status}"\n`);
