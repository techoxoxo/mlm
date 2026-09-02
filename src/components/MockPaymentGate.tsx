"use client";

import { useSearchParams } from "next/navigation";
import { MockPaymentSandbox } from "./MockPaymentSandbox";

/**
 * Shows the mock RazCrypto sandbox (full-screen takeover) instead of the
 * normal dashboard whenever `?mock_invoice=true` is present — lets any
 * logged-in user test a payment flow locally (ROI investment, wallet
 * deposit, ...), not just the registered/activation-only case.
 */
export function MockPaymentGate({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  if (searchParams.get("mock_invoice") === "true") {
    return <MockPaymentSandbox />;
  }
  return <>{children}</>;
}
