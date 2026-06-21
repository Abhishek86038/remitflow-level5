import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter';

export const kit = new StellarWalletsKit({
    network: Networks.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: [new FreighterModule()],
});

export const connectWallet = async () => {
    try {
        await kit.openModal({
            onWalletSelected: async (option) => {
                kit.setWallet(option.id);
            }
        });
        const publicKey = await kit.getPublicKey();
        return publicKey;
    } catch (e) {
        throw new Error('Failed to connect wallet');
    }
};

export const signTx = async (xdr, publicKey) => {
    try {
        const result = await kit.signTx({ xdr, publicKeys: [publicKey], network: Networks.TESTNET });
        return result.signedTxXdr;
    } catch (e) {
        throw new Error('Failed to sign transaction: ' + e.message);
    }
};
