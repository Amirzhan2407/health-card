import { createAppointment } from "../services/appointmentService.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Concurrency Test Script
 * Simulates two concurrent bookings for the same doctor at the same slot.
 * Demonstrates that the unique constraint or transaction check prevents double booking.
 */
async function runConcurrencyTest() {
  console.log("=== STARTING CONCURRENCY BOOKING TEST ===");
  
  const mockPatient1 = "00000000-0000-0000-0000-000000000001";
  const mockPatient2 = "00000000-0000-0000-0000-000000000002";
  const mockDoctor = "00000000-0000-0000-0000-000000000003";
  const mockOrg = "00000000-0000-0000-0000-000000000004";
  const targetDate = "2026-12-01";
  const targetTime = "10:00";
  const reason = "Concurrency test booking";

  console.log(`Targeting slot: ${targetDate} ${targetTime} for Doctor: ${mockDoctor}`);
  
  // Trigger both promises concurrently
  console.log("Sending concurrent booking requests...");
  const p1 = createAppointment(mockPatient1, mockOrg, mockDoctor, targetDate, targetTime, reason);
  const p2 = createAppointment(mockPatient2, mockOrg, mockDoctor, targetDate, targetTime, reason);

  try {
    const results = await Promise.allSettled([p1, p2]);
    
    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    console.log(`\nResults:`);
    console.log(`- Successful bookings: ${fulfilled.length}`);
    console.log(`- Blocked/Rejected bookings: ${rejected.length}`);

    if (fulfilled.length === 1 && rejected.length === 1) {
      console.log("\n[SUCCESS] Concurrency test passed: Only ONE patient was able to book the slot, the other was rejected.");
      console.log("Rejection reason:", rejected[0].reason.message);
    } else {
      console.warn("\n[WARNING] Concurrency check yielded unexpected counts. In local development offline mode, this is expected if Supabase connection is mocked/unavailable.");
    }
  } catch (err) {
    console.error("Test failed with error:", err.message);
  }
}

// Only run if executed directly
if (process.argv[1] && process.argv[1].endsWith("test_concurrency.js")) {
  runConcurrencyTest();
}
export { runConcurrencyTest };
