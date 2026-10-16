# xatu — test pass (living doc)

> What to walk before a link goes out. Written 2026-10-15, half from the user's
> own list and half from the bugs this project has actually shipped — most
> items here exist because something broke once, and the note under them says
> what. Update it when a new class of failure turns up.

Two rules that apply to the whole list:

- **Judge anything server-side by rows, not status codes.** An anonymous
  DELETE against a row RLS hides returns **204 having deleted nothing**. A
  refusal that changes no rows is a pass; a 200 that changed one is not.
- **Measure what is measurable.** Layout, bundle size and timing claims are
  the ones most often wrong by eye. Read them out of the page.

---

## 1. Interface and language

The toggle has moved the page three separate times. Measure rather than eyeball.

- [ ] **Switching language never moves the layout.** On every page that
      carries a toggle: section tops and total document height identical in
      EN / 中 / 日.
- [ ] **The toggle's own box is 74×18 in all three languages**, and nothing
      whose width varies sits to its right — that is what moved the landing
      page 48px.
- [ ] **Pokémon data stays English in every language.** Species, moves, items,
      abilities, natures and regulation strings are lookup keys; translating
      one breaks the sprite sheet or the dex silently.
- [ ] **Language never reaches stored data.** Toggle the language: no board
      goes dirty, nothing re-uploads. Re-paste a document in another language:
      it updates the same group, never forks a parallel one.
- [ ] **The board scrolls sideways without dragging the page with it**, at
      phone width, and the page body never scrolls horizontally anywhere.
- [ ] **No native dialogs anywhere.** Every confirmation happens in place, in
      the row it belongs to.
- [ ] **Exactly one way back per page, and no page is a dead end** — including
      a step back inside a multi-step panel. `cancel` is not a step back.

## 2. Accounts, privacy and security

Use two real throwaway accounts, then delete them and their `signup_ips` rows.

- [ ] **With nothing but the public anon key, every table returns what it
      should and no more.** Sweep them all, signed out: `matchups` and `teams`
      must come back **0 rows**, and so must `app_secrets`, `rate_events` and
      `signup_ips`. `published_groups`, `profiles` (usernames only),
      `post_comments`, `post_likes`, `community_teams` and `feed_posts` are
      public by design.

      This is the check that matters most, because **the anon key is not a
      secret** — it ships in the deployed JavaScript, so anyone who opens the
      site has it. Nothing is protected by keeping it quiet; everything is
      protected by RLS. `feed_posts` is a view, and a view carries no RLS of
      its own: it needs `security_invoker=on` or it runs as its owner and
      reads straight past the policies on its base tables.
- [ ] **Anon cannot write, even as a real user.** Insert into
      `matchups`, `published_groups` and `post_comments` with a genuine
      `user_id` copied from an existing account: every one must be `42501`
      with **0 rows created**. A foreign-key error is not a pass — it means
      the FK fired before RLS was consulted, so retest with an id that exists.
- [ ] **`claim_signup_slot` refuses without its shared secret.** It takes the
      IP as a parameter, so without the guard anyone could lock another
      address out of signing up.
- [ ] **One account cannot read, update or delete another's teams or
      matchups.** By rows returned and rows changed.
- [ ] **No email address reaches the client, anywhere.** A username is public
      by design — it is the byline. An address never is. `login_address()`
      must return only `@xatu.invalid`, or a public username lookup becomes an
      email directory for every Google account.
- [ ] **Google sign-in completes from production and from localhost**, and
      lands back on the canonical host rather than the deployment-specific
      Vercel hostname.
- [ ] **No secret reaches the client bundle.** The anon key is there by
      design; the service-role key is used nowhere in the app.
- [ ] **The public repo exposes nothing sensitive.** `.env.local` gitignored;
      no connection strings, keys, real addresses or saved teams in any
      committed file.
- [ ] **A failed sign-up does not burn an IP slot.** Taken names are checked
      before the slot is claimed. Cap is 3 per address per day.
- [ ] **There is no password reset, and the sign-up form says so.** Accepted
      cost of username sign-up; Google is offered as the recoverable route.

## 3. Saving, and not losing work

This is where the project has broken most often.

- [ ] **Leaving the board saves what is written — by swipe-back as well as by
      clicking back.** A swipe-back is a client-side pop in the App Router, so
      `pagehide` never fires. Test the gesture, not just the button: a fix
      here once passed a test that used a full page navigation while still
      losing work.
- [ ] **A note typed and not saved survives leaving and returning.**
- [ ] **Switching opponents saves the current board first**, and merely
      visiting an opponent never turns "no plan yet" into a plan.
- [ ] **A refused write says "not saved" in red.** Never silently, and the
      local failure reads ahead of any cloud warning.
- [ ] **The ceilings apply to new rows only.** 300 matchups per browser,
      256 KB per payload, 2,000 rows per account — an existing matchup must
      always save, even at the limit.
- [ ] **A raw database error never reaches the screen.** "new row violates
      row-level security policy (USING expression)" was once shown to a user.
      The visible line says what happened to their work.

## 4. The board's rules

- [ ] **A Pokémon that switched in cannot declare a move.** Switching is that
      turn's action; the picker refuses the move rather than hiding it.
