// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {P31AccessAllowlist} from "../src/P31AccessAllowlist.sol";

contract P31AccessAllowlistTest is Test {
    P31AccessAllowlist internal a;
    bytes32 internal constant CAP = keccak256(bytes("mesh.relay"));

    function setUp() public {
        a = new P31AccessAllowlist();
    }

    function testSetAllowed() public {
        address bob = address(0xB0B);
        assertFalse(a.isAllowed(CAP, bob));
        a.setAllowed(CAP, bob, true);
        assertTrue(a.isAllowed(CAP, bob));
        a.setAllowed(CAP, bob, false);
        assertFalse(a.isAllowed(CAP, bob));
    }

    function testRevertNotOwner() public {
        vm.prank(address(0xACE));
        vm.expectRevert(bytes("P31: not owner"));
        a.setAllowed(CAP, address(1), true);
    }
}
