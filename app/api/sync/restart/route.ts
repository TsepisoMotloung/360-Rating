// app/api/sync/restart/route.ts
import { NextResponse } from 'next/server';
import { syncService } from '@/lib/db-sync/sync-service';

export async function POST() {
  try {
    // Stop current polling
    syncService.stopPolling();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reinitialize
    await syncService.initialize();

    const status = await syncService.getStatus();

    return NextResponse.json({ 
      success: true, 
      message: 'Sync service restarted successfully',
      status
    });
  } catch (error: any) {
    console.error('Failed to restart sync service:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to restart sync service'
    }, { status: 500 });
  }
}