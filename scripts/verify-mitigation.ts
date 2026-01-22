import { validateAppointmentUpdateLogic } from '../src/lib/validation-utils';

console.log('--- STARTING MITIGATION VERIFICATION ---');

// Mock data
const attacker = { id: 101, name: 'Attacker' };
const victim = { id: 202, name: 'Victim' };

const victimAppointment = {
  id: 'appt_victim_1',
  patientId: victim.id,
  status: 'confirmed'
};

const attackerAppointment = {
  id: 'appt_attacker_1',
  patientId: attacker.id,
  status: 'confirmed'
};

// Test 1: IDOR - Attacker tries to update Victim's appointment
console.log('\n[TEST 1] IDOR Verification: Attacker tries to cancel Victim\'s appointment...');
try {
  validateAppointmentUpdateLogic(victimAppointment, attacker, { status: 'cancelled' });
  console.error('❌ FAIL: IDOR vulnerability exists! Attacker was allowed to update victim appointment.');
} catch (error: any) {
  if (error.message.includes('Unauthorized')) {
    console.log('✅ PASS: IDOR prevented. Error:', error.message);
  } else {
    console.log('⚠️ UNEXPECTED ERROR:', error.message);
  }
}

// Test 2: Auth Bypass - Attacker tries to set status to 'completed'
console.log('\n[TEST 2] Auth Bypass Verification: Attacker tries to mark own appointment as "completed"...');
try {
  validateAppointmentUpdateLogic(attackerAppointment, attacker, { status: 'completed' });
  console.error('❌ FAIL: Auth Bypass vulnerability exists! Patient was allowed to complete appointment.');
} catch (error: any) {
  if (error.message.includes('Unauthorized status change')) {
    console.log('✅ PASS: Auth Bypass prevented. Error:', error.message);
  } else {
    console.log('⚠️ UNEXPECTED ERROR:', error.message);
  }
}

// Test 3: Valid Operation - Attacker cancels own appointment
console.log('\n[TEST 3] Valid Operation: Attacker cancels own appointment...');
try {
  const result = validateAppointmentUpdateLogic(attackerAppointment, attacker, { status: 'cancelled' });
  console.log('✅ PASS: Valid operation allowed. Result:', result);
} catch (error: any) {
  console.error('❌ FAIL: Valid operation blocked. Error:', error.message);
}

console.log('\n--- VERIFICATION COMPLETE ---');
