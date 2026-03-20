use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
use starknet::storage::{
    StoragePointerReadAccess, StoragePointerWriteAccess,
    StorageMapReadAccess, StorageMapWriteAccess,
    StoragePathEntry,
    Map,
};

// ─── Minimal ERC20 interface ──────────────────────────────────────────────────
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

// ─── Status enum ─────────────────────────────────────────────────────────────
#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum DareStatus {
    Open,
    Claimed,
    Voting,
    Approved,
    Rejected,
    Expired,
}

// ─── View struct (returned by get_dare, never stored directly) ────────────────
#[derive(Drop, Serde)]
pub struct Dare {
    pub id: u64,
    pub poster: ContractAddress,
    pub title: felt252,
    pub description: ByteArray,
    pub reward_token: ContractAddress,
    pub reward_amount: u256,
    pub deadline: u64,
    pub claimer: ContractAddress,
    pub proof_url: ByteArray,
    pub proof_description: ByteArray,
    pub proof_submitted_at: u64,
    pub voting_end: u64,
    pub approve_votes: u64,
    pub reject_votes: u64,
    pub status: DareStatus,
}

// ─── Storage node for per-dare data ──────────────────────────────────────────
#[starknet::storage_node]
pub struct DareNode {
    poster:             ContractAddress,
    title:              felt252,
    description:        ByteArray,
    reward_token:       ContractAddress,
    reward_amount:      u256,
    deadline:           u64,
    claimer:            ContractAddress,
    proof_url:          ByteArray,
    proof_description:  ByteArray,
    proof_submitted_at: u64,
    voting_end:         u64,
    approve_votes:      u64,
    reject_votes:       u64,
    status:             DareStatus,
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
    fn cancel_dare(ref self: TContractState, dare_id: u64);
    fn delist_dare(ref self: TContractState, dare_id: u64);
    fn relist_dare(ref self: TContractState, dare_id: u64);
    fn get_dare(self: @TContractState, dare_id: u64) -> Dare;
    fn get_dare_count(self: @TContractState) -> u64;
    fn has_voter_voted(self: @TContractState, dare_id: u64, voter: ContractAddress) -> bool;
    fn is_delisted(self: @TContractState, dare_id: u64) -> bool;
    fn get_treasury(self: @TContractState) -> ContractAddress;
    fn get_owner(self: @TContractState) -> ContractAddress;
}

// ─── Contract ─────────────────────────────────────────────────────────────────
#[starknet::contract]
pub mod DareBoard {
    use super::{
        IDareBoard, Dare, DareNode, DareStatus,
        IERC20Dispatcher, IERC20DispatcherTrait,
        ContractAddress, get_caller_address, get_contract_address, get_block_timestamp,
        StoragePointerReadAccess, StoragePointerWriteAccess,
        StorageMapReadAccess, StorageMapWriteAccess,
        StoragePathEntry,
        Map,
    };

    #[storage]
    struct Storage {
        dare_count: u64,
        owner: ContractAddress,
        treasury: ContractAddress,
        dares: Map<u64, DareNode>,
        has_voted: Map<(u64, ContractAddress), bool>,
        delisted: Map<u64, bool>,
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
        FeeCollected: FeeCollected,
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
    #[derive(Drop, starknet::Event)]
    struct FeeCollected {
        #[key] dare_id: u64,
        fee_type: felt252,
        amount: u256,
        token: ContractAddress,
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, treasury: ContractAddress) {
        self.owner.write(owner);
        self.treasury.write(treasury);
        self.dare_count.write(0);
    }

    // ─── Constants ─────────────────────────────────────────────────────────────
    const MIN_VOTES_TO_FINALIZE: u64 = 3;
    const FEE_PERCENT: u256 = 100; // 1% fee = divide by 100

    // ─── Helpers ──────────────────────────────────────────────────────────────
    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
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
            let now    = get_block_timestamp();
            assert(deadline > now + 3600, 'Deadline too soon');
            assert(reward_amount > 0_u256, 'Reward must be > 0');

            // Pull full reward from poster into contract
            let token = IERC20Dispatcher { contract_address: reward_token };
            assert(token.transfer_from(caller, get_contract_address(), reward_amount), 'Transfer failed');

