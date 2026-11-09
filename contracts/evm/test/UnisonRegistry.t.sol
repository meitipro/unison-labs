// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {UnisonRegistry} from "../src/UnisonRegistry.sol";

contract RegistryBase is Test {
    UnisonRegistry internal registry;

    uint256 internal attestorKey = 0xA77E5;
    address internal attestor;
    address internal stranger = address(0xBAD);

    bytes32 internal constant DIGEST = 0xfc3d698986ff0000000000000000000000000000000000000000000000000001;
    bytes32 internal constant V3 = keccak256("v3");
    uint8 internal constant NO_SITE = 255;
    uint32 internal constant ID = 8801;

    function setUp() public virtual {
        attestor = vm.addr(attestorKey);
        registry = new UnisonRegistry(attestor);
    }

    function _att(uint32 id, bytes32 digest, uint8 total, uint8 site, uint256 expiry)
        internal
        pure
        returns (UnisonRegistry.Attestation memory)
    {
        return UnisonRegistry.Attestation({
            reportId: id, digest: digest, contractTotal: total, siteTotal: site, rubric: V3, expiry: expiry
        });
    }

    function _sign(uint256 pk, UnisonRegistry.Attestation memory a) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, registry.anchorDigest(a));
        return abi.encodePacked(r, s, v);
    }

    function _anchor(uint32 id, bytes32 digest, uint8 total, uint8 site) internal {
        UnisonRegistry.Attestation memory a = _att(id, digest, total, site, block.timestamp + 1 days);
        registry.anchor(a, _sign(attestorKey, a));
    }
}

