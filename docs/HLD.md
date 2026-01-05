
# High-Level Design (HLD) for NibTena

**Version 1.1**

**Date:** 2024-10-27

---

## 1. Introduction

This document outlines the high-level architecture, system design, and security posture for the NibTena platform. It describes the major components, their interactions, the technology stack, and the security measures in place, providing a strategic overview for development, deployment, and cybersecurity audits.

## 2. System Architecture

The NibTena platform is designed as a monolithic application with a client-server architecture, built using the Next.js framework. This allows for Server-Side Rendering (SSR) for performance and SEO while enabling a rich client-side experience with React.

### 2.1 Architectural Style

-   **Monolithic Application:** All user-facing portals (Patient, Doctor, Hospital, Super Admin) and backend logic are served from a single Next.js application instance.
-   **Component-Based UI:** The frontend is built with React and ShadCN UI components, promoting reusability and a consistent design language across all portals.
-   **Serverless Functions:** API Routes and Server Actions within Next.js handle data mutations and business logic, operating as serverless functions within the chosen cloud environment.

### 2.2 Technology Stack

-   **Frontend:** Next.js (with App Router), React, TypeScript, Tailwind CSS.
-   **Backend:** Next.js (API Routes, Server Actions), Node.js.
-   **Database:** PostgreSQL (Managed Service).
-   **ORM:** Prisma.
-   **Authentication:** NextAuth.js for credential-based login and a custom OTP solution for patient authentication.
-   **Deployment:** Cloud-based platform with serverless function and container support (e.g., Firebase App Hosting, Vercel).

### 2.3 Component Diagram

```mermaid
graph TD
    subgraph "User Devices (Browser)"
        A[Patient Portal]
        B[Doctor Portal]
        C[Hospital Admin Portal]
        D[Super Admin Portal]
    end

    subgraph "Cloud Provider Network"
        subgraph "Edge Network"
            WAF(Web Application Firewall)
            CDN(Content Delivery Network)
        end
        
        subgraph "Application Layer (Serverless)"
            App[Next.js Application]
            Middleware(Auth & Routing Middleware)
            APIs(API Routes & Server Actions)
        end
        
        subgraph "Authentication Service"
            AuthSvc(NextAuth.js)
        end
    end

    subgraph "Database Provider Network (VPC)"
        DB_Firewall(Database Firewall)
        DB[(PostgreSQL Database)]
    end

    subgraph "Third-Party Services"
        PaymentGateway[External Payment Gateway]
    end
    
    A & B & C & D -->|HTTPS (TLS)| WAF
    WAF --> CDN
    CDN --> App
    App --> Middleware
    Middleware --> APIs & AuthSvc
    APIs -->|Prisma Client via SSL| DB_Firewall
    DB_Firewall --> DB
    APIs -->|HTTPS API Call| PaymentGateway
```

## 3. Security Architecture

This section details the security layers and controls implemented across the NibTena platform.

### 3.1 Deployment Architecture & Network Boundaries

-   **Deployment Model:** The application is deployed entirely on a managed **cloud platform** (e.g., Firebase App Hosting). There are no on-premise components.
-   **Network Boundaries:**
    -   **User to Edge:** All user traffic originates from the public internet and first hits the cloud provider's edge network.
    -   **Edge to Application:** The edge network routes legitimate traffic to the serverless Next.js application.
    -   **Application to Database:** The application communicates with the managed PostgreSQL database over a secure, private connection. The database is not exposed to the public internet.
    -   **Application to Third Parties:** Outbound API calls to the Payment Gateway are made from the application's backend over the public internet via HTTPS.

### 3.2 Security Layers & Controls

-   **Web Application Firewall (WAF):** Positioned at the cloud provider's edge, the WAF protects against common web vulnerabilities like **SQL Injection (SQLi)**, **Cross-Site Scripting (XSS)**, and other OWASP Top 10 threats. It inspects all incoming HTTP/S requests before they reach the application.
-   **Firewalls:**
    -   **Edge Firewall:** The cloud provider's global firewall provides a first line of defense, filtering out malicious traffic and mitigating DDoS attacks.
    -   **Database Firewall:** The managed PostgreSQL database is protected by a dedicated firewall configured to **only allow connections from the application's specific serverless function IPs**. All other inbound connections are blocked.
-   **Encryption (SSL/TLS):**
    -   **Data in Transit:** All communication between user browsers and the application is enforced over **HTTPS using TLS 1.2 or higher**. Communication between the application and the database is also encrypted via SSL/TLS.
    -   **Data at Rest:** The managed PostgreSQL database provider is configured to encrypt all data at rest.
-   **DMZ (Demilitarized Zone):** In this serverless architecture, the public-facing components (CDN, WAF, and the Next.js application itself) effectively act as the DMZ. The critical backend database resides in an isolated, non-public virtual network.
-   **Intrusion Detection/Prevention System (IDS/IPS):** The cloud provider's network infrastructure includes built-in IDS/IPS capabilities to detect and block anomalous network activity and known attack patterns.
-   **VPN (Virtual Private Network):** VPN access is not required for application operation but is used by developers for secure access to internal cloud provider management consoles if needed.

### 3.3 Application-Level Security

-   **Authentication:** Managed by NextAuth.js, which implements secure session handling using JWTs stored in HTTP-only cookies.
-   **Authorization:** Role-Based Access Control (RBAC) is enforced by middleware for all sensitive routes and API endpoints, ensuring users can only access resources permitted by their role.
-   **Input Validation:** All server actions and API routes use **Zod** for strict schema-based input validation, preventing malformed or malicious data from being processed.
-   **ORM Security:** The use of the **Prisma ORM** mitigates SQL injection risks by parameterizing all database queries.

## 4. Integration Points

-   **Payment Gateway:** Integration occurs via a server-to-server REST API call. The system initiates a payment request and receives a status update via a secure callback webhook. The authenticity of the callback is verified using a secret token.

## 5. Deployment Strategy

-   **Hosting:** A serverless platform like Firebase App Hosting or Vercel.
-   **Database:** A managed PostgreSQL provider (e.g., Supabase, Neon, AWS RDS) within a secure Virtual Private Cloud (VPC).
-   **CI/CD:** A CI/CD pipeline automates the build, test, and deployment process upon pushes to the main branch.
-   **Environment Variables:** All secrets, including database connection strings and API keys, are managed securely through environment variables and are not hard-coded in the source code.