            // Deduct 1% creation fee and send to treasury
            let creation_fee = reward_amount / FEE_PERCENT;
            let escrowed = reward_amount - creation_fee;
            let treasury = self.treasury.read();
            if creation_fee > 0_u256 {
                assert(token.transfer(treasury, creation_fee), 'Fee transfer failed');
            }

            let count  = self.dare_count.read();
            let new_id = count + 1;

            let d = self.dares.entry(new_id);
            d.poster.write(caller);
            d.title.write(title);
            d.description.write(description);
            d.reward_token.write(reward_token);
            d.reward_amount.write(escrowed); // store net amount after fee
            d.deadline.write(deadline);
            d.claimer.write(zero_address());
            d.proof_url.write("");
            d.proof_description.write("");
            d.proof_submitted_at.write(0);
            d.voting_end.write(0);
            d.approve_votes.write(0);
            d.reject_votes.write(0);
            d.status.write(DareStatus::Open);

            self.dare_count.write(new_id);
            self.emit(DareCreated { dare_id: new_id, poster: caller, reward_amount: escrowed });
            self.emit(FeeCollected { dare_id: new_id, fee_type: 'creation', amount: creation_fee, token: reward_token });
            new_id
        }

        fn claim_dare(ref self: ContractState, dare_id: u64) {
            let caller = get_caller_address();
            let d      = self.dares.entry(dare_id);
            assert(d.status.read() == DareStatus::Open, 'Dare not open');
            assert(caller != d.poster.read(), 'Poster cannot claim');
            assert(get_block_timestamp() < d.deadline.read(), 'Dare expired');

            d.claimer.write(caller);
            d.status.write(DareStatus::Claimed);
            self.emit(DareClaimed { dare_id, claimer: caller });
        }

        fn submit_proof(
            ref self: ContractState,
            dare_id: u64,
            proof_url: ByteArray,
            proof_description: ByteArray,
        ) {
            let caller = get_caller_address();
            let d      = self.dares.entry(dare_id);
            assert(d.status.read() == DareStatus::Claimed, 'Dare not claimed');
            assert(caller == d.claimer.read(), 'Not the claimer');

            let now = get_block_timestamp();
            d.proof_url.write(proof_url);
            d.proof_description.write(proof_description);
            d.proof_submitted_at.write(now);
            d.voting_end.write(now + 86400_u64);
            d.status.write(DareStatus::Voting);
            self.emit(ProofSubmitted { dare_id, claimer: caller });
        }

        fn cast_vote(ref self: ContractState, dare_id: u64, approve: bool) {
            let caller = get_caller_address();
            let d      = self.dares.entry(dare_id);
            assert(d.status.read() == DareStatus::Voting, 'Not in voting');
            assert(get_block_timestamp() < d.voting_end.read(), 'Voting closed');
            assert(caller != d.poster.read(), 'Poster cannot vote');
            assert(caller != d.claimer.read(), 'Claimer cannot vote');
            assert(!self.has_voted.read((dare_id, caller)), 'Already voted');

            self.has_voted.write((dare_id, caller), true);
            if approve {
                d.approve_votes.write(d.approve_votes.read() + 1);
            } else {
                d.reject_votes.write(d.reject_votes.read() + 1);
            }
            self.emit(VoteCast { dare_id, voter: caller, approve });
        }

