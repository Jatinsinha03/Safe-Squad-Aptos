module multisig2::squad_funds2 {
    use std::signer;
    use std::vector;
    use std::table;
    use std::option;
    use std::error;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin;

    // Errors
    const E_NOT_MEMBER: u64 = 1;
    const E_ALREADY_APPROVED: u64 = 2;
    const E_NOT_FOUND: u64 = 3;
    const E_NOT_ENOUGH_APPROVALS: u64 = 4;

    // A Squad with multi-sig control
    struct Squad has key {
        members: vector<address>,
        threshold: u64,
        balance: coin::Coin<AptosCoin>,
        proposals: table::Table<u64, Proposal>,
        next_proposal_id: u64,
    }

    // A transfer proposal
    struct Proposal has store, copy, drop {
        to: address,
        amount: u64,
        approvals: vector<address>,
        executed: bool,
    }

    // Initialize a new squad (original function)
    public entry fun create_squad(
        creator: &signer,
        members: vector<address>,
        threshold: u64
    ) {
        let addr = signer::address_of(creator);
        assert!(threshold > 0, 0);
        assert!(threshold <= vector::length(&members), 0);
        let squad = Squad {
            members,
            threshold,
            balance: coin::zero<AptosCoin>(),
            proposals: table::new(),
            next_proposal_id: 0,
        };
        move_to(creator, squad);
    }

    // Helper function for CLI - accepts individual addresses
    public entry fun create_squad_with_addresses(
        creator: &signer,
        member1: address,
        member2: address, 
        member3: address,
        threshold: u64
    ) {
        let members = vector::empty<address>();
        vector::push_back(&mut members, member1);
        vector::push_back(&mut members, member2);
        vector::push_back(&mut members, member3);
        
        let addr = signer::address_of(creator);
        assert!(threshold > 0, 0);
        assert!(threshold <= vector::length(&members), 0);
        
        let squad = Squad {
            members,
            threshold,
            balance: coin::zero<AptosCoin>(),
            proposals: table::new(),
            next_proposal_id: 0,
        };
        move_to(creator, squad);
    }

    // Deposit APT into squad
    public entry fun deposit(
        user: &signer,
        amount: u64
    ) acquires Squad {
        let squad = borrow_global_mut<Squad>(signer::address_of(user));
        let coins = coin::withdraw<AptosCoin>(user, amount);
        coin::merge(&mut squad.balance, coins);
    }

    // Propose a transfer
    public entry fun propose_transfer(
        member: &signer,
        to: address,
        amount: u64
    ) acquires Squad {
        let squad = borrow_global_mut<Squad>(signer::address_of(member));
        let sender = signer::address_of(member);
        assert!(is_member(&squad.members, sender), E_NOT_MEMBER);
        let pid = squad.next_proposal_id;
        squad.next_proposal_id = pid + 1;
        let prop = Proposal {
            to,
            amount,
            approvals: vector::empty(),
            executed: false,
        };
        table::add(&mut squad.proposals, pid, prop);
    }

    // Approve a transfer
    public entry fun approve(
        member: &signer,
        proposal_id: u64
    ) acquires Squad {
        let squad = borrow_global_mut<Squad>(signer::address_of(member));
        let sender = signer::address_of(member);
        assert!(is_member(&squad.members, sender), E_NOT_MEMBER);
        let prop_ref = table::borrow_mut(&mut squad.proposals, proposal_id);
        assert!(!prop_ref.executed, E_NOT_FOUND);
        // check if already approved
        if (vector::contains(&prop_ref.approvals, &sender)) {
            abort E_ALREADY_APPROVED;
        };
        vector::push_back(&mut prop_ref.approvals, sender);
    }

    // Execute transfer once enough approvals
    public entry fun execute(
        member: &signer,
        proposal_id: u64
    ) acquires Squad {
        let squad = borrow_global_mut<Squad>(signer::address_of(member));
        let prop_ref = table::borrow_mut(&mut squad.proposals, proposal_id);
        assert!(!prop_ref.executed, E_NOT_FOUND);
        let approvals = vector::length(&prop_ref.approvals);
        assert!(approvals >= squad.threshold, E_NOT_ENOUGH_APPROVALS);
        let coins = coin::extract(&mut squad.balance, prop_ref.amount);
        coin::deposit<AptosCoin>(prop_ref.to, coins);
        prop_ref.executed = true;
    }

    // Helper: check if addr is a member
    fun is_member(members: &vector<address>, addr: address): bool {
        let i = 0;
        while (i < vector::length(members)) {
            if (vector::borrow(members, i) == &addr) return true;
            i = i + 1;
        };
        false
    }
}