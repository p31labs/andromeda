import { audioEngine, hashTelemetry, exportLedgerJSON } from '@p31/shared/sovereign';
import { boot as bootIdentity } from '../services/genesisIdentity';
      const didKey = await bootIdentity();
      set({ didKey, ucanStatus: 'DELEGATION GRANTED (SE050 -> BROWSER)', isGeneratingIdentity: false });
