import React from 'react';
import { useResinWallet } from '../../shared/db/useResinWallet';

interface ResinWalletDisplayProps {
  franchiseId: string; // The ID of the franchise to display the wallet for
}

const ResinWalletDisplay: React.FC<ResinWalletDisplayProps> = ({ franchiseId }) => {
  const { balance, history } = useResinWallet(franchiseId);

  return (
    <div className="resin-wallet glass-panel p-4 rounded-lg shadow-lg flex items-center justify-between">
      <h2 className="text-lg font-bold">Resin Wallet</h2>
      <div className="text-2xl font-bold text-phos-green">{balance} 💧</div>
      {/* Optionally display recent history */}
      {/* <ul>
        {history.map(tx => (
          <li key={tx.id}>{tx.transactionType}: {tx.amount} ({tx.reason})</li>
        ))}
      </ul> */}
    </div>
  );
};

export default ResinWalletDisplay;
