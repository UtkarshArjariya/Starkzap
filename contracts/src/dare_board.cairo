use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};

// ─── Minimal ERC20 interface (no OZ dependency needed) ───────────────────────
#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
    fn transfer(
        ref self: TContractState,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
}

// ─── Enums ────────────────────────────────────────────────────────────────────
#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum DareStatus {
    Open,      // 0 — awaiting claimer
    Claimed,   // 1 — claimer set, awaiting proof
    Voting,    // 2 — proof submitted, voting open
    Approved,  // 3 — reward sent to claimer
    Rejected,  // 4 — reward returned to poster
    Expired,   // 5 — deadline passed without valid claim
}

// ─── Structs ─────────────────────────────────────────────────────────────────
#[derive(Drop, Serde, starknet::Store)]
pub struct Dare {
    pub id: u64,
    pub poster: ContractAddress,
    pub title: felt252,               // max 31 ASCII chars
    pub description: ByteArray,
    pub reward_token: ContractAddress,
    pub reward_amount: u256,
    pub deadline: u64,                // Unix timestamp
    pub claimer: ContractAddress,
    pub proof_url: ByteArray,
    pub proof_description: ByteArray,
    pub proof_submitted_at: u64,
    pub voting_end: u64,              // proof_submitted_at + 86400
    pub approve_votes: u64,
    pub reject_votes: u64,
    pub status: DareStatus,
}

// ─── Interface ────────────────────────────────────────────────────────────────
#[starknet::interface]
pub trait IDareBoard<TContractState> {
    fn create_dare(
        ref self: TContractState,
        title: felt252,
        description: ByteArray,
        reward_token: ContractAddress,
        reward_amount: u256,
        deadline: u64,
    ) -> u64;

    fn claim_dare(ref self: TContractState, dare_id: u64);

    fn submit_proof(
        ref self: TContractState,
        dare_id: u64,
        proof_url: ByteArray,
        proof_description: ByteArray,
    );

    fn cast_vote(ref self: TContractState, dare_id: u64, approve: bool);

    fn finalize_dare(ref self: TContractState, dare_id: u64);

    fn get_dare(self: @TContractState, dare_id: u64) -> Dare;

    fn get_dare_count(self: @TContractState) -> u64;

    fn has_voter_voted(self: @TContractState, dare_id: u64, voter: ContractAddress) -> bool;
}

// ─── Contract ─────────────────────────────────────────────────────────────────
#[starknet::contract]
pub mod DareBoard {
    use super::{
        IDareBoard, Dare, DareStatus, IERC20Dispatcher, IERC20DispatcherTrait,
        ContractAddress, get_caller_address, get_contract_address, get_block_timestamp,
    };

    #[storage]
    struct Storage {
        dares: starknet::storage::Map::<u64, Dare>,
        dare_count: u64,
        has_voted: starknet::storage::Map::<(u64, ContractAddress), bool>,
        owner: ContractAddress,
    }

