# Unison

**Contract review, judged by the network itself.**

*One contract, one agreed number.*

Paste a GenLayer contract. Validators fetch it, agree on the bytes, and mark it
out of ten against a rubric published in the contract before anyone was scored.
Point at the site too and it gets its own ten, separately - never averaged.

A score is drawn as a streak, its length the score, read against reference
marks at 4, 7 and 9 like an assay card. The hero carries the slab itself in
three.js, ported from the design project's `stone.js`.

Two surfaces. The **site** at `/`, black and one gold, and the **workspace**
behind Launch dApp:

```
/app/connect     connect a wallet. Lists the ones really installed, by name
/app             compose, run, and the report that comes back
/app/reports     every report on chain, and the anchors that would not settle
/app/validators  the real pool, and why no per-node mark exists to show
/app/settings    rubric, contract, network, wallet, faucet, theme, pointer
```

The workspace is the one place with a light theme, a resizable rail and a
faucet. The site stays dark either way.

Live on the **Studio** network:

```
contract   0x1B79011734cc652f68Fa3eAe312aC04C7cC29Ae4
rubric     v1
report     8801   the first mark this contract ever issued
```

---

## Running it

```bash
npm install
npm run dev            # http://localhost:4400
```

```bash
npm test                 # house style + 21 node tests + 166 pure-half checks
npm run check            # house style on its own
npm run typecheck        # tsc --noEmit
npm run lint:contract    # genvm-lint check
npm run match -- 0x...   # is the deployed contract the source on disk?
```

**Never `npm run build` while `npm run dev` is running.** They share `.next`,
and the result is every route answering 500 with a `useContext` error that
reads exactly like a code regression. Stop the dev server, delete `.next`, then
build.

The site works with no contract configured - every screen that would show a mark
says so instead. It never invents one.

### Deploying your own

```bash
npm run deploy -- --yes
npm run verify -- --contract=0x...
```

`deploy` refuses to send unless the runner header is pinned and the contract's
own suite passes. The rubric, the anchors, the gate probes and the bands are
frozen by that transaction - there is no admin method that edits any of them.

Copy the address **exactly** as printed: Studio matches the string literally, and
the lowercase form of a real contract answers "not found".

---

## How a mark is made

```
        browser                              the validators
  ┌──────────────────────┐            ┌──────────────────────────────┐
  │ fetch the source     │            │ 1  fetch it, agree on the    │
  │ run the gate  (free) │            │    bytes         strict_eq   │
  │ hash it              │            │ 2  mark the contract         │
  │ ask: seen before?    │            │ 3  mark the site, if given   │
  └──────────────────────┘            └──────────────────────────────┘
        a refusal stops here                 sum, band and record
        and costs nobody an inference        happen in the contract
```

**The gate** is six presence checks, four required. Every probe is a plain
case-sensitive substring - no regular expressions on either side, because
substring containment is the one text operation that cannot drift between Python
and JavaScript. `gate_spec()` publishes the probes, so the browser runs the
chain's gate rather than a copy of it, and `assay` re-runs the real one on the
agreed bytes regardless.

Passing it proves almost nothing. Failing a required one proves a great deal.

**The rubric** is ten criteria under two headings, each scored 0, 1 or 2 against
an anchor. Four of the five contract criteria are **counted** in deterministic
code from the agreed bytes, so every validator derives the same score and the
same reason without spending an inference. The rest are **judged**:

| decided by | criteria |
|---|---|
| `facts` | `agreement` - `untrusted` - `boundary` - `failure` |
| `judgment` | `necessity`, and all five site criteria |

Every criterion says which it is, on the rubric page and in `rubric()`.

**The total is summed in the contract**, in deterministic code, from those
integers. The band is a pure function of the total. No model is ever asked for a
total, and the two subjects are never added to each other.

That split was not a preference. Three markings of one source from a single node
came back `[0,2,0,1,0]`, `[0,2,0,2,0]` and `[0,2,0,0,1]` - the band itself
flipped. Bare equality settled **0 of 3** assays; after the redesign the same
source settled on the first try. The measurements are in
[docs/judgment-layer.md](docs/judgment-layer.md).

---

## Layout

