#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec, symbol_short, String, Symbol, IntoVal, token};

#[contracttype]
#[derive(Clone)]
pub enum TransferStatus {
    Pending,
    Released,
}

#[contracttype]
#[derive(Clone)]
pub struct Transfer {
    pub id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub amount: i128,
    pub status: TransferStatus,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    ComplianceContract,
    TokenContract,
    TransferCounter,
    TransferInfo(u64),      // Transfer details by ID
    UserTransfers(Address), // Vector of transfer IDs for a user
}

#[contract]
pub struct RemittanceEscrow;

#[contractimpl]
impl RemittanceEscrow {
    pub fn init(env: Env, compliance_contract: Address, token_contract: Address) {
        env.storage().instance().set(&DataKey::ComplianceContract, &compliance_contract);
        env.storage().instance().set(&DataKey::TokenContract, &token_contract);
        env.storage().instance().set(&DataKey::TransferCounter, &0u64);
    }

    pub fn deposit(env: Env, sender: Address, recipient: Address, amount: i128) {
        sender.require_auth();

        // Check compliance
        let compliance_contract: Address = env.storage().instance().get(&DataKey::ComplianceContract).unwrap();
        
        let is_compliant: bool = env.invoke_contract(
            &compliance_contract,
            &Symbol::new(&env, "check_compliance"),
            soroban_sdk::vec![&env, sender.into_val(&env), amount.into_val(&env)]
        );

        if !is_compliant {
            env.events().publish((symbol_short!("ComplRej"), sender.clone()), amount);
            panic!("Exceeds compliance limit");
        }

        // Lock funds into the contract
        let token_contract: Address = env.storage().instance().get(&DataKey::TokenContract).unwrap();
        let token_client = token::Client::new(&env, &token_contract);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        let mut counter: u64 = env.storage().instance().get(&DataKey::TransferCounter).unwrap();
        counter += 1;

        let transfer = Transfer {
            id: counter,
            sender: sender.clone(),
            recipient: recipient.clone(),
            amount,
            status: TransferStatus::Pending,
        };

        env.storage().persistent().set(&DataKey::TransferInfo(counter), &transfer);
        env.storage().instance().set(&DataKey::TransferCounter, &counter);

        // Update user transfers history for both sender and recipient
        Self::add_transfer_to_history(&env, sender.clone(), counter);
        if sender != recipient {
            Self::add_transfer_to_history(&env, recipient.clone(), counter);
        }

        env.events().publish(
            (symbol_short!("Deposit"), sender, recipient),
            (amount, String::from_str(&env, "pending"), counter)
        );
    }

    pub fn release_funds(env: Env, recipient: Address, transfer_id: u64) {
        // Only recipient can release for this simplified version, or an Anchor in future
        recipient.require_auth();

        let mut transfer: Transfer = env.storage().persistent().get(&DataKey::TransferInfo(transfer_id)).expect("Transfer not found");
        
        if transfer.recipient != recipient {
            panic!("Not authorized to release these funds");
        }
        
        match transfer.status {
            TransferStatus::Released => panic!("Funds already released"),
            TransferStatus::Pending => {
                transfer.status = TransferStatus::Released;
                env.storage().persistent().set(&DataKey::TransferInfo(transfer_id), &transfer);
                
                // Release funds from the contract to recipient
                let token_contract: Address = env.storage().instance().get(&DataKey::TokenContract).unwrap();
                let token_client = token::Client::new(&env, &token_contract);
                token_client.transfer(&env.current_contract_address(), &recipient, &transfer.amount);

                env.events().publish(
                    (symbol_short!("Release"), recipient),
                    transfer_id
                );
            }
        }
    }

    pub fn get_transfer_status(env: Env, transfer_id: u64) -> Symbol {
        let transfer: Transfer = env.storage().persistent().get(&DataKey::TransferInfo(transfer_id)).expect("Transfer not found");
        match transfer.status {
            TransferStatus::Pending => Symbol::new(&env, "pending"),
            TransferStatus::Released => Symbol::new(&env, "released"),
        }
    }

    pub fn get_transfer_history(env: Env, address: Address) -> Vec<Transfer> {
        let transfer_ids: Vec<u64> = env.storage().persistent().get(&DataKey::UserTransfers(address)).unwrap_or_else(|| Vec::new(&env));
        let mut transfers = Vec::new(&env);
        for id in transfer_ids.into_iter() {
            if let Some(t) = env.storage().persistent().get(&DataKey::TransferInfo(id)) {
                transfers.push_back(t);
            }
        }
        transfers
    }

    fn add_transfer_to_history(env: &Env, address: Address, transfer_id: u64) {
        let mut history: Vec<u64> = env.storage().persistent().get(&DataKey::UserTransfers(address.clone())).unwrap_or_else(|| Vec::new(env));
        history.push_back(transfer_id);
        env.storage().persistent().set(&DataKey::UserTransfers(address), &history);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, MockAuth, MockAuthInvoke}, Address, Env};
    
    mod compliance_contract {
        soroban_sdk::contractimport!(
            file = "../target/wasm32v1-none/release/compliance_check.wasm"
        );
    }

    #[contract]
    pub struct MockComplianceContract;

    #[contractimpl]
    impl MockComplianceContract {
        pub fn check_compliance(_env: Env, _sender: Address, amount: i128) -> bool {
            amount <= 1000
        }
    }

    #[test]
    fn test_deposit_locks_funds() {
        let env = Env::default();
        env.mock_all_auths();
        
        let compliance_id = env.register_contract(None, MockComplianceContract);
        let escrow_id = env.register_contract(None, RemittanceEscrow);
        let client = RemittanceEscrowClient::new(&env, &escrow_id);

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_admin_client = token::StellarAssetClient::new(&env, &token_id);
        token_admin_client.mint(&sender, &1000);
        
        client.init(&compliance_id, &token_id);
        client.deposit(&sender, &recipient, &500); // 500 <= 1000, should pass
        
        let status = client.get_transfer_status(&1);
        assert_eq!(status, Symbol::new(&env, "pending"));
        
        let history = client.get_transfer_history(&sender);
        assert_eq!(history.len(), 1);
        assert_eq!(history.get(0).unwrap().amount, 500);
    }
    
    #[test]
    #[should_panic(expected = "Exceeds compliance limit")]
    fn test_inter_contract_compliance_call_fail() {
        let env = Env::default();
        env.mock_all_auths();
        
        let compliance_id = env.register_contract(None, MockComplianceContract);
        let escrow_id = env.register_contract(None, RemittanceEscrow);
        let client = RemittanceEscrowClient::new(&env, &escrow_id);

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_admin_client = token::StellarAssetClient::new(&env, &token_id);
        token_admin_client.mint(&sender, &2000);
        
        client.init(&compliance_id, &token_id);
        client.deposit(&sender, &recipient, &1500); // Should fail
    }

    #[test]
    fn test_release_funds() {
        let env = Env::default();
        env.mock_all_auths();
        
        let compliance_id = env.register_contract(None, MockComplianceContract);
        let escrow_id = env.register_contract(None, RemittanceEscrow);
        let client = RemittanceEscrowClient::new(&env, &escrow_id);

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_admin_client = token::StellarAssetClient::new(&env, &token_id);
        token_admin_client.mint(&sender, &1000);
        
        client.init(&compliance_id, &token_id);
        client.deposit(&sender, &recipient, &500);
        
        client.release_funds(&recipient, &1);
        
        let status = client.get_transfer_status(&1);
        assert_eq!(status, Symbol::new(&env, "released"));
    }
}
