/**
 * WebGPU Components Test Suite
 *
 * Tests for the WebGPU implementations including Rules Engine and BLE Processor.
 */

import { describe, it, expect } from "vitest";
import {
  SimpleWebGPURulesEngine,
  createExampleConstitution,
} from "../SimpleWebGPURulesEngine";
import { WebGPUBLEProcessor } from "../WebGPUBLEProcessor";

describe("WebGPU Components", () => {
  it("SimpleWebGPURulesEngine should evaluate rules correctly", async () => {
    const engine = new SimpleWebGPURulesEngine();
    const constitution = createExampleConstitution();

    const context = {
      spoonBalance: 5,
      karma: 100,
      timeOfDay: 14,
      zoneId: "test-zone",
      userId: "user1",
      action: "enter_zone",
      target: "test-zone",
      timestamp: Date.now(),
    };

    const result = await engine.evaluateRules(
      constitution,
      context,
      "test-zone",
    );

    expect(result).toBeDefined();
    expect(typeof result.allowed).toBe("boolean");
  });

  it("WebGPUBLEProcessor should process beacon data", async () => {
    const processor = new WebGPUBLEProcessor();
    const beacons = [
      {
        position: [0, 0, 0] as [number, number, number],
        rssi: -50,
        txPower: -59,
        timestamp: Date.now(),
      },
    ];

    const bleResult = await processor.processBeaconData(beacons);

    expect(bleResult).toBeDefined();
    expect(Array.isArray(bleResult.userPosition)).toBe(true);
  });
});
