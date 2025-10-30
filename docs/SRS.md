
# Software Requirements Specification (SRS) for NibTena

**Version 1.0**

**Date:** 2024-10-26

---

## 1. Introduction

### 1.1 Purpose

This document provides a detailed specification of the requirements for the **NibTena** platform. NibTena is a comprehensive healthcare management system designed to connect patients with doctors and hospitals, streamlining the process of finding healthcare providers, booking appointments, and managing medical information. It serves as a blueprint for the development team and a point of reference for all stakeholders.

### 1.2 Scope

The system will be a web-based platform with three primary user-facing portals and one administrative portal:
1.  **Patient Portal:** Allows users to search for doctors and hospitals, book appointments, and manage their health profiles. Accessible via a standalone web application and an integrated mini-app.
2.  **Doctor Portal:** Enables doctors to manage their schedules, view appointments, and update their professional profiles.
3.  **Hospital Admin Portal:** Allows hospital administrators to manage doctors, appointments, schedules, and view reports.
4.  **Super Admin Portal:** Provides platform-wide oversight, including managing hospitals and system settings.

### 1.3 Definitions, Acronyms, and Abbreviations

-   **SRS:** Software Requirements Specification
-   **HLD:** High-Level Design
-   **LLD:** Low-Level Design
-   **UI/UX:** User Interface/User Experience
-   **DFD:** Data Flow Diagram
-   **ERD:** Entity-Relationship Diagram
-   **API:** Application Programming Interface
-   **OTP:** One-Time Password
-   **JWT:** JSON Web Token

---

## 2. Overall Description

### 2.1 Product Perspective

NibTena is a self-contained platform built on a modern web stack (Next.js, React, Prisma, NextAuth.js). It aims to bridge the gap between patients and healthcare providers by offering a user-friendly digital interface. It will also support integration into a "Super App" for a seamless user experience within a broader ecosystem.

### 2.2 User Classes and Characteristics

| User Role         | Characteristics & Goals                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Patient**       | Individuals seeking medical care. Goal: To easily find doctors/hospitals, book appointments, and manage their health records.  |
| **Doctor**        | Healthcare professionals. Goal: To manage their schedule, view patient appointments, and maintain their public profile.      |
| **Hospital Admin**| Staff responsible for hospital operations. Goal: To manage staff, schedules, appointments, and monitor performance.        |
| **Super Admin**   | Platform owner/operator. Goal: To oversee all hospitals, manage platform settings, and ensure smooth operation.             |
| **System**        | The NibTena platform itself, performing automated tasks and data processing.                                                |

### 2.3 Operating Environment

The application is a web-based platform designed to run in modern web browsers on both desktop and mobile devices. The backend is built with Node.js (via Next.js) and connects to a PostgreSQL database. It is intended for cloud deployment.

---

## 3. System Features (Functional Requirements)

### 3.1 User Authentication
- **FR1.1:** The system shall support role-based authentication for Patients, Doctors, Hospital Admins, and Super Admins.
- **FR1.2:** Patients shall authenticate using a phone number and a One-Time Password (OTP).
- **FR1.3:** Professional users (Doctors, Admins) shall authenticate using email and password.
- **FR1.4:** The system shall manage sessions and redirect users based on their role and authentication status.
- **FR1.5:** The system shall support session integration with a Mini-App via a JWT-based connection.

### 3.2 Patient Portal
- **FR2.1:** Patients shall be able to search for doctors by name or specialty.
- **FR2.2:** Patients shall be able to search for hospitals by name or city.
- **FR2.3:** Patients shall be able to view detailed profiles of doctors and hospitals.
- **FR2.4:** Patients shall be able to view available appointment slots for a doctor and book an appointment.
- **FR2.5:** Patients can book for themselves or for someone else.
- **FR2.6:** Patients shall manage their own appointments (view, reschedule, cancel).
- **FR2.7:** Patients shall be able to create and update their personal health profile.

### 3.3 Doctor Portal
- **FR3.1:** Doctors shall be able to view a dashboard summarizing their daily schedule and key stats.
- **FR3.2:** Doctors shall be able to manage their weekly schedule, including setting working hours and breaks for each affiliated hospital.
- **FR3.3:** Doctors shall be able to view and manage their list of appointments (upcoming, completed, etc.).
- **FR3.4:** Doctors shall be able to update their professional profile, including bio, specialty, and consultation fee.

### 3.4 Hospital Admin Portal
- **FR4.1:** Admins shall view a dashboard with key hospital metrics (e.g., total appointments, doctor performance).
- **FR4.2:** Admins shall be able to add, edit, and manage doctor profiles for their hospital.
- **FR4.3:** Admins shall be able to manage all appointments for their hospital.
- **FR4.4:** Admins shall be able to manage doctor schedules.
- **FR4.5:** Admins shall manage a live patient queue for the current day's appointments.
- **FR4.6:** Admins shall view analytics and reports on hospital performance.

### 3.5 Super Admin Portal
- **FR5.1:** Super Admins shall view a platform-wide dashboard.
- **FR5.2:** Super Admins shall be able to add, edit, activate, and deactivate hospital accounts.
- **FR5.3:** Super Admins shall have access to global system settings.

### 3.6 Payment Integration
- **FR6.1:** The system shall integrate with an external payment gateway for appointment booking.
- **FR6.2:** The system shall initiate payment by sending a secure request with a unique transaction ID.
- **FR6.3:** The system shall provide a callback endpoint to receive payment confirmation from the gateway.
- **FR6.4:** Upon successful payment confirmation, the system shall update the appointment status to "confirmed".

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR1.1:** All pages shall load in under 3 seconds on a standard internet connection.
- **NFR1.2:** API response times for critical read operations (e.g., fetching doctor profiles) shall be under 500ms.

### 4.2 Security
- **NFR2.1:** All user passwords shall be hashed using a strong, one-way algorithm (bcrypt).
- **NFR2.2:** Role-based access control (RBAC) must be enforced on all routes and API endpoints.
- **NFR2.3:** The system shall implement Content Security Policy (CSP) headers to mitigate XSS attacks.
- **NFR2.4:** All data in transit shall be encrypted using TLS/SSL.
- **NFR2.5:** Patient sessions (standalone web) shall automatically expire after 30 minutes of inactivity.

### 4.3 Usability and Accessibility
- **NFR3.1:** The user interface shall be responsive and functional on all major screen sizes, from mobile phones to desktops.
- **NFR3.2:** The UI shall adhere to modern design principles, ensuring an intuitive and clean user experience.
- **NFR3.3:** Key interactive elements must be accessible via keyboard and screen readers.

### 4.4 Scalability
- **NFR4.1:** The application architecture must support horizontal scaling to handle increased user load.
- **NFR4.2:** The database schema shall be optimized with appropriate indexes to ensure efficient queries as data volume grows.

---
