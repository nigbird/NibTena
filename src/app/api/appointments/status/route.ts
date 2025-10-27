import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }
    
    // Find appointment by transaction ID
    const appointment = await prisma.appointment.findUnique({
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
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
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