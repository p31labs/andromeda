import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getEventLog, 
  logEvent, 
  logIntentRouted, 
  logGuardianActivated, 
  logSpoonStateChanged,
  logSurfaceNavigated,
  logVoiceToggled,
  logDeviceSealed,
  logDeviceUnlocked,
  logGroundingCompleted,
  logLoveChanged,
  getLogs,
  clearLogs
} from '../EventLogger';

describe('EventLogger', () => {
  const STORAGE_KEY = 'phos_event_log';
  
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.removeItem(STORAGE_KEY);
    // Mock console.log to avoid output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEventLog', () => {
    it('should return empty array when no events exist', () => {
      expect(getEventLog()).toEqual([]);
    });
    
    it('should return parsed events when they exist', () => {
      const mockEvents = [{ id: '1', type: 'TEST', timestamp: '2023-01-01', data: {} }];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockEvents));
      expect(getEventLog()).toEqual(mockEvents);
    });
    
    it('should return empty array when invalid JSON is stored', () => {
      window.localStorage.setItem(STORAGE_KEY, 'invalid json');
      expect(getEventLog()).toEqual([]);
    });
  });

  describe('logEvent', () => {
    it('should create and persist an event with correct structure', () => {
      const testData = { key: 'value', number: 42, flag: true };
      logEvent('TEST_EVENT', testData);
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      
      const event = logs[0];
      expect(event.type).toBe('TEST_EVENT');
      expect(event.data).toEqual(testData);
      expect(event.id).toMatch(/\d+-\w+/);
      expect(event.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
    
    it('should respect MAX_EVENTS limit (50)', () => {
      // Log 55 events
      for (let i = 0; i < 55; i++) {
        logEvent('TEST_EVENT', { index: i });
      }
      
      const logs = getEventLog();
      expect(logs).toHaveLength(50);
      // Should have events 5-54 (0-indexed, so indices 5-54)
      expect(logs[0].data.index).toBe(5);
      expect(logs[49].data.index).toBe(54);
    });
  });

  describe('convenience wrappers', () => {
    it('logIntentRouted should log correct data', () => {
      logIntentRouted('test input', 'TEST_SURFACE', 3);
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('INTENT_ROUTED');
      expect(logs[0].data).toMatchObject({
        input: 'test input',
        targetSurface: 'TEST_SURFACE',
        spoons: 3
      });
    });
    
    it('logGuardianActivated should log correct data', () => {
      logGuardianActivated(2);
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('GUARDIAN_ACTIVATED');
      expect(logs[0].data).toMatchObject({
        spoons: 2,
        urgent: true
      });
    });
    
    it('logSpoonStateChanged should log correct data', () => {
      logSpoonStateChanged(4, 2);
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('SPOON_STATE_CHANGED');
      expect(logs[0].data).toMatchObject({
        from: 4,
        to: 2,
        delta: -2
      });
    });
    
    it('logSurfaceNavigated should log correct data', () => {
      logSurfaceNavigated('FROM_SURFACE', 'TO_SURFACE', true);
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('SURFACE_NAVIGATED');
      expect(logs[0].data).toMatchObject({
        fromSurface: 'FROM_SURFACE',
        toSurface: 'TO_SURFACE',
        grayRock: true
      });
    });
    
    it('logVoiceToggled should log correct data', () => {
      logVoiceToggled(true);
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('VOICE_TOGGLED');
      expect(logs[0].data).toEqual({ muted: true });
    });
    
    it('logDeviceSealed should log correct data', () => {
      logDeviceSealed();
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('DEVICE_SEALED');
      expect(logs[0].data).toHaveProperty('method', 'WebAuthn platform');
      expect(logs[0].data).toHaveProperty('timestamp');
    });
    
    it('logDeviceUnlocked should log correct data', () => {
      logDeviceUnlocked();
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('DEVICE_UNLOCKED');
      expect(logs[0].data).toHaveProperty('method', 'WebAuthn platform');
      expect(logs[0].data).toHaveProperty('timestamp');
    });
    
    it('logGroundingCompleted should log correct data', () => {
      logGroundingCompleted(1);
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('GROUNDING_COMPLETED');
      expect(logs[0].data).toMatchObject({
        spoons: 1,
        method: '4-7-8 breathing',
        loveAwarded: 10
      });
    });
    
    it('logLoveChanged should log correct data', () => {
      logLoveChanged(100, 10);
      
      const logs = getEventLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('LOVE_CHANGED');
      expect(logs[0].data).toMatchObject({
        balance: 100,
        delta: 10
      });
    });
  });

  describe('getLogs and clearLogs', () => {
    it('getLogs should return event log', () => {
      logEvent('TEST', { data: 'test' });
      expect(getLogs()).toHaveLength(1);
    });
    
    it('clearLogs should remove all events', () => {
      logEvent('TEST1', { data: 'test1' });
      logEvent('TEST2', { data: 'test2' });
      expect(getLogs()).toHaveLength(2);
      
      clearLogs();
      expect(getLogs()).toHaveLength(0);
    });
  });
});