- [ ] **One that came in replacing a faint can move.** That choice is made
      between turns and costs no action. The two cases are told apart, not
      merged.
- [ ] **A recorded Mega carries into later turns**, drawn as its Mega forme
      with ⟡, and offered only to a holder of its own Mega Stone.
- [ ] **A positional edit cascades down the tree**, but only into slots that
      still hold the old occupant, so downstream edits survive.
- [ ] **A branch is an alternate of the same turn and steps down a row.** It
      never reads as the next turn; two roots at turn 0 are legal.
- [ ] **The editor and the published page draw the same board.** Card order,
      branch rows, arrow count, chip order, and whether a target that has left
      the field is drawn. These two have drifted four times.

## 5. The damage calculator

The one place xatu computes anything, so correctness matters here in a way it
does not elsewhere.

- [ ] **Pre-Mega and post-Mega are different numbers, and the Mega's own
      ability applies.** A recorded Mega calculates as its Mega forme and the
      base set's ability is dropped — getting this wrong understated one move
      by about a third.
- [ ] **Terrain, weather, Reflect, Light Screen, Aurora Veil, Helping Hand and
      Friend Guard all move the number.**
- [ ] **Stat stages −6 to +6 and the crit toggle move the number.** Stages
      belong to the Pokémon, crit belongs to the attack, and Intimidate is
      never applied on xatu's own initiative.
- [ ] **A spread move calculates against every defender out, one line each**,
      and the spread reduction applies only when more than one target is
      actually out — Heat Wave into one Pokémon is not reduced.
- [ ] **One immune target does not kill the whole calculation.** A zero reads
      as a zero on its own line; the other defenders still get their numbers.
- [ ] **The toggle changes the interface, never the document.** A guide
      written with the calculator on is byte-identical to one written with it
      off. Compare the stored payloads.
- [ ] **With the calculator off, nothing of it is fetched** — 0 KB in a
      production build — and switching it on does not re-save anything by
      itself.
- [ ] **A stored calculation is never re-derived on read.** A published page's
      numbers cannot move under its readers, whatever changes later.
- [ ] **A team with no sets is not calculated.** The board names which Pokémon
      it needs instead of inventing a number.

## 6. Updating a team's sets

- [ ] **EVs and moves can be replaced by paste; the six Pokémon cannot.** Five
      of six matching is refused by name and nothing is written — a different
      six is a different team, and would leave every board quietly using the
      old one.
- [ ] **Plans are untouched.** A recorded move stays exactly as recorded, even
      after that move leaves the set: a recorded move is what you intended
      that turn.
- [ ] **The picker offers the new four**, and the old move cannot be
      re-picked.
- [ ] **Every matchup in the set gets the new sets** — all of them, not only
      the board on screen.
- [ ] **A stored calculation whose inputs moved is dropped across the whole
      set**, not only on the open board. Otherwise publishing carries a number
      computed from the old EVs out to readers.

## 7. Teams, imports and identity

A team's identity is its six species plus where it came from. Everything here
follows from that.

- [ ] **Importing someone's group with the same six keeps both.** Your plan
      survives, your team keeps its name, theirs is badged. There is no merge
      path, by decision.
- [ ] **Re-pasting the same document writes nothing and says so.** No new
      `savedAt`, no reorder, no re-upload.
- [ ] **Copy JSON, wipe localStorage, paste: EVs and moves survive.**
- [ ] **A team a board still names cannot be deleted**, nor one the
      in-progress setup names. A stale team with nothing pointing at it can be.
- [ ] **Samples keep their own regulation** and never relabel themselves to
      whichever one is current.

## 8. Publishing and the community feed

- [ ] **A matchup is public only after it is published.** Nothing unpublished
      is readable by anyone else, by any route.
- [ ] **Publish, edit and unpublish all work, from the post and from the
      set.** Re-publishing updates the one post; it never mints a second.
- [ ] **A published page is a snapshot.** Edit the board afterwards and the
      public page does not move until you re-publish — a link posted next to a
      tournament result cannot shift under its readers.
- [ ] **Signed in, you can like and comment.** A second like is refused rather
      than counted twice. A comment can be deleted but never edited: that is a
      property of the schema, not of the UI.
- [ ] **Forking writes a new set even when you already have those six.** Your
      existing plan and team name survive. Re-forking the same page updates
      that fork instead of making a third.
- [ ] **Two sets may share a name.** A name is not a key; identity is roster
      plus provenance.
- [ ] **A `/g/` link unfurls with its title, byline and six sprites**, on a
      host that runs no JavaScript, from the canonical hostname.
- [ ] **The daily caps hold.** 10 published posts and 30 comments per account
      per day, counted from an append-only log so delete-and-repost cannot
      defeat them.

## 9. First run and degraded modes

- [ ] **An empty browser renders every page correctly** — no saved teams, no
      matchups, not signed in.
- [ ] **With Supabase unconfigured the local-first flow still works**, and the
      cloud surfaces render nothing rather than leaving a hole where they
      would be.
- [ ] **Every sprite resolves to a real icon-sheet tile.** No silent fallback
      icons anywhere.
