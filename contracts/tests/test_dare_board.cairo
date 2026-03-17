use starknet::ContractAddress;
use starknet::contract_address_const;

use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global,
};

use dare_board::dare_board::{IDareBoardDispatcher, IDareBoardDispatcherTrait, DareStatus};

// ─── Mock ERC20 ────────────────────────────────────────────────────────────────
// A minimal ERC20 that tracks balances + allowances and supports transfer/transfer_from.
#[starknet::contract]
mod MockERC20 {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        StorageMapReadAccess, StorageMapWriteAccess,
        Map,
    };

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl MockERC20Impl of dare_board::dare_board::IERC20<ContractState> {
        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            let allowance = self.allowances.read((sender, caller));
            assert(allowance >= amount, 'Insufficient allowance');
            self.allowances.write((sender, caller), allowance - amount);

            let sender_bal = self.balances.read(sender);
            assert(sender_bal >= amount, 'Insufficient balance');
            self.balances.write(sender, sender_bal - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }

        fn transfer(
            ref self: ContractState,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            let caller_bal = self.balances.read(caller);
            assert(caller_bal >= amount, 'Insufficient balance');
            self.balances.write(caller, caller_bal - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }
    }

    // Extra helpers (not part of IERC20 trait) to set up test state
    #[generate_trait]
    #[abi(per_item)]
    impl HelperImpl of HelperTrait {
        #[external(v0)]
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            self.balances.write(to, self.balances.read(to) + amount);
        }

        #[external(v0)]
        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            self.allowances.write((caller, spender), amount);
        }

        #[external(v0)]
        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }
    }
}

// ─── Helper interfaces for mock ERC20 extras ───────────────────────────────────
#[starknet::interface]
trait IMockERC20Helper<TContractState> {
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256);
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

// ─── Test addresses ────────────────────────────────────────────────────────────
fn OWNER() -> ContractAddress { contract_address_const::<'OWNER'>() }
fn POSTER() -> ContractAddress { contract_address_const::<'POSTER'>() }
fn CLAIMER() -> ContractAddress { contract_address_const::<'CLAIMER'>() }
fn VOTER1() -> ContractAddress { contract_address_const::<'VOTER1'>() }
fn VOTER2() -> ContractAddress { contract_address_const::<'VOTER2'>() }
fn VOTER3() -> ContractAddress { contract_address_const::<'VOTER3'>() }

const REWARD_AMOUNT: u256 = 1000000000000000000_u256; // 1e18
const NOW: u64 = 1000000;
const DEADLINE: u64 = 1000000 + 7200; // NOW + 2 hours (> 1 hour minimum)

// ─── Deploy helpers ────────────────────────────────────────────────────────────
fn deploy_mock_erc20() -> ContractAddress {
    let contract = declare("MockERC20").unwrap().contract_class();
    let (addr, _) = contract.deploy(@array![]).unwrap();
    addr
}

fn deploy_dare_board() -> ContractAddress {
    let contract = declare("DareBoard").unwrap().contract_class();
    let mut calldata = array![];
    OWNER().serialize(ref calldata);
    let (addr, _) = contract.deploy(@calldata).unwrap();
    addr
}

/// Sets up: deploys token + dare_board, mints tokens to poster, approves dare_board
fn setup() -> (IDareBoardDispatcher, ContractAddress, IMockERC20HelperDispatcher) {
    start_cheat_block_timestamp_global(NOW);

    let token_addr = deploy_mock_erc20();
    let board_addr = deploy_dare_board();

    let token = IMockERC20HelperDispatcher { contract_address: token_addr };
    let board = IDareBoardDispatcher { contract_address: board_addr };

    // Mint tokens to POSTER and approve dare board
    token.mint(POSTER(), REWARD_AMOUNT);
    start_cheat_caller_address(token_addr, POSTER());
    token.approve(board_addr, REWARD_AMOUNT);
    stop_cheat_caller_address(token_addr);

    (board, token_addr, token)
}

/// Creates a dare as POSTER and returns dare_id
fn create_default_dare(board: IDareBoardDispatcher, token_addr: ContractAddress) -> u64 {
    start_cheat_caller_address(board.contract_address, POSTER());
    let dare_id = board.create_dare(
        'Test Dare',
        "Do something cool",
        token_addr,
        REWARD_AMOUNT,
        DEADLINE,
    );
    stop_cheat_caller_address(board.contract_address);
    dare_id
}

