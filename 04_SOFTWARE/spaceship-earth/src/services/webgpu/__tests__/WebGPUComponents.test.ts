/**
 * WebGPU Components Test Suite
 * 
 * Tests for the WebGPU implementations including Rules Engine and BLE Processor.
 */

import { SimpleWebGPURulesEngine, createExampleConstitution } from '../SimpleWebGPURulesEngine';
import { WebGPUBLEProcessor } from '../WebGPUBLEProcessor';

// Simple test functions that can be called during build
export async function testWebGPUComponents() {
  // Test SimpleWebGPURulesEngine
  const engine = new SimpleWebGPURulesEngine();
  const constitution = createExampleConstitution();
  
  const context = {
    spoonBalance: 5,
    karma: 100,
    timeOfDay: 14,
    zoneId: 'test-zone',
    userId: 'user1',
    action: 'enter_zone',
    target: 'test-zone',
    timestamp: Date.now()
  };

  const result = await engine.evaluateRules(constitution, context, 'test-zone');
  
  if (!result || typeof result.allowed !== 'boolean') {
    throw new Error('Rules engine test failed');
  }

  // Test WebGPUBLEProcessor
  const processor = new WebGPUBLEProcessor();
  const beacons = [
    {
      position: [0, 0, 0] as [number, number, number],
      rssi: -50,
      txPower: -59,
      timestamp: Date.now()
    }
  ];

  const bleResult = await processor.processBeaconData(beacons);
  
  if (!bleResult || !Array.isArray(bleResult.userPosition)) {
    throw new Error('BLE processor test failed');
  }

  return true;
}
