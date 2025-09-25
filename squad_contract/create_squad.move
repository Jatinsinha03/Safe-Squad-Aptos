script {
    use multisig::squad_funds;
    use std::vector;

    fun main(creator: signer) {
        let members = vector::empty<address>();
        vector::push_back(&mut members, @0x6bac68c081f0d90d947c211c9b43634b74303ea36ff13bc15c109857c0516e2d);
        vector::push_back(&mut members, @0x93a1baca90f8b746eec77d2c3a3b63dc2d46c8ae612c2badd2760c4e2c0be20e);
        vector::push_back(&mut members, @0x7349cf901abcfa101215344ff1f77c03b5537d5971d02a541de983a56a34f319);
        
        squad_funds::create_squad(&creator, members, 2);
    }
}