```
contracts/
  touchstone.py        the contract: gate, rubric, marks, reports, splits
  test_helpers.py      166 checks over its pure half, on plain CPython
lib/
  gate.ts              the browser's half of the gate, twinned with the above
  wallet.tsx           EIP-1193 and EIP-6963: silent restore, chain switching
  eip6963.ts           which wallets are actually installed in this browser
  chain.ts             the one place that decides which network this talks to
  touchstone.ts        every read, deduped in flight
  writes.ts            assay, record_split, contest -- and receipt reading
  validators.ts        the pool, from sim_getAllValidators
  funds.ts             the balance, and Studio's programmatic faucet
  prefs.tsx            theme and pointer, applied before first paint
  copy.ts              the copy deck, chapter twelve, set exactly
app/
  page.tsx             screens 1, 2 and 3
  rubric/              screen 4
  r/[id]/              screen 5
  app/connect/         the connect screen, outside the workspace shell
  app/(workspace)/     the four panes, sharing one rail
  globals.css          the site
  workspace.css        the workspace, and both its themes
components/
  StoneSlab.tsx        the three.js slab, ported from the design's stone.js
  Hero.tsx             the hero, and counters that never show a wrong number
  SiteHeader.tsx       the floating pill nav, and the mobile sheet
  Machinery.tsx        the four-part tabbed panel
  WorkspaceShell.tsx   the rail, the resize handle, the shared header
  AppConsole.tsx       compose, gate, assay, report
  ConnectPanel.tsx     connect / signing / connected / wrong chain / no wallet
  WalletCard.tsx       address, network, balance, faucet
  SettingsRows.tsx     every setting, each one a real fact or a real control
  MagneticCursor.tsx   the drawn pointer, ported from magnetic-cursor.js
  ThemeSwitch.tsx      light and dark, as a physical object
  Toaster.tsx          a polite live region. Nothing here carries an action
  Streak.tsx           a mark, drawn to length
scripts/
  check.mjs            house style, as a check that fails
  deploy.mjs verify.mjs settle.mjs tx.mjs make-probe.mjs match.mjs
tests/parity/          the browser gate against the contract's, byte for byte,
                       and the copy deck against the voice rules
docs/judgment-layer.md what measuring the judgment layer changed
```

---

## Things worth knowing before changing it

- **Changing the contract invalidates the deployment**, silently: the site keeps
  reading the old address, every view still answers, and the answers come from
  code that is no longer in the repo. `npm run match -- 0x...` compares the
  deployed bytes against the source and is worth one call before trusting a live
  number.
- **The samples are fetched by the validators, not by your browser.** On a dev
  server they are unreachable from a node, and the site says so rather than
  failing consensus in a way nobody can act on. Point
  `NEXT_PUBLIC_SAMPLE_BASE` at a public origin to demo locally.
- **`gen_call` on Studio mis-encodes a view whose calldata runs past ~200
  bytes**, answering `RLP string ends with N superfluous bytes`. Nothing here
  passes long text to a view; the paste path runs the gate in the browser.
- **Large deploys get their request body reset.** A 62KB contract could not get
  through 20 retries while a 300 byte one deployed instantly. The contract is
  kept lean for that reason, and the rationale lives in `docs/` rather than in
  every validator's memory.
- **A timed-out wait is not a failed transaction.** Every wait here polls the
  node directly instead of using `waitForTransactionReceipt`, which gives up long
  before a jury that rotates has finished.
- **genvm-lint cannot analyse a lambda validator** and reports a false
  `nested non-deterministic blocks are forbidden`. Use a named function.
- **The paste path is the gate only.** A mark has to be independently checkable
  or it is this page's opinion with a transaction attached, and text pasted into
  a browser is reachable by nobody.

## What this is not

It reads source text. It does not execute, fuzz or verify anything. A contract
that scores 10 here can still be broken, and this is a first pass before a person
reads it, not instead of one.

There is no pass mark. Bands describe; they do not approve.

---

## The design port (Nocturne)

The interface comes from a Claude Design project (`Unison Nocturne.dc.html`,
which also brings `stone.js` and `magnetic-cursor.js`) and is implemented from
those files rather than rebuilt by eye. The departures below are deliberate, and
each one would otherwise be a defect:

- **Two contrast corrections.** The placeholder `#6b6b6b` is 3.94:1 on black
  and AA wants 4.5 for text, so it is `#7d7d7d` (5.10). The inactive pill-nav
  links sit at `opacity: .5` over white, which computes to 2.92:1 and fails
  outright; at `.70` they are 5.17:1 and still read as clearly secondary.
  Everything else in the palette clears AA on black with room to spare.
- **The fonts are self-hosted.** The design links Inter, IBM Plex Mono and
  DotGothic16 from Google Fonts, plus BubbledotICG-FinePos from onlinewebfonts.
  A font host is a third party the page would have to reach at paint time, and
  the proprietary face is not ours to redistribute - DotGothic16 is the
  design's own declared fallback for it, so the dotted display face is what the
  design asked for either way.
- **`three` is a dependency, not a CDN import.** Same reason, plus a jsdelivr
  module import breaks under a strict content policy.
- **Every number is one the product can stand behind.** The mockup fills its
  panels with 9/10, report 8812, digest `4f2a91c0`, and climbs its counters to
  `4 min`, `96.4%` and `148,206`. All of that is right in a design file and
  would be invented on a live page. The panels read the newest report off the
  chain; the counters show what the contract has issued, what the rubric
  publishes, what a refusal costs, and GenLayer's own published validator-set
  size labelled as the network's. Three states are kept apart: a real mark, an
  empty contract, and *the node did not answer*.
