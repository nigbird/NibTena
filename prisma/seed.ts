
import { PrismaClient } from '@prisma/client';
import { placeholderImages } from '../src/lib/placeholder-images';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // --- Create Hospitals ---
  const hospital1 = await prisma.hospital.create({
    data: {
      name: 'Tikur Anbessa Specialized Hospital',
      description: 'A leading public hospital in Addis Ababa, providing comprehensive healthcare services and medical education. It is the largest specialized hospital in Ethiopia.',
      city: 'Addis Ababa',
      imageId: 'hospital-1',
      contactEmail: 'contact@tikuranbessa.org.et',
      contactPhone: '+251-11-551-1211',
      accountNumber: '1000012345678',
      status: 'active',
      startTime: '08:00',
      endTime: '20:00',
      bookingWindow: 30,
    },
  });

  const hospital2 = await prisma.hospital.create({
    data: {
      name: 'St. Paul\'s Hospital Millennium Medical College',
      description: 'A specialized teaching hospital in Addis Ababa, known for its advanced medical training and patient care services in various fields.',
      city: 'Addis Ababa',
      imageId: 'hospital-2',
      contactEmail: 'info@sphmmc.edu.et',
      contactPhone: '+251-11-275-0125',
      accountNumber: '1000098765432',
      status: 'active',
      startTime: '08:00',
      endTime: '19:00',
      bookingWindow: 21,
    },
  });
  
  const hospital3 = await prisma.hospital.create({
    data: {
        name: 'Hawassa University Comprehensive Specialized Hospital',
        description: 'A major referral hospital in the Sidama region, providing a wide range of medical services and serving as a teaching center for Hawassa University.',
        city: 'Hawassa',
        imageId: 'hospital-3',
        contactEmail: 'info@hu.edu.et',
        contactPhone: '+251-46-220-5576',
        accountNumber: '1000024681357',
        status: 'active',
        startTime: '08:30',
        endTime: '18:30',
        bookingWindow: 14,
    },
   });


  // --- Create Doctors ---
  const doctor1 = await prisma.doctor.create({
    data: {
      name: 'Dr. Mulugeta Tesfaye',
      specialty: 'Cardiology',
      imageId: 'doctor-1',
      bio: 'Dr. Mulugeta is a senior cardiologist with over 15 years of experience in treating complex heart conditions. He is known for his patient-centric approach and dedication to cardiovascular health.',
      consultationFee: 2500,
      rating: 4.8,
      experience: 15,
      status: 'active',
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      name: 'Dr. Selamawit Bekele',
      specialty: 'Dermatology',
      imageId: 'doctor-2',
      bio: 'Dr. Selamawit specializes in both clinical and cosmetic dermatology. With 10 years of experience, she offers expert care for skin, hair, and nail disorders.',
      consultationFee: 1800,
      rating: 4.9,
      experience: 10,
      status: 'active',
    },
  });

  const doctor3 = await prisma.doctor.create({
    data: {
      name: 'Dr. Tewodros Mekonnen',
      specialty: 'Neurology',
      imageId: 'doctor-3',
      bio: 'A highly respected neurologist, Dr. Tewodros focuses on diagnosing and managing disorders of the nervous system. He has a special interest in epilepsy and stroke management.',
      consultationFee: 2200,
      rating: 4.7,
      experience: 12,
      status: 'active',
    },
  });
  
   const doctor4 = await prisma.doctor.create({
    data: {
      name: 'Dr. Meron Alemu',
      specialty: 'Pediatrics',
      imageId: 'doctor-4',
      bio: 'Dr. Meron is a compassionate pediatrician dedicated to the health and well-being of children from infancy through adolescence. She has over 8 years of experience in pediatric care.',
      consultationFee: 1500,
      rating: 4.9,
      experience: 8,
      status: 'active',
    },
  });

  const doctor5 = await prisma.doctor.create({
    data: {
      name: 'Dr. Yoseph Hailemariam',
      specialty: 'Orthopedics',
      imageId: 'doctor-5',
      bio: 'Dr. Yoseph is an orthopedic surgeon specializing in sports injuries and joint replacement. He is committed to restoring mobility and improving quality of life for his patients.',
      consultationFee: 2800,
      rating: 4.6,
      experience: 14,
      status: 'active',
    },
  });
  
   const doctor6 = await prisma.doctor.create({
    data: {
      name: 'Dr. Rahel Tadesse',
      specialty: 'Dentistry',
      imageId: 'doctor-6',
      bio: 'A skilled dentist with a gentle touch, Dr. Rahel provides comprehensive dental care, from routine check-ups to advanced cosmetic procedures.',
      consultationFee: 1200,
      rating: 4.8,
      experience: 9,
      status: 'active',
    },
  });
  
   const doctor7 = await prisma.doctor.create({
    data: {
      name: 'Dr. Dawit Abebe',
      specialty: 'Cardiology',
      imageId: 'doctor-7',
      bio: 'Dr. Dawit is a cardiologist focused on preventative care and the management of chronic heart conditions. He is an advocate for heart-healthy lifestyles.',
      consultationFee: 2400,
      rating: 4.7,
      experience: 11,
      status: 'active',
    },
  });
  
   const doctor8 = await prisma.doctor.create({
    data: {
      name: 'Dr. Liya Kebede',
      specialty: 'Pediatrics',
      imageId: 'doctor-4',
      bio: 'With a friendly demeanor and extensive knowledge, Dr. Liya provides exceptional care for children, focusing on developmental health and preventative medicine.',
      consultationFee: 1600,
      rating: 4.8,
      experience: 7,
      status: 'active',
    },
  });


  // --- Link Doctors to Hospitals (Many-to-Many) ---
  await prisma.doctorsOnHospitals.createMany({
    data: [
      // Tikur Anbessa Doctors
      { doctorId: doctor1.id, hospitalId: hospital1.id },
      { doctorId: doctor2.id, hospitalId: hospital1.id },
      { doctorId: doctor3.id, hospitalId: hospital1.id },
      { doctorId: doctor7.id, hospitalId: hospital1.id },
      
      // St. Paul's Doctors
      { doctorId: doctor4.id, hospitalId: hospital2.id },
      { doctorId: doctor5.id, hospitalId: hospital2.id },
      { doctorId: doctor6.id, hospitalId: hospital2.id },
      { doctorId: doctor8.id, hospitalId: hospital2.id },
      
      // Hawassa Doctors
      { doctorId: doctor1.id, hospitalId: hospital3.id }, // Dr. Mulugeta also works here
      { doctorId: doctor5.id, hospitalId: hospital3.id }, // Dr. Yoseph also works here
    ],
  });

  // --- Create an initial appointment for demonstration ---
   await prisma.appointment.create({
    data: {
        patientName: 'Hana Worku',
        patientPhone: '912345678',
        patientAge: 28,
        patientGender: 'female',
        symptoms: 'Annual check-up and consultation regarding recent fatigue.',
        doctorId: doctor2.id, // Dr. Selamawit Bekele
        hospitalId: hospital1.id, // Tikur Anbessa
        appointmentSlot: '10:30 AM',
        appointmentDate: new Date(),
        status: 'confirmed',
      },
   });

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
