export class OrbitalDriftGame {
  constructor(_opts: {
    container: HTMLElement;
    playerId: string;
    isCoop: boolean;
    onScore: (points: number) => void;
    onCareFlow: (amount: number) => void;
  }) {}
  start(): void {}
  dispose(): void {}
  createCareBurst(): void {}
  setCoOpMode(_enabled: boolean): void {}
}