contract UnisonRegistryTest is RegistryBase {
    event Anchored(
        uint32 indexed reportId,
        bytes32 indexed digest,
        uint8 contractTotal,
        uint8 siteTotal,
        bytes32 rubric,
        address submitter
    );

    function test_anchorRecordsTheReport() public {
        UnisonRegistry.Attestation memory a = _att(ID, DIGEST, 7, NO_SITE, block.timestamp + 1 days);
        bytes memory sig = _sign(attestorKey, a);
        vm.expectEmit(true, true, false, true);
        emit Anchored(ID, DIGEST, 7, NO_SITE, V3, stranger);
        vm.prank(stranger);
        registry.anchor(a, sig);

        assertTrue(registry.anchored(ID));
        UnisonRegistry.Record memory r = registry.recordOf(ID);
        assertEq(r.digest, DIGEST);
        assertEq(r.rubric, V3);
        assertEq(r.contractTotal, 7);
        assertEq(r.siteTotal, NO_SITE);
        assertEq(r.anchoredAt, block.timestamp);
        (uint8 total, uint32 id) = registry.scoreOf(DIGEST);
        assertEq(total, 7);
        assertEq(id, ID);
    }

    function test_aReportIsRecordedOnceAndNeverChanged() public {
        _anchor(ID, DIGEST, 7, NO_SITE);
        // Even the attestor cannot overwrite it, with a different mark or the same one.
        UnisonRegistry.Attestation memory again = _att(ID, DIGEST, 2, 3, block.timestamp + 1 days);
        bytes memory sig = _sign(attestorKey, again);
        vm.expectRevert(UnisonRegistry.AlreadyAnchored.selector);
        registry.anchor(again, sig);
        assertEq(registry.recordOf(ID).contractTotal, 7);
    }

    function test_theSignatureCoversEveryField() public {
        UnisonRegistry.Attestation memory a = _att(ID, DIGEST, 7, NO_SITE, block.timestamp + 1 days);
        bytes memory sig = _sign(attestorKey, a);

        UnisonRegistry.Attestation memory t = a;
        t.reportId = ID + 1;
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(t, sig);

        t = a;
        t.digest = bytes32(uint256(DIGEST) + 1);
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(t, sig);

        t = a;
        t.contractTotal = 9; // a relayer cannot raise the mark
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(t, sig);

        t = a;
        t.siteTotal = 10;
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(t, sig);

        t = a;
        t.rubric = keccak256("v4");
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(t, sig);

        t = a;
        t.expiry = a.expiry + 1;
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(t, sig);

        assertFalse(registry.anchored(ID));
    }

    function test_onlyTheAttestorCanSign() public {
        UnisonRegistry.Attestation memory a = _att(ID, DIGEST, 10, NO_SITE, block.timestamp + 1 days);
        bytes memory forged = _sign(0xBADBAD, a);
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(a, forged);
    }

    function test_expiredAndMalformedSignaturesAreRefused() public {
        UnisonRegistry.Attestation memory a = _att(ID, DIGEST, 7, NO_SITE, block.timestamp + 1 hours);
        bytes memory sig = _sign(attestorKey, a);

        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(a, hex"1234");
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(a, new bytes(65));

        vm.warp(a.expiry + 1);
        vm.expectRevert(UnisonRegistry.SignatureExpired.selector);
        registry.anchor(a, sig);
    }

    function test_theUpperHalfTwinOfASignatureIsRefused() public {
        UnisonRegistry.Attestation memory a = _att(ID, DIGEST, 7, NO_SITE, block.timestamp + 1 days);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestorKey, registry.anchorDigest(a));
        uint256 n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes memory twin = abi.encodePacked(r, bytes32(n - uint256(s)), v == 27 ? uint8(28) : uint8(27));
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(a, twin);
    }

    function test_aSignatureForAnotherDeploymentIsRefused() public {
        UnisonRegistry other = new UnisonRegistry(attestor);
        UnisonRegistry.Attestation memory a = _att(ID, DIGEST, 7, NO_SITE, block.timestamp + 1 days);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestorKey, other.anchorDigest(a));
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(a, abi.encodePacked(r, s, v));
    }

    function test_marksAreBoundedAndZerosAreRefused() public {
        UnisonRegistry.Attestation memory a = _att(ID, DIGEST, 11, NO_SITE, block.timestamp + 1 days);
        bytes memory sig = _sign(attestorKey, a);
        vm.expectRevert(UnisonRegistry.TotalOutOfRange.selector);
        registry.anchor(a, sig);

        a = _att(ID, DIGEST, 7, 11, block.timestamp + 1 days);
        sig = _sign(attestorKey, a);
        vm.expectRevert(UnisonRegistry.TotalOutOfRange.selector);
        registry.anchor(a, sig);

        a = _att(ID, DIGEST, 7, 254, block.timestamp + 1 days);
        sig = _sign(attestorKey, a);
        vm.expectRevert(UnisonRegistry.TotalOutOfRange.selector);
        registry.anchor(a, sig);

        a = _att(0, DIGEST, 7, NO_SITE, block.timestamp + 1 days);
        sig = _sign(attestorKey, a);
        vm.expectRevert(UnisonRegistry.ZeroReport.selector);
        registry.anchor(a, sig);

        a = _att(ID, bytes32(0), 7, NO_SITE, block.timestamp + 1 days);
        sig = _sign(attestorKey, a);
        vm.expectRevert(UnisonRegistry.ZeroDigest.selector);
        registry.anchor(a, sig);
    }

    function test_aSiteMarkIsKeptApartFromTheContractMark() public {
        _anchor(ID, DIGEST, 7, 4);
        UnisonRegistry.Record memory r = registry.recordOf(ID);
        assertEq(r.contractTotal, 7);
        assertEq(r.siteTotal, 4);
    }

    function test_meetsReadsTheRecordedMark() public {
        assertFalse(registry.meets(DIGEST, 0)); // nothing recorded, so nothing is met, not even zero
        _anchor(ID, DIGEST, 7, NO_SITE);
        assertTrue(registry.meets(DIGEST, 7));
        assertTrue(registry.meets(DIGEST, 0));
        assertFalse(registry.meets(DIGEST, 8));
        assertFalse(registry.meets(bytes32(uint256(DIGEST) + 1), 0));
    }

    function test_theFirstReportForTheSameBytesStands() public {
        _anchor(ID, DIGEST, 7, NO_SITE);
        _anchor(ID + 1, DIGEST, 2, NO_SITE); // a later report for the same bytes is kept, but is not the score
        (uint8 total, uint32 id) = registry.scoreOf(DIGEST);
        assertEq(id, ID);
        assertEq(total, 7);
        assertTrue(registry.anchored(ID + 1));
    }

    function test_bandsMatchTheGenLayerFloors() public view {
        assertEq(registry.bandOf(10), 3);
        assertEq(registry.bandOf(9), 3);
        assertEq(registry.bandOf(8), 2);
        assertEq(registry.bandOf(7), 2);
        assertEq(registry.bandOf(6), 1);
        assertEq(registry.bandOf(4), 1);
        assertEq(registry.bandOf(3), 0);
        assertEq(registry.bandOf(0), 0);
    }

    function test_adminIsOwnerOnlyAndRotationInvalidatesTheOldKey() public {
        UnisonRegistry.Attestation memory a = _att(ID, DIGEST, 7, NO_SITE, block.timestamp + 1 days);
        bytes memory oldSig = _sign(attestorKey, a);

        vm.prank(stranger);
        vm.expectRevert(UnisonRegistry.NotOwner.selector);
        registry.setAttestor(stranger);
        vm.prank(stranger);
        vm.expectRevert(UnisonRegistry.NotOwner.selector);
        registry.transferOwnership(stranger);
        vm.expectRevert(UnisonRegistry.ZeroAddress.selector);
        registry.setAttestor(address(0));
        vm.expectRevert(UnisonRegistry.ZeroAddress.selector);
        registry.transferOwnership(address(0));
        vm.expectRevert(UnisonRegistry.ZeroAddress.selector);
        new UnisonRegistry(address(0));

        registry.setAttestor(address(0xFEED));
        vm.expectRevert(UnisonRegistry.BadSignature.selector);
        registry.anchor(a, oldSig);
    }

    function test_theOwnerCannotEditARecord() public {
        _anchor(ID, DIGEST, 7, NO_SITE);
        // There is no function that edits or removes a record, so rotating the attestor leaves it as it was.
        registry.setAttestor(address(0xFEED));
        assertEq(registry.recordOf(ID).contractTotal, 7);
        assertTrue(registry.anchored(ID));
    }

    function testFuzz_whatIsAttestedIsWhatIsStored(uint32 id, bytes32 digest, uint8 total, uint8 site) public {
        id = uint32(bound(id, 1, type(uint32).max));
        vm.assume(digest != bytes32(0));
        total = uint8(bound(total, 0, 10));
        site = site % 12 == 11 ? NO_SITE : uint8(bound(site, 0, 10));
        _anchor(id, digest, total, site);
        UnisonRegistry.Record memory r = registry.recordOf(id);
        assertEq(r.digest, digest);
        assertEq(r.contractTotal, total);
        assertEq(r.siteTotal, site);
        assertTrue(registry.meets(digest, total));
        assertFalse(registry.meets(digest, total + 1));
    }
}
