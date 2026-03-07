// SovereignRoom — Legacy wrapper. App.tsx now uses SovereignShell directly.
// Kept for RoomShell backward compatibility.
import { SovereignShell } from './SovereignShell';

export function SovereignRoom() {
  return <SovereignShell />;
}
