// app/api/sync/status/route.ts
import { NextResponse } from 'next/server';
import { syncService } from '@/lib/db-sync/sync-service';

export async function GET() {
  try {
    const status = await syncService.getStatus();

    return NextResponse.json({ 
      success: true, 
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to get sync status'
    }, { status: 500 });
  }
}