- **The counters default to the truth.** `requestAnimationFrame` does not run
  in a background tab, so a counter that starts at zero and climbs on rAF shows
  "0 Published criteria" to anyone who opens the page in another tab. The state
  starts at the target and the animation is the decoration, with a safety
  timeout that lands on the real number if the frames never arrive.
- **The dApp is a route, not a view flag.** The design toggles `view: 'app'` and
  `pane: 'reports'` in component state; routes give each one a URL, a back
  button, a bookmark and a shareable link, and let the rail mark the current
  pane with `aria-current` for free.
- **The wallet buttons are the wallets you have.** The connect screen offers
  MetaMask, WalletConnect and Coinbase. Wired naively all three call the same
  injected provider, so somebody with only MetaMask gets a Coinbase button that
  opens MetaMask. EIP-6963 says which extensions are really installed, so each
  button is that wallet and connects that wallet, and the provider chosen is
  carried through to `createClient` - otherwise a person picks wallet A, sees
  A's address everywhere, and has wallet B open asking for the signature.
- **No per-validator mark, anywhere.** The design's Validators screen draws five
  nodes each scoring 9/10. That number does not exist at any layer: a validator
  returns one bit, and the receipt carries the aggregate. Drawing five nines
  would be this product inventing the exact quantity it exists to establish.
  What the pane shows instead is real and better - every validator's address,
  stake, provider and model from `sim_getAllValidators`, and the count of
  *distinct* models, since two nodes on one model are not two readings.
- **The balance and the faucet are real.** `eth_getBalance` and Studio's
  `sim_fundAccount`, not a `250` that goes up by 100 on click. The balance is
  re-read after funding rather than incremented locally, so it can never show
  what the chain does not hold. On a network without a programmatic faucet the
  button becomes a link to the real one.
- **Four contrast corrections in the workspace palette**, on top of the two on
  the site. `--adim` fails on both grounds (2.87 dark, 2.54 light) and it labels
  the stages of a review, which is text; `--agold` is 2.70 on white and it fills
  5px status dots, which WCAG 1.4.11 wants at 3.0; the light streak gradient
  ends on a colour that is 2.0 against its own track. Measured values and the
  replacements are at the top of `app/workspace.css`.
- **The breakpoint is CSS.** The first version kept it in state from
  `matchMedia` in an effect, which renders the rail closed on a 1280px viewport
  whenever the first measurement lands before the surface has a width - and the
  `change` event that would fix it never fires, because nothing changed as far
  as the query is concerned.
- **The drawn pointer can be turned off.** `magnetic-cursor.js` is ported whole,
  constants and all, but it replaces something the operating system provides.
  Anyone who relies on their own cursor - a large one, a high-contrast one -
  must be able to have it back, and no feature detection can spot that case, so
  Settings has a row for it. `cursor: none` is also applied only while the dot
  is really being drawn, via an attribute the component sets: the design's
  stylesheet hides the native cursor from the first paint, so a browser where
  the script fails to run has no pointer at all.
- **One connector, checked.** House style is the spaced hyphen and three
  periods; `npm run check` walks the repo for nine banned codepoints and fails.
  One file is exempt by name - `contracts/touchstone.py` builds a refusal with
  an em dash and those bytes are deployed, so `houseStyle` in `lib/writes.ts`
  converts it on the way out of the receipt instead. Editing the source there
  would put `npm run match` out of agreement with the live contract.

`support.js` in the design project is the DC runtime that compiles `<x-dc>`,
`{{ }}` and `<sc-if>` into React. It is not ported; those constructs are written
natively instead.

## The wallet

`Connect wallet` sits where the design draws its static `0x8f2c...41ab` chip, and
has four states rather than one: no wallet in this browser, connect, wrong
chain, connected. `lib/wallet.tsx` holds all of it.

- It restores with **`eth_accounts`**, which returns the already-authorised
  account *without* prompting. `eth_requestAccounts` on mount throws a wallet
  popup at every returning visitor.
- It **re-checks after mount.** Extensions inject `window.ethereum`
  asynchronously, so a provider that looks once is why a page tells somebody
  with a wallet that they have none. This one checks, listens for
  `ethereum#initialized`, and checks again shortly after.
- It follows `accountsChanged` and `chainChanged`, so a wallet switched in
  another tab does not leave a stale address on screen.
- On the wrong chain it offers the switch, falling back to
  `wallet_addEthereumChain` on 4902.
- **Disconnect is worded as "forget"** because that is what it does. EIP-1193
  has no revoke: the site stops using the account, the wallet keeps the
  permission, and the menu says so.

Connecting is asked for **only when a signature is needed** - the gate runs
first, free, and a refusal never reaches a wallet at all.
