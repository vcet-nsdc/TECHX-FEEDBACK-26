import { NextResponse } from 'next/server';
import { saveFeedback, updateUserProgress, DuplicateFeedbackError } from '@/lib/services';
import { getProductById } from '@/lib/mock-data';
import { findCheckpoint } from '@/lib/lab-service';

function asString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// POST /api/feedback — submit one observation (feedback entry).
// Server-side validation: the table must exist, rating must be 1–5,
// timestamps are always generated server-side (client values ignored).
//
// tableId resolution order:
//   1. Admin-managed checkpoint ids from the labs catalog (active journal
//      flow, e.g. "c1-p1") — falls back to the static seed config while
//      MongoDB is unreachable.
//   2. Static product ids from mock-data (legacy /discover flow, e.g. "a1").
// In-memory sliding window rate limiter: protects against scripted floods or duplicate click bursts
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();

function isRateLimited(key: string, maxRequests = 15, windowMs = 10000): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= maxRequests) {
    return true;
  }

  bucket.count += 1;
  return false;
}

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = (forwarded ? forwarded.split(',')[0] : null) || request.headers.get('x-real-ip') || 'anonymous';
    if (isRateLimited(`ip:${clientIp}`, 20, 10000)) {
      return NextResponse.json(
        { message: 'Too many requests. Please explore at your own pace.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const tableId = asString(body?.tableId, 64);
    if (!tableId) {
      return NextResponse.json(
        { message: 'Unknown product id.' },
        { status: 400 }
      );
    }

    const checkpoint = await findCheckpoint(tableId);
    const staticProduct = checkpoint ? null : getProductById(tableId);
    if (!checkpoint && !staticProduct) {
      return NextResponse.json(
        { message: 'Unknown product id.' },
        { status: 400 }
      );
    }

    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be an integer between 1 and 5.' },
        { status: 400 }
      );
    }

    const studentEmail = asString(body?.studentEmail, 120);
    if (!studentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return NextResponse.json(
        { message: 'A valid student email is required.' },
        { status: 400 }
      );
    }

    if (isRateLimited(`email:${studentEmail}`, 10, 10000)) {
      return NextResponse.json(
        { message: 'Submission rate limit reached. Please wait a few moments before logging another discovery.' },
        { status: 429 }
      );
    }

    const submissionId = asString(body?.submissionId, 64) || undefined;

    const saved = await saveFeedback({
      submissionId,
      studentName: asString(body?.studentName, 80) || 'Anonymous Explorer',
      studentEmail,
      studentDepartment: asString(body?.studentDepartment, 80),
      labId: checkpoint ? checkpoint.canonicalLabId : staticProduct!.lab.labId,
      tableId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      comment: asString(body?.comment, 1000),
      timestamp: new Date().toISOString(),
    });

    await updateUserProgress(studentEmail, tableId, {
      name: saved.studentName,
      department: saved.studentDepartment,
    });

    return NextResponse.json(
      { message: 'Discovery logged successfully', id: saved._id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DuplicateFeedbackError) {
      return NextResponse.json(
        { message: 'You already logged a discovery for this product.' },
        { status: 409 }
      );
    }
    console.error('API Route Error:', error);
    return NextResponse.json(
      { message: 'Error submitting discovery.' },
      { status: 500 }
    );
  }
}
