/**
 * What a wallet's refusal actually said.
 *
 * A leaf module with no relative imports, so tests/parity runs it directly.
 * These are shapes observed from wallets, and each one cost something before
 * it was written down.
 */

type WalletError = {
  code?: number;
  message?: string;
  data?: { originalError?: { code?: number } };
  cause?: { code?: number };
};

/**
 * "This wallet has never heard of that chain", in every shape it arrives in.
 *
 * EIP-3326 says the code is 4902, and MetaMask does send it, wrapped: an
 * unknown network comes back as a -32603 carrying the real code at
 * `data.originalError.code`. A check that reads only the outer `code` sees
 * nothing, never calls `wallet_addEthereumChain`, and the switch button does
 * nothing at all, with no error on screen either.
 *
 * That is precisely what a network nobody has added yet looks like, which is
 * why switching to Studio Next did nothing while every network already in the
 * wallet switched fine.
 */
export function unknownChain(error: unknown): boolean {
  const e = (error ?? {}) as WalletError;
  const codes = [e.code, e.data?.originalError?.code, e.cause?.code];
  if (codes.includes(4902)) return true;
  return /unrecognized chain|try adding the chain|chain id .{0,20}not (been )?added/i.test(
    String(e.message ?? ""),
  );
}
