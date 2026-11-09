// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {UnisonRegistry} from "../src/UnisonRegistry.sol";

/// @notice Deploy the registry.
///
///     export DEPLOYER_PRIVATE_KEY=0x...      # funded with Base Sepolia ETH, never committed
///     export ATTESTOR_ADDRESS=0x...          # the address that signs reports
///     forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast
contract Deploy is Script {
    function run() external returns (UnisonRegistry registry) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");

        vm.startBroadcast(pk);
        registry = new UnisonRegistry(attestor);
        vm.stopBroadcast();

        console2.log("chain id        :", block.chainid);
        console2.log("UnisonRegistry  :", address(registry));
        console2.log("owner           :", registry.owner());
        console2.log("attestor        :", registry.attestor());
    }
}
