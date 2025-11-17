// app/api/sync/manual/route.ts
import { NextResponse } from 'next/server';
import { syncService } from '@/lib/db-sync/sync-service';

export async function POST() {
  try {
    const status = await syncService.getStatus();
    
    if (status.syncInProgress) {
      return NextResponse.json({ 
        success: false,
        message: 'Sync already in progress. Please wait.'
      }, { status: 409 });
    }

    // Trigger manual sync
    await (syncService as any).syncAllTables();

    return NextResponse.json({ 
      success: true, 
      message: 'Manual sync completed successfully'
    });
  } catch (error: any) {
    console.error('Failed to perform manual sync:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to perform manual sync',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

