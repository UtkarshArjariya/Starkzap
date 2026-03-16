#[feature("deprecated_legacy_map")]

#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: starknet::ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: starknet::ContractAddress,
        recipient: starknet::ContractAddress,
        amount: u256,
    ) -> bool;
}

#[starknet::interface]
trait IDareBoard<TContractState> {
    fn create_dare(
        ref self: TContractState,
        title: felt252,
        description: ByteArray,
        reward_token: starknet::ContractAddress,
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
    fn has_voter_voted(
        self: @TContractState, dare_id: u64, voter: starknet::ContractAddress,
    ) -> bool;
}

#[allow(starknet::store_no_default_variant)]
#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
enum DareStatus {
    Open,
    Claimed,
    Voting,
    Approved,
    Rejected,
    Expired,
}

#[derive(Drop, Serde, starknet::Store)]
struct Dare {
    id: u64,
    poster: starknet::ContractAddress,
    title: felt252,
    description: ByteArray,
    reward_token: starknet::ContractAddress,
    reward_amount: u256,
    deadline: u64,
    claimer: starknet::ContractAddress,
    proof_url: ByteArray,
    proof_description: ByteArray,
    proof_submitted_at: u64,
    voting_end: u64,
    approve_votes: u64,
    reject_votes: u64,
    status: DareStatus,
}

#[starknet::contract]
mod DareBoard {
    use super::{Dare, DareStatus, IDareBoard, IERC20Dispatcher, IERC20DispatcherTrait};
    use core::traits::TryInto;
    use starknet::storage::{
        StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{
        ContractAddress, get_block_timestamp, get_caller_address, get_contract_address,
    };

    const MINIMUM_LEAD_TIME: u64 = 3600_u64;
    const VOTING_WINDOW: u64 = 86400_u64;

    #[storage]
    struct Storage {
        dares: LegacyMap<u64, Dare>,
        dare_count: u64,
        has_voted: LegacyMap<(u64, ContractAddress), bool>,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        DareCreated: DareCreated,
        DareClaimed: DareClaimed,
        ProofSubmitted: ProofSubmitted,
        VoteCast: VoteCast,
        DareFinalized: DareFinalized,
    }

    #[derive(Drop, starknet::Event)]
    struct DareCreated {
        dare_id: u64,
        poster: ContractAddress,
        reward_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct DareClaimed {
        dare_id: u64,
        claimer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ProofSubmitted {
        dare_id: u64,
        claimer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct VoteCast {
        dare_id: u64,
        voter: ContractAddress,
        approve: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct DareFinalized {
        dare_id: u64,
        status: DareStatus,
        winner: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.dare_count.write(0_u64);
    }

    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
    }

    fn assert_dare_exists(self: @ContractState, dare_id: u64) {
        let total = self.dare_count.read();
        assert(dare_id > 0_u64 && dare_id <= total, 'dare_not_found');
    }

    fn transfer_reward(token_address: ContractAddress, recipient: ContractAddress, amount: u256) {
        let token = IERC20Dispatcher { contract_address: token_address };
        let success = token.transfer(recipient, amount);
        assert(success, 'reward_transfer_failed');
    }

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
            assert(deadline > now + MINIMUM_LEAD_TIME, 'deadline_too_soon');

            let token = IERC20Dispatcher { contract_address: reward_token };
            let success = token.transfer_from(caller, get_contract_address(), reward_amount);
            assert(success, 'reward_lock_failed');

            let next_id = self.dare_count.read() + 1_u64;
            self.dare_count.write(next_id);

            self.dares.write(
                next_id,
                Dare {
                    id: next_id,
                    poster: caller,
                    title,
                    description,
                    reward_token,
                    reward_amount,
                    deadline,
                    claimer: zero_address(),
                    proof_url: "",
                    proof_description: "",
                    proof_submitted_at: 0_u64,
                    voting_end: 0_u64,
                    approve_votes: 0_u64,
                    reject_votes: 0_u64,
                    status: DareStatus::Open,
                },
            );

            self.emit(
                Event::DareCreated(
                    DareCreated { dare_id: next_id, poster: caller, reward_amount },
                ),
            );

            next_id
        }

        fn claim_dare(ref self: ContractState, dare_id: u64) {
            assert_dare_exists(@self, dare_id);

            let caller = get_caller_address();
            let now = get_block_timestamp();
            let dare = self.dares.read(dare_id);

            assert(dare.status == DareStatus::Open, 'dare_not_open');
            assert(caller != dare.poster, 'poster_cannot_claim');
            assert(now < dare.deadline, 'deadline_passed');

            self.dares.write(
                dare_id,
                Dare {
                    id: dare.id,
                    poster: dare.poster,
                    title: dare.title,
                    description: dare.description,
                    reward_token: dare.reward_token,
                    reward_amount: dare.reward_amount,
                    deadline: dare.deadline,
                    claimer: caller,
                    proof_url: dare.proof_url,
                    proof_description: dare.proof_description,
                    proof_submitted_at: dare.proof_submitted_at,
                    voting_end: dare.voting_end,
                    approve_votes: dare.approve_votes,
                    reject_votes: dare.reject_votes,
                    status: DareStatus::Claimed,
                },
            );

            self.emit(Event::DareClaimed(DareClaimed { dare_id, claimer: caller }));
        }

        fn submit_proof(
            ref self: ContractState,
            dare_id: u64,
            proof_url: ByteArray,
            proof_description: ByteArray,
        ) {
            assert_dare_exists(@self, dare_id);

            let caller = get_caller_address();
            let now = get_block_timestamp();
            let dare = self.dares.read(dare_id);

            assert(dare.status == DareStatus::Claimed, 'dare_not_claimed');
            assert(caller == dare.claimer, 'only_claimer');

            self.dares.write(
                dare_id,
                Dare {
                    id: dare.id,
                    poster: dare.poster,
                    title: dare.title,
                    description: dare.description,
                    reward_token: dare.reward_token,
                    reward_amount: dare.reward_amount,
                    deadline: dare.deadline,
                    claimer: dare.claimer,
                    proof_url,
                    proof_description,
                    proof_submitted_at: now,
                    voting_end: now + VOTING_WINDOW,
                    approve_votes: dare.approve_votes,
                    reject_votes: dare.reject_votes,
                    status: DareStatus::Voting,
                },
            );

            self.emit(Event::ProofSubmitted(ProofSubmitted { dare_id, claimer: caller }));
        }

        fn cast_vote(ref self: ContractState, dare_id: u64, approve: bool) {
            assert_dare_exists(@self, dare_id);

            let caller = get_caller_address();
            let now = get_block_timestamp();
            let dare = self.dares.read(dare_id);

            assert(dare.status == DareStatus::Voting, 'voting_not_open');
            assert(now < dare.voting_end, 'voting_closed');
            assert(caller != dare.claimer, 'claimer_cannot_vote');
            assert(!self.has_voted.read((dare_id, caller)), 'already_voted');

            self.has_voted.write((dare_id, caller), true);

            let approve_votes = if approve {
                dare.approve_votes + 1_u64
            } else {
                dare.approve_votes
            };
            let reject_votes = if approve {
                dare.reject_votes
            } else {
                dare.reject_votes + 1_u64
            };

            self.dares.write(
                dare_id,
                Dare {
                    id: dare.id,
                    poster: dare.poster,
                    title: dare.title,
                    description: dare.description,
                    reward_token: dare.reward_token,
                    reward_amount: dare.reward_amount,
                    deadline: dare.deadline,
                    claimer: dare.claimer,
                    proof_url: dare.proof_url,
                    proof_description: dare.proof_description,
                    proof_submitted_at: dare.proof_submitted_at,
                    voting_end: dare.voting_end,
                    approve_votes,
                    reject_votes,
                    status: dare.status,
                },
            );

            self.emit(Event::VoteCast(VoteCast { dare_id, voter: caller, approve }));
        }

        fn finalize_dare(ref self: ContractState, dare_id: u64) {
            assert_dare_exists(@self, dare_id);

            let now = get_block_timestamp();
            let dare = self.dares.read(dare_id);

            if dare.status == DareStatus::Voting {
                assert(now >= dare.voting_end, 'voting_still_open');

                if dare.approve_votes > dare.reject_votes {
                    transfer_reward(dare.reward_token, dare.claimer, dare.reward_amount);
                    self.dares.write(
                        dare_id,
                        Dare {
                            id: dare.id,
                            poster: dare.poster,
                            title: dare.title,
                            description: dare.description,
                            reward_token: dare.reward_token,
                            reward_amount: dare.reward_amount,
                            deadline: dare.deadline,
                            claimer: dare.claimer,
                            proof_url: dare.proof_url,
                            proof_description: dare.proof_description,
                            proof_submitted_at: dare.proof_submitted_at,
                            voting_end: dare.voting_end,
                            approve_votes: dare.approve_votes,
                            reject_votes: dare.reject_votes,
                            status: DareStatus::Approved,
                        },
                    );
                    self.emit(
                        Event::DareFinalized(
                            DareFinalized {
                                dare_id,
                                status: DareStatus::Approved,
                                winner: dare.claimer,
                            },
                        ),
                    );
                } else {
                    transfer_reward(dare.reward_token, dare.poster, dare.reward_amount);
                    self.dares.write(
                        dare_id,
                        Dare {
                            id: dare.id,
                            poster: dare.poster,
                            title: dare.title,
                            description: dare.description,
                            reward_token: dare.reward_token,
                            reward_amount: dare.reward_amount,
                            deadline: dare.deadline,
                            claimer: dare.claimer,
                            proof_url: dare.proof_url,
                            proof_description: dare.proof_description,
                            proof_submitted_at: dare.proof_submitted_at,
                            voting_end: dare.voting_end,
                            approve_votes: dare.approve_votes,
                            reject_votes: dare.reject_votes,
                            status: DareStatus::Rejected,
                        },
                    );
                    self.emit(
                        Event::DareFinalized(
                            DareFinalized {
                                dare_id,
                                status: DareStatus::Rejected,
                                winner: dare.poster,
                            },
                        ),
                    );
                };
                return;
            }

            if dare.status == DareStatus::Claimed || dare.status == DareStatus::Open {
                assert(now > dare.deadline, 'deadline_not_passed');
                transfer_reward(dare.reward_token, dare.poster, dare.reward_amount);
                self.dares.write(
                    dare_id,
                    Dare {
                        id: dare.id,
                        poster: dare.poster,
                        title: dare.title,
                        description: dare.description,
                        reward_token: dare.reward_token,
                        reward_amount: dare.reward_amount,
                        deadline: dare.deadline,
                        claimer: dare.claimer,
                        proof_url: dare.proof_url,
                        proof_description: dare.proof_description,
                        proof_submitted_at: dare.proof_submitted_at,
                        voting_end: dare.voting_end,
                        approve_votes: dare.approve_votes,
                        reject_votes: dare.reject_votes,
                        status: DareStatus::Expired,
                    },
                );
                self.emit(
                    Event::DareFinalized(
                        DareFinalized {
                            dare_id,
                            status: DareStatus::Expired,
                            winner: dare.poster,
                        },
                    ),
                );
                return;
            }

            assert(false, 'already_finalized');
        }

        fn get_dare(self: @ContractState, dare_id: u64) -> Dare {
            assert_dare_exists(self, dare_id);
            self.dares.read(dare_id)
        }

        fn get_dare_count(self: @ContractState) -> u64 {
            self.dare_count.read()
        }

        fn has_voter_voted(
            self: @ContractState, dare_id: u64, voter: ContractAddress,
        ) -> bool {
            assert_dare_exists(self, dare_id);
            self.has_voted.read((dare_id, voter))
        }
    }
}
