import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Step 5: Callback endpoint for successful payments
export async function POST(request: NextRequest) {
  console.log("🔔 Payment callback received");
  
  try {
    // ✅ Read Authorization header
    const authHeader = request.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("❌ Missing Authorization header.");
      return NextResponse.json({ message: "Missing Authorization header" }, { status: 400 });
    }

    const authToken = authHeader.replace("Bearer ", "").trim();
    console.log("Auth token extracted:", authToken ? "Present" : "Missing");

    // ✅ Step 01 Validation: validate token with the bank's validation API
    const VALIDATE_TOKEN_URL = process.env.VALIDATE_TOKEN_URL;
    console.log("VALIDATE_TOKEN_URL:", VALIDATE_TOKEN_URL ? "Set" : "Missing");
    
    if (!VALIDATE_TOKEN_URL) {
      console.error("❌ VALIDATE_TOKEN_URL environment variable not set");
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }

    console.log("🔍 Validating token with bank API...");
    const validateResponse = await fetch(VALIDATE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: authToken }),
    });

    console.log("Validation response status:", validateResponse.status);
    const validateData = await validateResponse.json();
    console.log("Validation response data:", validateData);
    
    if (!validateResponse.ok || !validateData.isValid) {
      console.error("❌ Invalid authorization token:", validateData);
      return NextResponse.json({ message: "Invalid authorization token" }, { status: 400 });
    }

    // ✅ Parse the JSON body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log("📦 Callback request body received:", requestBody);
    } catch (e) {
      console.error("❌ Callback Error: Invalid JSON in request body.", e);
      return NextResponse.json({ message: "Error Occurred." }, { status: 400 });
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
      receivedSignature: receivedSignature ? "Present" : "Missing"
    });
    // ✅ Check required fields
    const missingFields = [];
    if (!paidAmount) missingFields.push('paidAmount');
    if (!paidByNumber) missingFields.push('paidByNumber');
    if (!txnRef) missingFields.push('txnRef');
    if (!transactionId) missingFields.push('transactionId');
    if (!transactionTime) missingFields.push('transactionTime');
    if (!accountNo) missingFields.push('accountNo');
    if (!token) missingFields.push('token');
    
    if (missingFields.length > 0) {
      console.error("❌ Missing required fields in callback body:", missingFields);
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 });
    }

    // ✅ Validate the `token` inside the payload (per Step 01 again)
    console.log("🔍 Validating inner token from callback body...");
    const innerTokenValidation = await fetch(VALIDATE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    console.log("Inner token validation status:", innerTokenValidation.status);
    const tokenData = await innerTokenValidation.json();
    console.log("Inner token validation data:", tokenData);
    
    if (!innerTokenValidation.ok || !tokenData.isValid) {
      console.error("❌ Invalid inner token in callback body:", tokenData);
      return NextResponse.json({ message: "Invalid inner token" }, { status: 400 });
    }

    // ✅ Process: Find and update appointment
    console.log("🔍 Looking for appointment with transactionId:", transactionId);
    const appointment = await prisma.appointment.findUnique({
      where: { transactionId },
    });

    if (!appointment) {
      console.error("❌ Appointment not found for transaction:", transactionId);
      return NextResponse.json({ message: "Appointment not found" }, { status: 400 });
    }

    console.log("✅ Found appointment:", {
      id: appointment.id,
      status: appointment.status,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId
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

    // ✅ Respond success per Step 5
    return NextResponse.json({ message: "Payment confirmed and updated." }, { status: 200 });
  } catch (error) {
    console.error("❌ Callback server error:", error);
    return NextResponse.json({ message: "Server error during callback." }, { status: 500 });
  }
}
