
export function validateAppointmentUpdateLogic(
  appointment: { patientId: number; status: string },
  patient: { id: number },
  data: { status?: string }
): { status?: string } {
  // 3. Verify ownership of the appointment
  if (appointment.patientId !== patient.id) {
    throw new Error('Unauthorized. You can only modify your own appointments.');
  }

  const dataToUpdate: any = {};
  const requestedStatus = data.status;

  // 4. Validate status transitions allowed for a patient
  if (requestedStatus) {
    const currentStatus = appointment.status;

    // Patients are explicitly forbidden from marking appointments as completed.
    if (requestedStatus === 'completed') {
      throw new Error('Unauthorized status change. Patients cannot mark appointments as completed.');
    } else if (requestedStatus === 'cancelled') {
      // Patient is allowed to cancel an upcoming appointment.
      if (currentStatus === 'confirmed' || currentStatus === 'rescheduled') {
        dataToUpdate.status = 'cancelled';
      } else {
        throw new Error(`Cannot cancel an appointment with status: ${currentStatus}.`);
      }
    } else if (requestedStatus === 'rescheduled') {
      // Patient is allowed to reschedule an upcoming appointment.
      if (currentStatus === 'confirmed' || currentStatus === 'rescheduled') {
        dataToUpdate.status = 'rescheduled';
      } else {
        throw new Error(`Cannot reschedule an appointment with status: ${currentStatus}.`);
      }
    } else if (requestedStatus !== currentStatus) {
      // No other status transitions are allowed for patients.
      throw new Error(`Invalid status transition from ${currentStatus} to ${requestedStatus}.`);
    }
  }
  return dataToUpdate;
}
