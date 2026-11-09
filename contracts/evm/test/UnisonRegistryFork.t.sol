// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {UnisonRegistry} from "../src/UnisonRegistry.sol";

/// @notice The same flow on a fork of Base Sepolia, so the domain separator carries the real chain id.
///
///     BASE_SEPOLIA_RPC_URL=https://sepolia.base.org forge test --match-contract Fork
///
/// Skipped when no RPC is set, so the suite stays offline by default.
contract UnisonRegistryForkTest is Test {
    UnisonRegistry internal registry;
    uint256 internal attestorKey = 0xA77E5;

    function setUp() public {
        string memory rpc = vm.envOr("BASE_SEPOLIA_RPC_URL", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc);
        registry = new UnisonRegistry(vm.addr(attestorKey));
    }

    function test_anchorOnBaseSepolia() public {
        assertEq(block.chainid, 84532);
        UnisonRegistry.Attestation memory a = UnisonRegistry.Attestation({
            reportId: 8801,
            digest: bytes32(0xfc3d698986ff0000000000000000000000000000000000000000000000000001),
            contractTotal: 7,
            siteTotal: 255,
            rubric: keccak256("v3"),
            expiry: block.timestamp + 1 days
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestorKey, registry.anchorDigest(a));
        registry.anchor(a, abi.encodePacked(r, s, v));
        assertTrue(registry.meets(a.digest, 7));
        assertEq(registry.bandOf(registry.recordOf(8801).contractTotal), 2);
    }
}