        fn finalize_dare(ref self: ContractState, dare_id: u64) {
            let d   = self.dares.entry(dare_id);
            let now = get_block_timestamp();
            let reward_token = d.reward_token.read();
            let token  = IERC20Dispatcher { contract_address: reward_token };
            let amount = d.reward_amount.read();
            let status = d.status.read();

            if status == DareStatus::Voting && now >= d.voting_end.read() {
                let total_votes = d.approve_votes.read() + d.reject_votes.read();

                if total_votes < MIN_VOTES_TO_FINALIZE {
                    // Insufficient community participation — refund poster (no claim fee)
                    let poster = d.poster.read();
                    d.status.write(DareStatus::Rejected);
                    assert(token.transfer(poster, amount), 'Transfer failed');
                    self.emit(DareFinalized { dare_id, status: DareStatus::Rejected, winner: poster });
                } else if d.approve_votes.read() > d.reject_votes.read() {
                    // Approved — deduct 1% claim fee, send rest to claimer
                    let claim_fee = amount / FEE_PERCENT;
                    let payout = amount - claim_fee;
                    let treasury = self.treasury.read();
                    let winner = d.claimer.read();
                    d.status.write(DareStatus::Approved);
                    if claim_fee > 0_u256 {
                        assert(token.transfer(treasury, claim_fee), 'Fee transfer failed');
                    }
                    assert(token.transfer(winner, payout), 'Transfer failed');
                    self.emit(DareFinalized { dare_id, status: DareStatus::Approved, winner });
                    self.emit(FeeCollected { dare_id, fee_type: 'claim', amount: claim_fee, token: reward_token });
                } else {
                    let poster = d.poster.read();
                    d.status.write(DareStatus::Rejected);
                    assert(token.transfer(poster, amount), 'Transfer failed');
                    self.emit(DareFinalized { dare_id, status: DareStatus::Rejected, winner: poster });
                }
            } else if (status == DareStatus::Claimed || status == DareStatus::Open)
                && now > d.deadline.read()
            {
                let poster = d.poster.read();
                d.status.write(DareStatus::Expired);
                assert(token.transfer(poster, amount), 'Transfer failed');
                self.emit(DareFinalized { dare_id, status: DareStatus::Expired, winner: zero_address() });
            } else {
                assert(false, 'Cannot finalize yet');
            }
        }

        fn cancel_dare(ref self: ContractState, dare_id: u64) {
            let caller = get_caller_address();
            let d      = self.dares.entry(dare_id);
            assert(d.status.read() == DareStatus::Open, 'Dare not open');
            assert(caller == d.poster.read(), 'Not the poster');

            let token  = IERC20Dispatcher { contract_address: d.reward_token.read() };
            let amount = d.reward_amount.read();
            let poster = d.poster.read();

            // Effects before interactions (checks-effects-interactions)
            d.status.write(DareStatus::Expired);

            // Transfer escrowed funds back to poster
            assert(token.transfer(poster, amount), 'Transfer failed');

            self.emit(DareFinalized { dare_id, status: DareStatus::Expired, winner: zero_address() });
        }

        fn get_dare(self: @ContractState, dare_id: u64) -> Dare {
            let d = self.dares.entry(dare_id);
            Dare {
                id:               dare_id,
                poster:           d.poster.read(),
                title:            d.title.read(),
                description:      d.description.read(),
                reward_token:     d.reward_token.read(),
                reward_amount:    d.reward_amount.read(),
                deadline:         d.deadline.read(),
                claimer:          d.claimer.read(),
                proof_url:        d.proof_url.read(),
                proof_description: d.proof_description.read(),
                proof_submitted_at: d.proof_submitted_at.read(),
                voting_end:       d.voting_end.read(),
                approve_votes:    d.approve_votes.read(),
                reject_votes:     d.reject_votes.read(),
                status:           d.status.read(),
            }
        }

        fn get_dare_count(self: @ContractState) -> u64 {
            self.dare_count.read()
        }

        fn has_voter_voted(
            self: @ContractState, dare_id: u64, voter: ContractAddress,
        ) -> bool {
            self.has_voted.read((dare_id, voter))
        }

        fn delist_dare(ref self: ContractState, dare_id: u64) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Not the owner');
            assert(dare_id >= 1 && dare_id <= self.dare_count.read(), 'Invalid dare id');
            self.delisted.write(dare_id, true);
        }

        fn relist_dare(ref self: ContractState, dare_id: u64) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Not the owner');
            assert(dare_id >= 1 && dare_id <= self.dare_count.read(), 'Invalid dare id');
            self.delisted.write(dare_id, false);
        }

        fn is_delisted(self: @ContractState, dare_id: u64) -> bool {
            self.delisted.read(dare_id)
        }

        fn get_treasury(self: @ContractState) -> ContractAddress {
            self.treasury.read()
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }
    }
}
