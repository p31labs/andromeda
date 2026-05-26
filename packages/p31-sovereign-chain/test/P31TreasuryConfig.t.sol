// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {P31TreasuryConfig} from "../src/P31TreasuryConfig.sol";

contract P31TreasuryConfigTest is Test {
    P31TreasuryConfig internal t;

    function setUp() public {
        t = new P31TreasuryConfig();
    }

    function testConfigure_andLock() public {
        address safe_ = address(uint160(0x5AFE));
        address usdc_ = address(uint160(0xabc0001));
        t.configure(safe_, usdc_, 8453);
        assertEq(t.safe(), safe_);
        assertEq(t.usdc(), usdc_);
        assertEq(t.homeChainId(), 8453);
        t.lock();
        assertTrue(t.locked());
        vm.expectRevert(bytes("P31: locked"));
        t.configure(safe_, usdc_, 1);
    }

    function testRevertConfigureZero() public {
        vm.expectRevert(bytes("P31: zero safe"));
        t.configure(address(0), address(1), 1);
    }
}
