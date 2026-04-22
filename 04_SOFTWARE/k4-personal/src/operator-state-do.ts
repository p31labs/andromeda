// ═══════════════════════════════════════════════════════════
// k4-personal: VERTEX A — OperatorStateDO
//
// The phosphorus core — internal operator state, bio data,
// spoons, medication, cognitive load.
// ═══════════════════════════════════════════════════════════

import {
  OperatorState,
  EnergyState,
  BioReading,
  MedicationReminder,
  CognitiveLoad,
  calculateSpoons,
  calculateEnergyTrend,
  calculateCognitiveLoad,
  shouldActivateFortress,
} from '@p31/k4-mesh-core';

export class OperatorStateDO implements DurableObject {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Routes - accept any agent ID
    if (path.includes('/energy') && request.method === 'GET') {
      return this.getEnergyState();
    }
    if (path.includes('/energy') && request.method === 'PUT') {
      return this.updateEnergyState(await request.json());
    }
    if (path.includes('/bio') && request.method === 'POST') {
      return this.submitBioReading(await request.json());
    }
    if (path.includes('/reminders') && request.method === 'GET') {
      return this.getReminders();
    }
    if (path.includes('/reminders') && request.method === 'POST') {
      return this.createReminder(await request.json());
    }
    if (path.includes('/voltage') && request.method === 'GET') {
      return this.getCognitiveLoad();
    }

    return new Response('Not found', { status: 404 });
  }

  // Alarm cycle: 15min energy trend, 30s bio flush, 1min medication check
  async alarm(): Promise<void> {
    // 1. Recalculate energy trend
    const readings = await this.state.storage.list<EnergyState>({ prefix: 'energy:', limit: 4 });
    // Map to expected format with ts field
    const trendReadings = Array.from(readings.values()).map(e => ({
      spoons: e.spoons,
      ts: e.lastUpdate
    }));
    const trend = calculateEnergyTrend(trendReadings);
    
    // 2. Flush bio to telemetry
    const bio = await this.state.storage.list<BioReading>({ prefix: 'bio:', limit: 100 });
    // Forward to D1 telemetry with SHA-256 chain
    
    // 3. Check medication reminders
    const reminders = await this.state.storage.list<MedicationReminder>({ prefix: 'med:' });
    const now = Date.now();
    
    for (const [key, reminder] of reminders) {
      if (!reminder.completed && reminder.schedule_ts <= now) {
        // Push to hub A->B edge
        await this.env.K4_HUBS.post('/hub/energy-voltage', {
          type: 'medication-due',
          payload: { reminder }
        });
      }
    }

    // Reschedule alarm for 1 minute
    this.state.storage.setAlarm(Date.now() + 60 * 1000);
  }

  private async getEnergyState(): Promise<Response> {
    const energy = await this.state.storage.get<EnergyState>('energy:current') || {
      spoons: 10,
      max: 10,
      trend: 'stable',
      lastUpdate: Date.now(),
    };
    return Response.json(energy);
  }

  private async updateEnergyState(data: Partial<EnergyState>): Promise<Response> {
    const current = await this.state.storage.get<EnergyState>('energy:current') || {
      spoons: 10,
      max: 10,
      trend: 'stable',
      lastUpdate: Date.now(),
    };

    const updated = { ...current, ...data, lastUpdate: Date.now() };
    
    // Recalculate trend from last 4 readings
    const readings = await this.state.storage.list<EnergyState>({ prefix: 'energy:', limit: 3 });
    // Map to expected format with ts field
    const trendReadings = [...Array.from(readings.values()), updated].map(e => ({
      spoons: e.spoons,
      ts: e.lastUpdate
    }));
    updated.trend = calculateEnergyTrend(trendReadings);

    await this.state.storage.put('energy:current', updated);
    await this.state.storage.put(`energy:${Date.now()}`, updated);

    // Notify hubs of energy change
    await this.env.K4_HUBS.post('/hub/energy-voltage', {
      type: 'energy-update',
      payload: { energy: updated }
    });

    return Response.json(updated);
  }

  private async submitBioReading(reading: Omit<BioReading, 'ts'>): Promise<Response> {
    const bioReading: BioReading = {
      ...reading,
      ts: Date.now(),
    };

    await this.state.storage.put(`bio:${Date.now()}`, bioReading);

    // Check for critical calcium levels
    if (reading.type === 'calcium_serum' && reading.value < 7.6) {
      // Auto-activate Fortress Mode via hub
      await this.env.K4_HUBS.post('/hub/energy-voltage', {
        type: 'bio-alert',
        payload: { bioAlert: bioReading }
      });
    }

    // Add to timeline via hub A->C
    await this.env.K4_HUBS.post('/hub/energy-context', {
      type: 'bio-event',
      payload: { bioEvent: bioReading }
    });

    return Response.json(bioReading, { status: 201 });
  }

  private async getReminders(): Promise<Response> {
    const reminders = await this.state.storage.list<MedicationReminder>({ prefix: 'med:' });
    return Response.json(Array.from(reminders.values()));
  }

  private async createReminder(reminder: Omit<MedicationReminder, 'id'>): Promise<Response> {
    const id = crypto.randomUUID();
    const newReminder: MedicationReminder = { ...reminder, id: parseInt(id) } as any;
    await this.state.storage.put(`med:${id}`, newReminder);
    return Response.json(newReminder, { status: 201 });
  }

  private async getCognitiveLoad(): Promise<Response> {
    const bio = await this.state.storage.list<BioReading>({ prefix: 'bio:', limit: 10 });
    const energy = await this.state.storage.get<EnergyState>('energy:current');
    
    // Get message count from SignalProcessor via hub
    const messageCount = 0; // Would be fetched via hub query
    
    const load = calculateCognitiveLoad(
      Array.from(bio.values()),
      messageCount
    );

    return Response.json(load);
  }
}

export default OperatorStateDO;
