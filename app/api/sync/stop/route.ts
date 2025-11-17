// app/api/sync/stop/route.ts
import { NextResponse } from 'next/server';
import { syncService } from '@/lib/db-sync/sync-service';

export async function POST() {
  try {
    syncService.stopPolling();

    return NextResponse.json({ 
      success: true, 
      message: 'Sync service stopped successfully' 
    });
  } catch (error: any) {
    console.error('Failed to stop sync service:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to stop sync service'
    }, { status: 500 });
  }
}

