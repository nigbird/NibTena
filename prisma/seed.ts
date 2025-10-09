
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`)

  const hospitalsData = [
    { id: 1, name: 'Tikur Anbessa Specialized Hospital', city: 'Addis Ababa', imageId: 'hospital-1', description: 'Ethiopia\'s largest and oldest public hospital, providing a wide range of specialized medical services and serving as a major teaching institution.', contactEmail: 'info@tah.gov.et', contactPhone: '+251 11 551 1211', accountNumber: '1000012345678', status: 'active' },
    { id: 2, name: 'St. Paul’s Millennium Medical College', city: 'Addis Ababa', imageId: 'hospital-2', description: 'A prominent medical school and hospital known for its comprehensive healthcare services and contributions to medical education and research.', contactEmail: 'contact@spmmc.edu.et', contactPhone: '+251 11 275 0125', accountNumber: '1000023456789', status: 'active' },
    { id: 3, name: 'Hawassa Referral Hospital', city: 'Hawassa', imageId: 'hospital-3', description: 'A key regional hospital in Hawassa providing advanced medical care and referral services for the surrounding areas.', contactEmail: 'support@hrh.gov.et', contactPhone: '+251 46 220 5454', accountNumber: '1000034567890', status: 'inactive' },
  ];

  for (const h of hospitalsData) {
    const hospital = await prisma.hospital.upsert({
      where: { id: h.id },
      update: {},
      create: h,
    })
    console.log(`Created hospital with id: ${hospital.id}`)
  }

  const doctorsData = [
    { id: 1, name: 'Dr. Mulugeta Tesfaye', specialty: 'Cardiology', imageId: 'doctor-1', bio: 'Dr. Mulugeta is a senior cardiologist with over 15 years of experience treating heart and vascular conditions.', consultationFee: 150, rating: 4.9, status: 'active', experience: 15 },
    { id: 2, name: 'Dr. Selamawit Bekele', specialty: 'Dermatology', imageId: 'doctor-2', bio: 'Dr. Selamawit specializes in both cosmetic and clinical dermatology, focusing on holistic skin care.', consultationFee: 120, rating: 4.8, status: 'active', experience: 10 },
    { id: 3, name: 'Dr. Tewodros Mekonnen', specialty: 'Neurology', imageId: 'doctor-3', bio: 'Dr. Tewodros is a neurologist focusing on brain and spinal disorders, epilepsy, and stroke recovery.', consultationFee: 200, rating: 4.9, status: 'active', experience: 12 },
    { id: 4, name: 'Dr. Meron Alemu', specialty: 'Pediatrics', imageId: 'doctor-4', bio: 'Dr. Meron provides compassionate pediatric care for children from infancy through adolescence.', consultationFee: 100, rating: 4.7, status: 'active', experience: 8 },
    { id: 5, name: 'Dr. Yoseph Hailemariam', specialty: 'Orthopedics', imageId: 'doctor-5', bio: 'Dr. Yoseph specializes in sports medicine and joint replacement, helping patients recover mobility.', consultationFee: 180, rating: 4.8, status: 'active', experience: 9 },
    { id: 6, name: 'Dr. Rahel Tadesse', specialty: 'Dentistry', imageId: 'doctor-6', bio: 'Dr. Rahel offers a full range of dental care — from preventive cleanings to restorative and cosmetic procedures.', consultationFee: 90, rating: 4.9, status: 'active', experience: 7 },
    { id: 7, name: 'Dr. Dawit Abebe', specialty: 'Cardiology', imageId: 'doctor-7', bio: 'Dr. Dawit focuses on preventive cardiology and lifestyle-based treatment approaches for heart health.', consultationFee: 160, rating: 4.8, status: 'active', experience: 5 },
  ];

  const doctorsToHospitals = [
    { doctorId: 1, hospitalId: 1 },
    { doctorId: 1, hospitalId: 2 },
    { doctorId: 2, hospitalId: 1 },
    { doctorId: 3, hospitalId: 2 },
    { doctorId: 4, hospitalId: 2 },
    { doctorId: 5, hospitalId: 3 },
    { doctorId: 6, hospitalId: 3 },
    { doctorId: 7, hospitalId: 1 },
  ];

  for (const d of doctorsData) {
    const doctor = await prisma.doctor.upsert({
      where: { id: d.id },
      update: {},
      create: d,
    })
    console.log(`Created doctor with id: ${doctor.id}`)
  }

  for (const rel of doctorsToHospitals) {
    await prisma.doctorsOnHospitals.upsert({
        where: {
            doctorId_hospitalId: {
                doctorId: rel.doctorId,
                hospitalId: rel.hospitalId
            }
        },
        update: {},
        create: {
            doctorId: rel.doctorId,
            hospitalId: rel.hospitalId
        }
    });
    console.log(`Linked doctor ${rel.doctorId} to hospital ${rel.hospitalId}`);
  }


  function getISODate(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  const appointmentsData = [
    { hospitalId: 1, patientName: 'Hana Worku', patientPhone: '0912-345678', patientAge: 28, patientGender: 'female', symptoms: 'Annual check-up.', doctorId: 1, appointmentDate: new Date(getISODate(0)), appointmentSlot: '09:00 AM', status: 'confirmed' },
    { hospitalId: 1, patientName: 'Kebede Alemayehu', patientPhone: '0911-987654', patientAge: 52, patientGender: 'male', symptoms: 'Follow-up on blood pressure.', doctorId: 1, appointmentDate: new Date(getISODate(0)), appointmentSlot: '09:30 AM', status: 'confirmed' },
    { hospitalId: 1, patientName: 'Marta Gebremedhin', patientPhone: '0913-222333', patientAge: 35, patientGender: 'female', symptoms: 'Skin rash consultation.', doctorId: 2, appointmentDate: new Date(getISODate(0)), appointmentSlot: '10:00 AM', status: 'confirmed' },
    { hospitalId: 2, patientName: 'Abel Tesema', patientPhone: '0910-444555', patientAge: 41, patientGender: 'male', symptoms: 'Migraine and fatigue.', doctorId: 3, appointmentDate: new Date(getISODate(0)), appointmentSlot: '10:30 AM', status: 'confirmed' },
    { hospitalId: 2, patientName: 'Lulit Fikre', patientPhone: '0919-111222', patientAge: 6, patientGender: 'female', symptoms: 'Child vaccination.', doctorId: 4, appointmentDate: new Date(getISODate(0)), appointmentSlot: '11:00 AM', status: 'confirmed' },
    { hospitalId: 2, patientName: 'New Patient', patientPhone: '0912-345678', patientAge: 30, patientGender: 'male', symptoms: 'Check-up', doctorId: 1, appointmentDate: new Date(getISODate(0)), appointmentSlot: '02:00 PM', status: 'confirmed' },
    ...Array.from({ length: 15 }, (_, i) => ({
      hospitalId: (i % 3) + 1,
      patientName: `Completed Patient ${i + 1}`,
      patientPhone: `0912-00${i.toString().padStart(2, '0')}`,
      patientAge: 20 + i * 2,
      patientGender: i % 2 === 0 ? 'female' : 'male',
      symptoms: `Symptom description ${i + 1}`,
      doctorId: (i % 7) + 1,
      appointmentDate: new Date(getISODate(- (i + 1))),
      appointmentSlot: '10:00 AM',
      status: 'completed',
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      hospitalId: (i % 3) + 1,
      patientName: `Cancelled Patient ${i + 1}`,
      patientPhone: `0913-01${i.toString().padStart(2, '0')}`,
      patientAge: 30 + i * 3,
      patientGender: 'female',
      symptoms: `Reason for cancellation ${i + 1}`,
      doctorId: (i % 7) + 1,
      appointmentDate: new Date(getISODate(- (i + 2))),
      appointmentSlot: '11:00 AM',
      status: 'cancelled',
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      hospitalId: (i % 3) + 1,
      patientName: `Past Patient ${i + 1}`,
      patientPhone: `0914-02${i.toString().padStart(2, '0')}`,
      patientAge: 25 + i * 2,
      patientGender: i % 2 === 0 ? 'male' : 'female',
      symptoms: `Past issue ${i + 1}`,
      doctorId: (i % 4) + 1,
      appointmentDate: new Date(getISODate(- (i + 15))),
      appointmentSlot: '02:00 PM',
      status: 'completed',
    })),
  ].map(a => ({
    ...a,
    status: a.status as any,
    patientGender: a.patientGender as any,
  }));
  
  await prisma.appointment.createMany({
    data: appointmentsData,
    skipDuplicates: true,
  });
  console.log(`Created ${appointmentsData.length} appointments`);


  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

    