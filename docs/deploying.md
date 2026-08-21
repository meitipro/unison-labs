# Getting this on GitHub, and live

The repository already exists and is up to date:

```
https://github.com/meitipro/unison-labs      branch main, PRIVATE
```

Everything below is what to do from here.

---

## 1. Before every push: check what is actually staged

`.gitignore` covers the secrets, but **check the staged set rather than trusting
it.** There is a real private key at the repository root, in
`.deployer-key.tmp`.

```bash
git add -A
git diff --cached --name-only
```

Nothing in that list should be `.env`, `.env.local`, `.deployer-key.tmp`,
`.next/`, `node_modules/` or `__pycache__/`. Then scan the content itself:

```bash
git diff --cached | grep -nE "0x[0-9a-fA-F]{64}|PRIVATE KEY"
```

No output is the answer you want. A 64-character hex string is a private key.

```bash
git commit -m "your message"
git push origin main
```

---

## 2. Making it public

The repository is private. That was the reversible choice: private to public is
easy, and a key pushed to a public repository is public the moment it lands, no
matter how fast it is deleted.

Check §1 first, then:

```bash
gh repo edit meitipro/unison-labs --visibility public --accept-visibility-change-consequences
```

Before doing that, one thing is worth knowing: **the whole history becomes
public, not just the current files.** The history here is two commits and
neither has ever contained a key, so it is safe. If that ever stops being true,
rewriting history is much harder than keeping the repository private.

---

## 3. Running it from a fresh clone

```bash
git clone https://github.com/meitipro/unison-labs.git
cd unison-labs
npm install
npm run dev
```

That is all of it. `http://localhost:4400` works with **no configuration**: the
build was tested with the environment file removed entirely, and every screen
that would show a mark says there is no contract instead. It never invents one.

To point it at the live contract, copy `.env.example` to `.env.local` and set
one line:

```
NEXT_PUBLIC_UNISONLABS_ADDRESS=0x2681E1DC7e2e109e74a63F808a1f7aE931E44fE1
```

Copy the address **exactly** as written. Studio matches the string literally and
the lowercase form of a real contract answers "not found", which reads exactly
like a failed deployment.

Checks worth running:

```bash
npm test               # house style, 21 node tests, 166 contract checks
npm run typecheck
npm run check          # house style on its own
npm run match -- 0x2681E1DC7e2e109e74a63F808a1f7aE931E44fE1
```

`match` is the one that matters before trusting a live number: it compares the
deployed bytes against the source on disk. It should say `identical YES`.

**Never run `npm run build` while `npm run dev` is running.** They share
`.next`, and the result is every route answering 500 with a `useContext` error
that reads exactly like a code regression. Stop the dev server, `rm -rf .next`,
then build.

---

## 4. Putting it online

Vercel, because it is a Next.js App Router app with server components that read
the chain, so a static export will not do.

```bash
npm i -g vercel
vercel login
vercel link          # pick the repo, or create a new project
vercel --prod
```

Or from vercel.com: **Add New > Project > import `meitipro/unison-labs`**. The
defaults are right, since the framework is detected and there is nothing unusual
in the build.

### The environment variables to set in Vercel

| name | value | why |
| --- | --- | --- |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | `studionet` | which network everything reads |
| `NEXT_PUBLIC_UNISONLABS_ADDRESS` | `0x2681E1DC7e2e109e74a63F808a1f7aE931E44fE1` | the deployed contract |
| `NEXT_PUBLIC_ORIGIN` | `https://your-domain` | permalinks and metadata |

Set nothing else. In particular **do not put `UNISONLABS_DEPLOYER_KEY` in
Vercel.** The website never reads it: an assay is signed in the visitor's own
wallet, and that variable exists only for the local `deploy` / `verify` scripts.
A key in a hosting dashboard is a key one misconfigured log away from being
public.

### One thing that only works once it is deployed

The three sample contracts are fetched **by the validators, not by the
browser**. A localhost origin is a different machine from a node, so on a dev
server they are unreachable and the site says so rather than failing consensus
in a way nobody can act on. Once deployed they resolve, because
`NEXT_PUBLIC_SAMPLE_BASE` defaults to `<origin>/fixtures`.

---

## 5. Deploying your own contract

Only if you want your own instead of the existing one.

```bash
# a throwaway key is fine: Studio charges nothing
echo "UNISONLABS_DEPLOYER_KEY=0x<64 hex characters>" >> .env.local
npm run deploy -- --yes
npm run verify -- --contract=0x<the address it printed>
```

`deploy` refuses to send unless the runner header is pinned and the contract's
own suite passes. The rubric, the anchors, the gate probes and the bands are
frozen by that transaction; there is no admin method that edits any of them,
which is the point.

Then set `NEXT_PUBLIC_UNISONLABS_ADDRESS` to the new address, locally and in
Vercel. **An address is per network:** changing `NEXT_PUBLIC_GENLAYER_NETWORK`
without deploying again points the site at an address that does not exist there.

---

## 6. The things that will bite

- **A timed-out wait is not a failed transaction.** Every wait here polls the
  node directly rather than using `waitForTransactionReceipt`, which gives up
  long before a jury that rotates has finished. If a submission seems to hang,
  read the transaction before submitting again.
- **Studio is rate limited to 30 requests a minute** and answers a burst with
  "unknown RPC error" rather than a 429. Reads are deduped in flight and backed
  off for that reason. A cold build of every route stays inside it.
- **Changing `contracts/unison.py` silently invalidates the deployment.**
  The site keeps reading the old address, every view still answers, and the
  answers come from code that is no longer in the repository. `npm run match` is
  the one call that catches it.
- **`npm test` includes the house-style check** and will fail the whole run on a
  single em dash, middle dot or ellipsis. The connector is a spaced hyphen and
  the ellipsis is three periods. `npm run check` names the file and line.
