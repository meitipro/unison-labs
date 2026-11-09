// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title UnisonRegistry
/// @notice Puts the number Unison's validators agreed on where other contracts can read it.
///
/// Unison marks a contract's source out of ten on GenLayer, against a rubric that was frozen when the contract
/// was deployed. A mark that lives only there cannot be checked by a contract on another chain. This registry
/// carries it across: an attestor reads a finished report from the GenLayer contract and signs the part that
/// matters (which bytes, which marks, which rubric), and anyone may submit that signature here.
///
/// Trust boundary, stated plainly: the attestor is one key. It can record a report that does not match the
/// GenLayer contract, so a reader who wants more than the attestor's word recomputes the digest from the source
/// and reads the report on GenLayer, which this contract points at but cannot prove. What the attestor cannot do
/// is rewrite history: a report id is recorded once and never changed, a signature is bound to every field it
/// carries, and the owner can rotate the attestor but cannot edit or remove a record.
contract UnisonRegistry {
    /// @dev Stored in `siteTotal` when the report marked only the contract.
    uint8 public constant NO_SITE = 255;
    uint8 public constant MAX_TOTAL = 10;

    bytes32 private constant ANCHOR_TYPEHASH = keccak256(
        "Anchor(uint32 reportId,bytes32 digest,uint8 contractTotal,uint8 siteTotal,bytes32 rubric,uint256 expiry)"
    );
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    /// @dev Upper half of the curve order. A signature in the upper half has a twin that also verifies.
    uint256 private constant HALF_N = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    struct Attestation {
        uint32 reportId; // the id the GenLayer contract gave the report
        bytes32 digest; // sha256 of the normalised source, the report's identity
        uint8 contractTotal; // 0 to 10
        uint8 siteTotal; // 0 to 10, or NO_SITE
        bytes32 rubric; // keccak256 of the rubric version string, e.g. "v3"
        uint256 expiry; // the signature is refused after this time
    }

    struct Record {
        bytes32 digest;
        bytes32 rubric;
        uint64 anchoredAt;
        uint8 contractTotal;
        uint8 siteTotal;
    }

    bytes32 public immutable DOMAIN_SEPARATOR;

    address public owner;
    address public attestor;

    mapping(uint32 => Record) private _records;
    /// @notice The first report anchored for a set of bytes. The same bytes score the same, so the first stands.
    mapping(bytes32 => uint32) public firstReportOf;

    event Anchored(
        uint32 indexed reportId,
        bytes32 indexed digest,
        uint8 contractTotal,
        uint8 siteTotal,
        bytes32 rubric,
        address submitter
    );
    event AttestorUpdated(address indexed attestor);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error ZeroAddress();
    error ZeroReport();
    error ZeroDigest();
    error TotalOutOfRange();
    error AlreadyAnchored();
    error SignatureExpired();
    error BadSignature();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address attestor_) {
        if (attestor_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        attestor = attestor_;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH, keccak256("UnisonRegistry"), keccak256("1"), block.chainid, address(this)
            )
        );
        emit OwnershipTransferred(address(0), msg.sender);
        emit AttestorUpdated(attestor_);
    }

    // ----------------------------------------------------------------- reads

    function anchored(uint32 reportId) public view returns (bool) {
        return _records[reportId].anchoredAt != 0;
    }

    function recordOf(uint32 reportId) external view returns (Record memory) {
        return _records[reportId];
    }

    /// @notice The mark recorded for a set of bytes, and the report it came from. Zero report means none.
    function scoreOf(bytes32 digest) external view returns (uint8 contractTotal, uint32 reportId) {
        reportId = firstReportOf[digest];
        contractTotal = _records[reportId].contractTotal;
    }

    /// @notice True when these bytes carry a recorded mark of at least `minTotal`. This is the one call another
    /// contract needs to say "only deploy or accept code Unison marked 7 or better".
    function meets(bytes32 digest, uint8 minTotal) external view returns (bool) {
        uint32 id = firstReportOf[digest];
        return id != 0 && _records[id].contractTotal >= minTotal;
    }

    /// @notice The band for a total, by the same floors the GenLayer contract publishes: 9 exemplary, 7 strong,
    /// 4 workable, below that unfit. Returned as 3, 2, 1 and 0.
    function bandOf(uint8 total) public pure returns (uint8) {
        if (total >= 9) return 3;
        if (total >= 7) return 2;
        if (total >= 4) return 1;
        return 0;
    }

    function anchorDigest(Attestation calldata a) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        ANCHOR_TYPEHASH, a.reportId, a.digest, a.contractTotal, a.siteTotal, a.rubric, a.expiry
                    )
                )
            )
        );
    }

    // ---------------------------------------------------------------- writes

    /// @notice Record a report on the attestor's signature. Anyone may submit it.
    function anchor(Attestation calldata a, bytes calldata signature) external {
        if (block.timestamp > a.expiry) revert SignatureExpired();
        if (a.reportId == 0) revert ZeroReport();
        if (a.digest == bytes32(0)) revert ZeroDigest();
        if (a.contractTotal > MAX_TOTAL) revert TotalOutOfRange();
        if (a.siteTotal > MAX_TOTAL && a.siteTotal != NO_SITE) revert TotalOutOfRange();
        if (_records[a.reportId].anchoredAt != 0) revert AlreadyAnchored();
        if (_signer(anchorDigest(a), signature) != attestor) revert BadSignature();

        _records[a.reportId] = Record({
            digest: a.digest,
            rubric: a.rubric,
            anchoredAt: uint64(block.timestamp),
            contractTotal: a.contractTotal,
            siteTotal: a.siteTotal
        });
        if (firstReportOf[a.digest] == 0) firstReportOf[a.digest] = a.reportId;

        emit Anchored(a.reportId, a.digest, a.contractTotal, a.siteTotal, a.rubric, msg.sender);
    }

    // ----------------------------------------------------------------- admin

    function setAttestor(address attestor_) external onlyOwner {
        if (attestor_ == address(0)) revert ZeroAddress();
        attestor = attestor_;
        emit AttestorUpdated(attestor_);
    }

    function transferOwnership(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, to);
        owner = to;
    }

    // -------------------------------------------------------------- internals

    function _signer(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        if (uint256(s) > HALF_N || (v != 27 && v != 28)) revert BadSignature();
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
    }
}
