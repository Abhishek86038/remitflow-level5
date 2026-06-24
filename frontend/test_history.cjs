const { Contract, rpc, TransactionBuilder, Networks, nativeToScVal, scValToNative } = require('@stellar/stellar-sdk');

const ESCROW_CONTRACT_ID = 'CDJI52VFGP3EH7UKE6FMO76VHFRRGAPZ23HVLUNFSZX6DUJJB7R2CK4U';
const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

async function queryHistory(address) {
    try {
        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAddress = 'GDXKETAZIUWTNK7NP5VKR2JVXWUQDTRVG46YQDUBLFCL24UTR5PVAEPL';
        const account = await rpcServer.getAccount(sourceAddress);
        const txBuilder = new TransactionBuilder(account, { fee: '10000', networkPassphrase });
        
        const tx = txBuilder
            .addOperation(contract.call('get_transfer_history',
                nativeToScVal(address, { type: 'address' })
            ))
            .setTimeout(30)
            .build();
            
        const simulated = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulated)) {
            console.error("Simulation error for address:", address, simulated.error);
            return null;
        }
        return scValToNative(simulated.result.retval);
    } catch (e) {
        console.error("Error for address:", address, e.message);
        return null;
    }
}

function stringify(obj) {
    return JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
}

async function run() {
    console.log("Checking history for actual sender...");
    const sender = 'GDXKETAZIUWTNK7NP5VKR2JVXWUQDTRVG46YQDUBLFCL24UTR5PVAEPL';
    const historySender = await queryHistory(sender);
    console.log(`History for ${sender}:`, stringify(historySender));

    console.log("\nChecking history for a random address...");
    const randomAddress = 'GDPR767JXKB6M5KIMXAMNGAG2QTTSWHQ6X2JPXK6P74Y2RDSIHUUIABA';
    const historyRandom = await queryHistory(randomAddress);
    console.log(`History for ${randomAddress}:`, stringify(historyRandom));
}

run();
