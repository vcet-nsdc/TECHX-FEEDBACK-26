// Temporary verification script for the checkpoint-submission fix.
// Run against a dev server: node test-api.mjs  (BASE env to override target)
const BASE = process.env.BASE || 'http://localhost:3001';
let pass = 0;
let fail = 0;

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name} ${extra}`);
  }
}

async function req(method, path, body, cookie) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
}

const submission = (id) => ({
  tableId: 'c1-p1',
  rating: 4,
  studentEmail: 'audit@test.dev',
  studentName: 'Auditor',
  studentDepartment: 'CSE',
  comment: 'audit submission',
  submissionId: id,
});

// --- 1. Public labs endpoint (Critical fix #3) ---
const labs = await req('GET', '/api/labs');
check('GET /api/labs -> 200', labs.status === 200, `got ${labs.status}`);
check('labs has 3 sectors', labs.json?.labs && Object.keys(labs.json.labs).length === 3, JSON.stringify(Object.keys(labs.json?.labs || {})));
const lab1cps = labs.json?.labs?.['1']?.checkpoints?.length ?? 0;
check('sector 1 has 5 checkpoints', lab1cps === 5, `got ${lab1cps}`);

// --- 2. Admin endpoint still guarded by proxy ---
const adminNoAuth = await req('GET', '/api/admin/labs');
check('GET /api/admin/labs without cookie -> 401', adminNoAuth.status === 401, `got ${adminNoAuth.status}`);

// --- 3. Checkpoint submission accepted (was 400 before the fix) ---
const sub1 = await req('POST', '/api/feedback', submission('audit-sub-1'));
check('POST /api/feedback checkpoint id -> 201', sub1.status === 201, JSON.stringify(sub1.json));

// --- 4. Idempotent replay (same submissionId) ---
const sub2 = await req('POST', '/api/feedback', submission('audit-sub-1'));
check('replay same submissionId -> 201', sub2.status === 201, `got ${sub2.status}`);

// --- 5. Duplicate email+table, new submissionId -> 409 ---
const sub3 = await req('POST', '/api/feedback', submission('audit-sub-2'));
check('duplicate email+table, new submissionId -> 409', sub3.status === 409, `got ${sub3.status}`);

// --- 6. Unknown tableId -> 400 ---
const bad = await req('POST', '/api/feedback', { ...submission('audit-sub-3'), tableId: 'does-not-exist' });
check('unknown tableId -> 400', bad.status === 400, `got ${bad.status}`);

// --- 7. Invalid rating -> 400 ---
const badRating = await req('POST', '/api/feedback', { ...submission('audit-sub-4'), rating: 9 });
check('rating 9 -> 400', badRating.status === 400, `got ${badRating.status}`);

// --- 8. Legacy static product id still accepted ---
const legacy = await req('POST', '/api/feedback', {
  ...submission('audit-sub-5'),
  tableId: 'a1',
  studentEmail: 'audit-legacy@test.dev',
});
check('legacy product id a1 -> 201', legacy.status === 201, JSON.stringify(legacy.json));

// --- 9. Stats resolve checkpoint ids to readable names ---
const stats = await req('GET', '/api/product-stats');
const cpStat = (stats.json || []).find((s) => s.productId === 'c1-p1');
check(
  'product-stats resolves c1-p1 to a readable name',
  Boolean(cpStat) && cpStat.productName && cpStat.productName !== 'c1-p1',
  JSON.stringify(cpStat || null)
);

// --- 10. Admin login + guarded fetch with cookie (creds from env, as production would set) ---
const ADMIN_USER = process.env.TEST_ADMIN_USER || 'vcet-nsdc';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS || 'audit-test-pw';
const badLogin = await req('POST', '/api/admin/login', { username: 'nope', password: 'nope' });
check('admin login wrong creds -> 401', badLogin.status === 401, `got ${badLogin.status}`);
const login = await req('POST', '/api/admin/login', { username: ADMIN_USER, password: ADMIN_PASS });
const cookieMatch = (login.setCookie || '').match(/admin_session=([^;]+)/);
check('admin login -> 200 + session cookie', login.status === 200 && Boolean(cookieMatch), `got ${login.status}`);
const adminWithCookie = await req(
  'GET',
  '/api/admin/labs',
  undefined,
  cookieMatch ? `admin_session=${cookieMatch[1]}` : undefined
);
check('GET /api/admin/labs with cookie -> 200', adminWithCookie.status === 200, `got ${adminWithCookie.status}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
