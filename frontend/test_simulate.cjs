const { Contract, rpc, TransactionBuilder, Networks, nativeToScVal } = require('@stellar/stellar-sdk');

const ESCROW_CONTRACT_ID = 'CDJI52VFGP3EH7UKE6FMO76VHFRRGAPZ23HVLUNFSZX6DUJJB7R2CK4U';
const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

async function run() {
    try {
        const senderAddress = 'GDXKETAZIUWTNK7NP5VKR2JVXWUQDTRVG46YQDUBLFCL24UTR5PVAEPL'; // admin
        const recipientAddress = 'GCHVOUEDXJRTXLUAZVBSFABIHUT636UAVL7ATZWWUBRO52RR7OP5CBI4';
        const amount = '5';

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const account = await rpcServer.getAccount(senderAddress);
        const txBuilder = new TransactionBuilder(account, { fee: '10000', networkPassphrase });
        
        const tx = txBuilder
            .addOperation(contract.call('deposit',
                nativeToScVal(senderAddress, { type: 'address' }),
                nativeToScVal(recipientAddress, { type: 'address' }),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();
            
        const simulated = await rpcServer.simulateTransaction(tx);
        console.log("Simulated Error:", rpc.Api.isSimulationError(simulated) ? simulated.error : "none");
        console.log("Has Result:", !!simulated.result);
        if (!simulated.result) {
            console.log("Full simulation:", JSON.stringify(simulated, null, 2));
        } else {
            console.log("Auth is defined:", !!simulated.result.auth);
        }
    } catch (e) {
        console.error("Caught error:", e);
    }
}
run();