    // ─── Events ───────────────────────────────────────────────────────────────
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        DareCreated: DareCreated,
        DareClaimed: DareClaimed,
        ProofSubmitted: ProofSubmitted,
        VoteCast: VoteCast,
        DareFinalized: DareFinalized,
    }

    #[derive(Drop, starknet::Event)]
    struct DareCreated {
        #[key] dare_id: u64,
        poster: ContractAddress,
        reward_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct DareClaimed {
        #[key] dare_id: u64,
        claimer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ProofSubmitted {
        #[key] dare_id: u64,
        claimer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct VoteCast {
        #[key] dare_id: u64,
        voter: ContractAddress,
        approve: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct DareFinalized {
        #[key] dare_id: u64,
        status: DareStatus,
        winner: ContractAddress,
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.dare_count.write(0);
    }

    // ─── Implementation ───────────────────────────────────────────────────────
    #[abi(embed_v0)]
    impl DareBoardImpl of IDareBoard<ContractState> {

        fn create_dare(
            ref self: ContractState,
            title: felt252,
            description: ByteArray,
            reward_token: ContractAddress,
            reward_amount: u256,
            deadline: u64,
        ) -> u64 {
            let caller = get_caller_address();
            let now = get_block_timestamp();
            assert(deadline > now + 3600, 'Deadline too soon');
            assert(reward_amount > 0_u256, 'Reward must be > 0');

            // Pull reward tokens from caller into escrow
            let token = IERC20Dispatcher { contract_address: reward_token };
            token.transfer_from(caller, get_contract_address(), reward_amount);

            let count = self.dare_count.read();
            let new_id = count + 1;

            let zero_addr: ContractAddress = 0.try_into().unwrap();
            let dare = Dare {
                id: new_id,
                poster: caller,
                title,
                description,
                reward_token,
                reward_amount,
                deadline,
                claimer: zero_addr,
                proof_url: "",
                proof_description: "",
                proof_submitted_at: 0,
                voting_end: 0,
                approve_votes: 0,
                reject_votes: 0,
                status: DareStatus::Open,
            };

            self.dares.write(new_id, dare);
            self.dare_count.write(new_id);

            self.emit(DareCreated { dare_id: new_id, poster: caller, reward_amount });
            new_id
        }

        fn claim_dare(ref self: ContractState, dare_id: u64) {
            let caller = get_caller_address();
            let mut dare = self.dares.read(dare_id);
            assert(dare.status == DareStatus::Open, 'Dare not open');
            assert(caller != dare.poster, 'Poster cannot claim');
            assert(get_block_timestamp() < dare.deadline, 'Dare expired');

            dare.claimer = caller;
            dare.status = DareStatus::Claimed;
            self.dares.write(dare_id, dare);
            self.emit(DareClaimed { dare_id, claimer: caller });
        }

        fn submit_proof(
            ref self: ContractState,
            dare_id: u64,
            proof_url: ByteArray,
            proof_description: ByteArray,
        ) {
            let caller = get_caller_address();
            let mut dare = self.dares.read(dare_id);
            assert(dare.status == DareStatus::Claimed, 'Dare not claimed');
            assert(caller == dare.claimer, 'Not the claimer');

            let now = get_block_timestamp();
            dare.proof_url = proof_url;
            dare.proof_description = proof_description;
            dare.proof_submitted_at = now;
            dare.voting_end = now + 86400; // 24h
            dare.status = DareStatus::Voting;
            self.dares.write(dare_id, dare);
            self.emit(ProofSubmitted { dare_id, claimer: caller });
        }

        fn cast_vote(ref self: ContractState, dare_id: u64, approve: bool) {
            let caller = get_caller_address();
            let mut dare = self.dares.read(dare_id);
            assert(dare.status == DareStatus::Voting, 'Not in voting');
            assert(get_block_timestamp() < dare.voting_end, 'Voting closed');
            assert(caller != dare.poster, 'Poster cannot vote');
            assert(caller != dare.claimer, 'Claimer cannot vote');
            assert(!self.has_voted.read((dare_id, caller)), 'Already voted');

            self.has_voted.write((dare_id, caller), true);
            if approve {
                dare.approve_votes += 1;
            } else {
                dare.reject_votes += 1;
            }
            self.dares.write(dare_id, dare);
            self.emit(VoteCast { dare_id, voter: caller, approve });
        }

        fn finalize_dare(ref self: ContractState, dare_id: u64) {
            let mut dare = self.dares.read(dare_id);
            let now = get_block_timestamp();
            let token = IERC20Dispatcher { contract_address: dare.reward_token };
            let zero_addr: ContractAddress = 0.try_into().unwrap();

            if dare.status == DareStatus::Voting && now >= dare.voting_end {
                if dare.approve_votes > dare.reject_votes {
                    // Send reward to claimer
                    token.transfer(dare.claimer, dare.reward_amount);
                    dare.status = DareStatus::Approved;
                    let winner = dare.claimer;
                    self.dares.write(dare_id, dare);
                    self.emit(DareFinalized { dare_id, status: DareStatus::Approved, winner });
                } else {
                    // Return reward to poster
                    token.transfer(dare.poster, dare.reward_amount);
                    dare.status = DareStatus::Rejected;
                    let winner = dare.poster;
                    self.dares.write(dare_id, dare);
                    self.emit(DareFinalized { dare_id, status: DareStatus::Rejected, winner });
                }
            } else if (dare.status == DareStatus::Claimed || dare.status == DareStatus::Open)
                && now > dare.deadline
            {
                // Return to poster — expired
                token.transfer(dare.poster, dare.reward_amount);
                dare.status = DareStatus::Expired;
                let winner = zero_addr;
                self.dares.write(dare_id, dare);
                self.emit(DareFinalized { dare_id, status: DareStatus::Expired, winner });
            } else {
                assert(false, 'Cannot finalize yet');
            }
        }

        fn get_dare(self: @ContractState, dare_id: u64) -> Dare {
            self.dares.read(dare_id)
        }

        fn get_dare_count(self: @ContractState) -> u64 {
            self.dare_count.read()
        }

        fn has_voter_voted(
            self: @ContractState, dare_id: u64, voter: ContractAddress,
        ) -> bool {
            self.has_voted.read((dare_id, voter))
        }
    }
}
