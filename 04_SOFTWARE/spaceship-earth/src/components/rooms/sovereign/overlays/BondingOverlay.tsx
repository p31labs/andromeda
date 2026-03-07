// BondingOverlay — Full-screen iframe wrapper for BondingRoom.
// DO NOT alter iframe internals — UNTOUCHABLE per Georgia O.C.G.A. 24-9-901.

import { BondingRoom } from '../../BondingRoom';

interface Props {
  url: string;
}

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

export function BondingOverlay({ url }: Props) {
  return (
    <div style={fullScreen}>
      <BondingRoom url={url} />
    </div>
  );
}
