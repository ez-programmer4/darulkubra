import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { wpos_wpdatatable_23Wdt_ID } = await request.json();
    
    // Update US student record to mark as registered
    // This would connect to your US student database
    // For now, return success
    
    return NextResponse.json({ 
      success: true, 
      message: 'US student registration status updated' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update US student record' },
      { status: 500 }
    );
  }
}