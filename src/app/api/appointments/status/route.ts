
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }
    
    const appointment = await prisma.appointment.findFirst({
      where: { transactionId },
      select: {
        id: true,
        status: true,
        patientId: true,
        doctorId: true,
        appointmentDate: true,
        appointmentSlot: true,
        updatedAt: true
      }
    });
    
    if (!appointment) {
      // It's not an error if not found yet, just means payment isn't confirmed.
      // Return a specific status to indicate it's still pending.
      return NextResponse.json({ status: 'pending-payment' }, { status: 200 });
    }
    
    return NextResponse.json({
      id: appointment.id,
      status: appointment.status,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      appointmentSlot: appointment.appointmentSlot,
      updatedAt: appointment.updatedAt
    });
    
  } catch (error) {
    console.error('Error checking appointment status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