/// Claims a dare as CLAIMER
fn claim_default_dare(board: IDareBoardDispatcher, dare_id: u64) {
    start_cheat_caller_address(board.contract_address, CLAIMER());
    board.claim_dare(dare_id);
    stop_cheat_caller_address(board.contract_address);
}

/// Submits proof as CLAIMER
fn submit_default_proof(board: IDareBoardDispatcher, dare_id: u64) {
    start_cheat_caller_address(board.contract_address, CLAIMER());
    board.submit_proof(dare_id, "https://proof.example.com", "I did the thing");
    stop_cheat_caller_address(board.contract_address);
}

/// Casts a vote from the given voter
fn vote(board: IDareBoardDispatcher, dare_id: u64, voter: ContractAddress, approve: bool) {
    start_cheat_caller_address(board.contract_address, voter);
    board.cast_vote(dare_id, approve);
    stop_cheat_caller_address(board.contract_address);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAPPY PATH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_create_dare_success() {
    let (board, token_addr, token) = setup();
    let dare_id = create_default_dare(board, token_addr);

    assert(dare_id == 1, 'Should be dare #1');
    assert(board.get_dare_count() == 1, 'Count should be 1');

    let dare = board.get_dare(dare_id);
    assert(dare.poster == POSTER(), 'Wrong poster');
    assert(dare.title == 'Test Dare', 'Wrong title');
    assert(dare.reward_amount == REWARD_AMOUNT, 'Wrong reward');
    assert(dare.status == DareStatus::Open, 'Should be Open');

    // Token should have been escrowed
    assert(token.balance_of(board.contract_address) == REWARD_AMOUNT, 'Board should hold reward');
    assert(token.balance_of(POSTER()) == 0, 'Poster balance should be 0');
}

#[test]
fn test_claim_dare_success() {
    let (board, token_addr, _token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);

    let dare = board.get_dare(dare_id);
    assert(dare.status == DareStatus::Claimed, 'Should be Claimed');
    assert(dare.claimer == CLAIMER(), 'Wrong claimer');
}

#[test]
fn test_submit_proof_success() {
    let (board, token_addr, _token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);
    submit_default_proof(board, dare_id);

    let dare = board.get_dare(dare_id);
    assert(dare.status == DareStatus::Voting, 'Should be Voting');
    assert(dare.voting_end == NOW + 86400, 'Wrong voting_end');
}

#[test]
fn test_cast_vote_approve() {
    let (board, token_addr, _token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);
    submit_default_proof(board, dare_id);

    vote(board, dare_id, VOTER1(), true);

    let dare = board.get_dare(dare_id);
    assert(dare.approve_votes == 1, 'Should have 1 approve');
    assert(dare.reject_votes == 0, 'Should have 0 reject');
    assert(board.has_voter_voted(dare_id, VOTER1()), 'Voter1 should be marked');
}

#[test]
fn test_finalize_approve_pays_claimer() {
    let (board, token_addr, token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);
    submit_default_proof(board, dare_id);

    // 3 approve votes (meets MIN_VOTES_TO_FINALIZE)
    vote(board, dare_id, VOTER1(), true);
    vote(board, dare_id, VOTER2(), true);
    vote(board, dare_id, VOTER3(), true);

    // Fast forward past voting end
    start_cheat_block_timestamp_global(NOW + 86400 + 1);

    board.finalize_dare(dare_id);

    let dare = board.get_dare(dare_id);
    assert(dare.status == DareStatus::Approved, 'Should be Approved');
    assert(token.balance_of(CLAIMER()) == REWARD_AMOUNT, 'Claimer should get reward');
    assert(token.balance_of(board.contract_address) == 0, 'Board should be empty');
}

#[test]
fn test_finalize_reject_returns_to_poster() {
    let (board, token_addr, token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);
    submit_default_proof(board, dare_id);

    // 3 reject votes
    vote(board, dare_id, VOTER1(), false);
    vote(board, dare_id, VOTER2(), false);
    vote(board, dare_id, VOTER3(), false);

    start_cheat_block_timestamp_global(NOW + 86400 + 1);

    board.finalize_dare(dare_id);

    let dare = board.get_dare(dare_id);
    assert(dare.status == DareStatus::Rejected, 'Should be Rejected');
    assert(token.balance_of(POSTER()) == REWARD_AMOUNT, 'Poster should get refund');
}

#[test]
fn test_finalize_expired_returns_to_poster() {
    let (board, token_addr, token) = setup();
    let dare_id = create_default_dare(board, token_addr);

    // Fast forward past deadline without anyone claiming
    start_cheat_block_timestamp_global(DEADLINE + 1);

    board.finalize_dare(dare_id);

    let dare = board.get_dare(dare_id);
    assert(dare.status == DareStatus::Expired, 'Should be Expired');
    assert(token.balance_of(POSTER()) == REWARD_AMOUNT, 'Poster should get refund');
}

#[test]
fn test_cancel_dare_by_poster() {
    let (board, token_addr, token) = setup();
    let dare_id = create_default_dare(board, token_addr);

    start_cheat_caller_address(board.contract_address, POSTER());
    board.cancel_dare(dare_id);
    stop_cheat_caller_address(board.contract_address);

    let dare = board.get_dare(dare_id);
    assert(dare.status == DareStatus::Expired, 'Should be Expired after cancel');
    assert(token.balance_of(POSTER()) == REWARD_AMOUNT, 'Poster should get refund');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAILURE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[should_panic(expected: 'Deadline too soon')]
fn test_deadline_too_soon_panics() {
    let (board, token_addr, _token) = setup();

    start_cheat_caller_address(board.contract_address, POSTER());
    // Deadline only 30 min from now (needs > 1 hour)
    board.create_dare(
        'Bad Dare',
        "Too soon",
        token_addr,
        REWARD_AMOUNT,
        NOW + 1800,
    );
}

#[test]
#[should_panic(expected: 'Poster cannot claim')]
fn test_poster_cannot_claim_panics() {
    let (board, token_addr, _token) = setup();
    let dare_id = create_default_dare(board, token_addr);

    start_cheat_caller_address(board.contract_address, POSTER());
    board.claim_dare(dare_id);
}

#[test]
#[should_panic(expected: 'Not the claimer')]
fn test_non_claimer_cannot_submit_proof_panics() {
    let (board, token_addr, _token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);

    // VOTER1 is not the claimer
    start_cheat_caller_address(board.contract_address, VOTER1());
    board.submit_proof(dare_id, "https://fake.com", "I didn't do it");
}

#[test]
#[should_panic(expected: 'Poster cannot vote')]
fn test_poster_cannot_vote_panics() {
    let (board, token_addr, _token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);
    submit_default_proof(board, dare_id);

    start_cheat_caller_address(board.contract_address, POSTER());
    board.cast_vote(dare_id, true);
}

#[test]
#[should_panic(expected: 'Already voted')]
fn test_double_vote_panics() {
    let (board, token_addr, _token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);
    submit_default_proof(board, dare_id);

    vote(board, dare_id, VOTER1(), true);

    // Vote again — should panic
    start_cheat_caller_address(board.contract_address, VOTER1());
    board.cast_vote(dare_id, false);
}

#[test]
#[should_panic(expected: 'Dare not open')]
fn test_cancel_claimed_dare_panics() {
    let (board, token_addr, _token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);

    // Dare is now Claimed, not Open — cancel should fail
    start_cheat_caller_address(board.contract_address, POSTER());
    board.cancel_dare(dare_id);
}

#[test]
fn test_finalize_below_min_votes_rejects() {
    let (board, token_addr, token) = setup();
    let dare_id = create_default_dare(board, token_addr);
    claim_default_dare(board, dare_id);
    submit_default_proof(board, dare_id);

    // Only 2 votes (below MIN_VOTES_TO_FINALIZE = 3)
    vote(board, dare_id, VOTER1(), true);
    vote(board, dare_id, VOTER2(), true);

    start_cheat_block_timestamp_global(NOW + 86400 + 1);

    board.finalize_dare(dare_id);

    let dare = board.get_dare(dare_id);
    assert(dare.status == DareStatus::Rejected, 'Should reject below min votes');
    assert(token.balance_of(POSTER()) == REWARD_AMOUNT, 'Poster should get refund');
}
