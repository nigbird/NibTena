import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Step 5: Callback endpoint for successful payments
export async function POST(request: NextRequest) {
  console.log("🔔 Payment callback received");
  console.log("📝 Request URL:", request.url);
  console.log("📝 Request method:", request.method);
  console.log("📝 Request headers:", Object.fromEntries(request.headers.entries()));

  try {
    // ✅ Read Authorization header
    const authHeader = request.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);

    if (!authHeader) {
      console.error("❌ Missing Authorization header.");
      return NextResponse.json({ message: "Missing Authorization header" }, { status: 400 });
    }

    // Match: Bearer {token: <JWT>}
    const match = authHeader.match(/Bearer\s*\{\s*token\s*:\s*([A-Za-z0-9\-_\.]+)\s*\}/);
    const fixedAuthHeader = match ? match[1].trim() : null;

    if (!fixedAuthHeader) {
      console.error("❌ Could not extract token from Authorization header:", authHeader);
      return NextResponse.json({ message: "Invalid Authorization header format" }, { status: 400 });
    }

    const fixedAuthHeader1 = `Bearer ${fixedAuthHeader}`;
    console.log("✅ Extracted token:", fixedAuthHeader ? "Present" : "Missing");

    // Continue with validation
    const VALIDATE_TOKEN_URL = process.env.VALIDATE_TOKEN_URL;
    console.log("VALIDATE_TOKEN_URL:", VALIDATE_TOKEN_URL ? "Set" : "Not set");

    if (!VALIDATE_TOKEN_URL) {
      console.error("❌ VALIDATE_TOKEN_URL environment variable not set");
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
      }
      console.warn("⚠️ Skipping token validation in development mode");
    }

    if (VALIDATE_TOKEN_URL) {
      console.log("🔍 Validating token with bank API...");

      try {
        // Fix: Use the correct variable name (VALIDATE_TOKEN_URL)
        let externalResponse = await fetch(VALIDATE_TOKEN_URL, {
          method: "GET",
          headers: {
            Authorization: fixedAuthHeader1,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        // Retry with POST if GET not allowed
        if (externalResponse.status === 405) {
          console.log("🔁 Retrying validation with POST method...");
          externalResponse = await fetch(VALIDATE_TOKEN_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ token: fixedAuthHeader }),
            cache: "no-store",
          });
        }

        console.log("Validation response status:", externalResponse.status);

        const text = await externalResponse.text();
        const validateData = text ? JSON.parse(text) : null;

        if (!externalResponse.ok) {
          console.error("❌ Token validation failed:", validateData || externalResponse.statusText);
          return NextResponse.json({ message: "Invalid token" }, { status: 401 });
        }

        console.log("✅ Token validated successfully:", validateData);
      } catch (error) {
        console.error("❌ Callback Error: Failed to call validation URL.", error);
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ message: "Error validating token." }, { status: 500 });
        }
        console.warn("⚠️ Continuing after token validation error in development mode");
      }
    }

    // ✅ Parse the JSON body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log("📦 Callback request body received:", requestBody);
    } catch (e) {
      console.error("❌ Callback Error: Invalid JSON in request body.", e);
      return NextResponse.json({ message: "Invalid JSON in request body" }, { status: 400 });
    }

    const {
      paidAmount,
      paidByNumber,
      txnRef,
      transactionId,
      transactionTime,
      accountNo,
      token,
      Signature: receivedSignature,
    } = requestBody;

    console.log("📋 Extracted callback data:", {
      paidAmount,
      paidByNumber,
      txnRef,
      transactionId,
      transactionTime,
      accountNo,
      token: token ? "Present" : "Missing",
      receivedSignature: receivedSignature ? "Present" : "Missing",
    });

    // ✅ Check required fields
    const missingFields = [];
    if (!paidAmount) missingFields.push("paidAmount");
    if (!paidByNumber) missingFields.push("paidByNumber");
    if (!txnRef) missingFields.push("txnRef");
    if (!transactionId) missingFields.push("transactionId");
    if (!transactionTime) missingFields.push("transactionTime");
    if (!accountNo) missingFields.push("accountNo");
    if (!token) missingFields.push("token");

    if (missingFields.length > 0) {
      console.error("❌ Missing required fields in callback body:", missingFields);
      return NextResponse.json(
        { message: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }


    // ✅ Process appointment update
    console.log("🔍 Looking for appointment with transactionId:", transactionId);
    const appointment = await prisma.appointment.findUnique({ where: { transactionId:txnRef } });

    if (!appointment) {
      console.error("❌ Appointment not found for transaction:", transactionId);
      return NextResponse.json({ message: "Appointment not found" }, { status: 400 });
    }

    console.log("✅ Found appointment:", {
      id: appointment.id,
      status: appointment.status,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
    });

    console.log("💾 Updating appointment status to 'paid'...");
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "paid",
        updatedAt: new Date(),
      },
    });

    console.log("✅ Payment confirmed for transaction:", transactionId);

    // ✅ Respond success
    return NextResponse.json({ message: "Payment confirmed and updated." }, { status: 200 });
  } catch (error) {
    console.error("❌ Callback server error:", error);
    return NextResponse.json({ message: "Server error during callback." }, { status: 500 });
  }
}

