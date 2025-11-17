// app/api/sync/initialize/route.ts
import { NextResponse } from 'next/server';
import { syncService } from '@/lib/db-sync/sync-service';

let isInitialized = false;

export async function POST() {
  try {
    if (isInitialized) {
      const status = await syncService.getStatus();
      return NextResponse.json({ 
        success: true, 
        message: 'Sync service already running',
        status
      });
    }

    await syncService.initialize();
    isInitialized = true;

    const status = await syncService.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sync service initialized and started successfully',
      status
    });
  } catch (error: any) {
    console.error('Failed to initialize sync service:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to initialize sync service',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const status = await syncService.getStatus();
    return NextResponse.json({ 
      success: true,
      initialized: isInitialized,
      status
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

