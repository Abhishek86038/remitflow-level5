import { Contract, rpc, TransactionBuilder, Networks, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { signTx } from './wallet';

// These should be updated after real deployment
export const ESCROW_CONTRACT_ID = 'CDJI52VFGP3EH7UKE6FMO76VHFRRGAPZ23HVLUNFSZX6DUJJB7R2CK4U'; // Deployed Testnet Contract ID
const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

export const deposit = async (senderAddress, recipientAddress, amount) => {
    try {
        const contract = new Contract(ESCROW_CONTRACT_ID);
        const txBuilder = await buildTransaction(senderAddress);
        
        const tx = txBuilder
            .addOperation(contract.call('deposit',
                nativeToScVal(senderAddress, { type: 'address' }),
                nativeToScVal(recipientAddress, { type: 'address' }),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();
            
        // First simulate to check compliance
        let simulated;
        try {
            simulated = await rpcServer.simulateTransaction(tx);
        } catch (simError) {
            console.error("simulateTransaction completely failed:", simError);
            throw new Error(`RPC simulation crashed: ${simError.message}. Check if your address has sufficient XLM or if limit is exceeded.`);
        }
        if (rpc.Api.isSimulationError(simulated)) {
            throw new Error(simulated.error);
        }
        if (!simulated.result) {
            console.error("Simulation failed without result:", JSON.stringify(simulated, null, 2));
            throw new Error("🚨 SIMULATION FAILED: 'simulated.result' is undefined! Please Hard Refresh the page.");
        }

        const assembledTx = rpc.assembleTransaction(tx, simulated).build();
        const signedTxXdr = await signTx(assembledTx.toXDR(), senderAddress);
        
        const response = await rpcServer.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase));
        
        if (response.status === 'ERROR') {
            throw new Error('Transaction submission failed');
        }

        let status = 'PENDING';
        let txResult;
        
        // Wait for confirmation
        for(let i = 0; i < 10; i++) {
            txResult = await rpcServer.getTransaction(response.hash);
            if (txResult.status !== 'NOT_FOUND') {
                status = txResult.status;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (status === 'SUCCESS') {
            // Get transfer ID from events if we could parse it, 
            // for simplicity we'll just return success
            return { success: true, hash: response.hash };
        } else {
            throw new Error(`Transaction ${status}`);
        }
    } catch (e) {
        throw new Error(e.message || 'Deposit failed');
    }
};

export const releaseFunds = async (recipientAddress, transferId) => {
    try {
        const contract = new Contract(ESCROW_CONTRACT_ID);
        const txBuilder = await buildTransaction(recipientAddress);
        
        const tx = txBuilder
            .addOperation(contract.call('release_funds',
                nativeToScVal(recipientAddress, { type: 'address' }),
                nativeToScVal(transferId, { type: 'u64' })
            ))
            .setTimeout(30)
            .build();
            
        let simulated;
        try {
            simulated = await rpcServer.simulateTransaction(tx);
        } catch (simError) {
            throw new Error(`RPC simulation crashed: ${simError.message}`);
        }
        if (rpc.Api.isSimulationError(simulated)) {
            throw new Error(simulated.error);
        }
        if (!simulated.result) {
            console.error("Simulation failed without result:", JSON.stringify(simulated, null, 2));
            throw new Error("🚨 SIMULATION FAILED: 'simulated.result' is undefined! Please Hard Refresh the page.");
        }

        const assembledTx = rpc.assembleTransaction(tx, simulated).build();
        const signedTxXdr = await signTx(assembledTx.toXDR(), recipientAddress);
        
        const response = await rpcServer.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase));
        return { success: true, hash: response.hash };
    } catch (e) {
        throw new Error(e.message || 'Release failed');
    }
};

export const getTransferStatus = async (senderAddress, transferId) => {
    try {
        const contract = new Contract(ESCROW_CONTRACT_ID);
        const txBuilder = await buildTransaction(senderAddress || 'GDXKETAZIUWTNK7NP5VKR2JVXWUQDTRVG46YQDUBLFCL24UTR5PVAEPL');
        
        const tx = txBuilder
            .addOperation(contract.call('get_transfer_status',
                nativeToScVal(transferId, { type: 'u64' })
            ))
            .setTimeout(30)
            .build();
            
        const simulated = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulated)) return null;
        
        return scValToNative(simulated.result.retval).toString();
    } catch (e) {
        return null;
    }
};

export const getTransferHistory = async (address) => {
    if (!address) return [];
    try {
        const contract = new Contract(ESCROW_CONTRACT_ID);
        const txBuilder = await buildTransaction(address);
        
        const tx = txBuilder
            .addOperation(contract.call('get_transfer_history',
                nativeToScVal(address, { type: 'address' })
            ))
            .setTimeout(30)
            .build();
            
        const simulated = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulated)) return [];
        
        const history = scValToNative(simulated.result.retval);
        return history.map(item => ({
            id: Number(item.id),
            sender: item.sender.toString(),
            recipient: item.recipient.toString(),
            amount: Number(item.amount),
            status: item.status.toString() === '0' ? 'Pending' : 'Released'
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
};

async function buildTransaction(sourceAddress) {
    const account = await rpcServer.getAccount(sourceAddress);
    return new TransactionBuilder(account, { fee: '10000', networkPassphrase });
}
