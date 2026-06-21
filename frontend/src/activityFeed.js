import { rpc } from '@stellar/stellar-sdk';
import { ESCROW_CONTRACT_ID } from './escrowContract';

const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');

export const getRecentEvents = async () => {
    try {
        // Fetch events from the last ledger up to current
        // For a real app, you would track the last seen ledger and poll from there
        const latestLedger = await rpcServer.getLatestLedger();
        
        const response = await rpcServer.getEvents({
            startLedger: latestLedger.sequence - 100, // Last 100 ledgers
            filters: [
                {
                    type: 'contract',
                    contractIds: [ESCROW_CONTRACT_ID],
                }
            ],
            limit: 10,
        });

        if (!response.events) return [];

        return response.events.map(event => {
            // Simplify event parsing
            return {
                id: event.id,
                ledger: event.ledger,
                type: event.topic[0]?.toString() || 'Unknown',
                timestamp: new Date().toISOString() // We don't get timestamp directly from getEvents in this simplified version
            };
        });
    } catch (e) {
        console.error("Error fetching events", e);
        return [];
    }
};
