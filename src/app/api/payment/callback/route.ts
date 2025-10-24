import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Step 5: Callback endpoint for successful payments
export async function POST(request: NextRequest) {
  try {
    // ✅ Read Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header.");
      return NextResponse.json({ message: "Missing Authorization header" }, { status: 400 });
    }

    const authToken = authHeader.replace("Bearer ", "").trim();

    // ✅ Step 01 Validation: validate token with the bank’s validation API
    const validateResponse = await fetch(process.env.VALIDATE_TOKEN_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: authToken }),
    });

    const validateData = await validateResponse.json();
    if (!validateResponse.ok || !validateData.isValid) {
      console.error("Invalid authorization token.");
      return NextResponse.json({ message: "Invalid authorization token" }, { status: 400 });
    }

    // ✅ Parse the JSON body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (e) {
      console.error("Callback Error: Invalid JSON in request body.", e);
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
    console.log("Callback received body:", {receivedSignature, ...requestBody});
    // ✅ Check required fields
    if (
      !paidAmount ||
      !paidByNumber ||
      !txnRef ||
      !transactionId ||
      !transactionTime ||
      !accountNo ||
      !token
    ) {
      console.error("Missing required fields in callback body.");
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
    }

    // ✅ Validate the `token` inside the payload (per Step 01 again)
    const innerTokenValidation = await fetch(process.env.VALIDATE_TOKEN_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const tokenData = await innerTokenValidation.json();
    if (!innerTokenValidation.ok || !tokenData.isValid) {
      console.error("Invalid inner token in callback body.");
      return NextResponse.json({ message: "Invalid inner token" }, { status: 400 });
    }

    // ✅ Process: Find and update appointment
    const appointment = await prisma.appointment.findUnique({
      where: { transactionId },
    });

    if (!appointment) {
      console.error("Appointment not found for transaction:", transactionId);
      return NextResponse.json({ message: "Appointment not found" }, { status: 400 });
    }

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
    console.error("Callback server error:", error);
    return NextResponse.json({ message: "Server error during callback." }, { status: 500 });
  }
}
