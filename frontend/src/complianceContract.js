import { Contract, rpc, TransactionBuilder, Networks, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { signTx } from './wallet';

// These should be updated after real deployment
export const COMPLIANCE_CONTRACT_ID = 'CALNW7TNPWLDZKMWZDTVTDG4XEOOPFNCRVCNG5X64SVKZSGH462C3JIR'; // Deployed Testnet Contract ID
const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

export const checkCompliance = async (senderAddress, amount) => {
    try {
        const contract = new Contract(COMPLIANCE_CONTRACT_ID);
        const txBuilder = await buildTransaction(senderAddress);
        
        const tx = txBuilder
            .addOperation(contract.call('check_compliance',
                nativeToScVal(senderAddress, { type: 'address' }),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();
            
        const simulated = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulated)) {
            return false;
        }
        
        const result = scValToNative(simulated.result.retval);
        return result === true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const getLimit = async (senderAddress) => {
    try {
        const contract = new Contract(COMPLIANCE_CONTRACT_ID);
        // Using any address to simulate the read operation
        const txBuilder = await buildTransaction(senderAddress || 'GDXKETAZIUWTNK7NP5VKR2JVXWUQDTRVG46YQDUBLFCL24UTR5PVAEPL');
        
        const tx = txBuilder
            .addOperation(contract.call('get_limit'))
            .setTimeout(30)
            .build();
            
        const simulated = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulated)) {
            return 0;
        }
        
        return Number(scValToNative(simulated.result.retval)) / 10000000;
    } catch (e) {
        console.error("Error fetching limit", e);
        return 0;
    }
};

async function buildTransaction(sourceAddress) {
    const account = await rpcServer.getAccount(sourceAddress);
    return new TransactionBuilder(account, { fee: '10000', networkPassphrase });
}
