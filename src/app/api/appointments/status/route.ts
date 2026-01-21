
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from '../../../../../auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Require authenticated session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { transactionId },
      select: {
        id: true,
        status: true,
        patientId: true,
        doctorId: true,
        hospitalId: true,
        appointmentDate: true,
        appointmentSlot: true,
        updatedAt: true
      }
    });

    if (!appointment) {
      // Not found yet — return pending-payment to keep existing behaviour
      return NextResponse.json({ status: 'pending-payment' }, { status: 200 });
    }

    const user: any = session.user;
    const userIdNum = Number(user.id);

    const isAdmin = user.isAdmin === true;
    const isHospitalScopedAdmin = user.role === 'hospital' && user.hospitalId && user.hospitalId === appointment.hospitalId;
    const isDoctor = user.role === 'doctor' && userIdNum === appointment.doctorId;
    const isPatient = userIdNum === appointment.patientId;

    if (!(isAdmin || isHospitalScopedAdmin || isDoctor || isPatient)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
