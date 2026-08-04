import { describe, expect, it } from "vitest";
import { RuntimeTelemetry } from "../../src/telemetry";

describe("RuntimeTelemetry", () => {
  it("records every input that arrives before the next render frame", () => {
    const telemetry = new RuntimeTelemetry();

    telemetry.queueInput(10);
    telemetry.queueInput(15);
    telemetry.applyPendingInput(20);

    expect(telemetry.snapshot()).toMatchObject({
      inputSamples: 2,
      averageInputMs: 7.5,
      p95InputMs: 10,
      worstInputMs: 10,
    });
  });
});
