/**
 * Japanese, keyed by the English source string.
 *
 * Glossary — keep these consistent, they are the words the whole UI turns on.
 * Where the Japanese VGC scene already has a word, it wins over a literal
 * translation of ours: 先発 / 後発 / 選出 / 未選出 are what a player actually
 * says, and they carry the bring-6-pick-4 idea for free.
 *
 *   matchup      マッチアップ   one of your teams planned against one opposing team
 *   set / group  グループ       every matchup sharing one of your teams
 *   team         パーティ       my team 自分のパーティ · opposing team 相手パーティ
 *                              (NOT チーム — パーティ is the word for six Pokémon)
 *   sets         構成           a Pokémon's moves/item/EVs — a different "set"
 *   board        ボード         the turn tree at /demo/sim
 *   turn         ターン         turn 0 is 選出 (team preview)
 *   lead         先発           the two you send out first
 *   back         後発           the two behind them  (nav "back" is 戻る — different key)
 *   on the field 場             this turn's active pair
 *   bench        未選出         the two you did not bring at all
 *   bring / pick 選出           bring 6 pick 4 → 6匹持ち込み・4匹選出
 *   branch       分岐           the ⑂ alternate line
 *   plan         プラン         "no plan yet" プラン未作成
 *   fainted      ひんし         the in-game word, kana as the games write it
 *   paste/import 貼り付け / 読み込み
 *
 * Pokémon data — species, moves, items, abilities, natures, types, regulation
 * strings — is never in here. It is a lookup key for the sprite sheet and the
 * dex, and translating it breaks them silently.
 */

export const JA: Record<string, string> = {
  // ── shared chrome ──────────────────────────────────────────────────────────
  "Published matchups": "公開されたマッチアップ",
  published: "公開",
  Newest: "新着",
  "Most liked": "人気順",
  "from the community": "コミュニティから",
  "Publish yours →": "自分のを公開 →",
  "see all →": "すべて見る →",
  "Nothing published yet.": "まだ公開されたものはありません。",
  "Publish one from My matchups →": "「マイマッチアップ」から公開する →",
  "Add a comment": "コメントを書く",
  "Post comment": "コメントする",
  "Posting…": "投稿中…",
  "No comments yet.": "まだコメントはありません。",
  "Delete this comment?": "このコメントを削除しますか？",
  "a deleted account": "削除されたアカウント",
  "Sign in to like or comment.":
    "ログインすると「いいね」やコメントができます。",
  "to like or comment.": "すると「いいね」やコメントができます。",
  "💬 {n}": "💬 {n}",
  "back to the home page": "ホームに戻る",
  "back to the previous page": "前のページに戻る",
  home: "ホーム",
  "nav|← back": "← 戻る",
  builder: "ビルダー",
  matchups: "マッチアップ",
  "Which of your teams?": "どのパーティを使いますか？",
  "my matchups": "マイマッチアップ",
  cancel: "キャンセル",
  Delete: "削除",
  Save: "保存",
  Import: "読み込む",
  Reset: "リセット",
  "Copied ✓": "コピーしました ✓",
  "Fetching…": "取得中…",
  github: "github",
  "xatu is an unaffiliated, non-commercial fan project. Pokémon is owned by Nintendo, The Pokémon Company, Game Freak, and Creatures.":
    "xatu は非公式・非商用のファンプロジェクトです。ポケモンの権利は任天堂、株式会社ポケモン、ゲームフリーク、クリーチャーズに帰属します。",

  // ── document metadata ──────────────────────────────────────────────────────
  "xatu — see turn one coming": "xatu — 1ターン目を見通す",
  "Turn matchup notes into a turn-by-turn map for Pokémon doubles: which four you bring, who leads, and what happens next.":
    "マッチアップのメモを、ポケモンダブルバトルのターンごとの地図に変えます。どの4匹を選出し、誰を先発にして、次に何が起こるのか。",

  // ── language toggle ────────────────────────────────────────────────────────
  Language: "言語",
  "Switch to English": "英語に切り替える",
  "Switch to Chinese": "中国語に切り替える",
  "Switch to Japanese": "日本語に切り替える",

  // ── account ────────────────────────────────────────────────────────────────
  Username: "ユーザー名",
  "Pick a username": "ユーザー名を設定",
  edit: "変更",
  set: "設定",
  "That username is taken.": "そのユーザー名は使われています。",
  "That username is reserved.": "そのユーザー名は予約されています。",
  "Usernames are 3–20 characters.": "ユーザー名は3〜20文字です。",
  "Letters, digits, - and _ only.": "英数字と - _ のみ使えます。",
  "Couldn’t save that — try again.":
    "保存できませんでした——もう一度お試しください。",
  "The only thing shown on your posts. Change it anytime.":
    "投稿で表示されるのはこれだけです。いつでも変更できます。",
  "Needed before you can publish or comment.": "投稿やコメントの前に必要です。",
  "sign in": "ログイン",
  "Sign in": "ログイン",
  "My matchups": "マイマッチアップ",
  "Sign out": "ログアウト",
  "close account menu": "アカウントメニューを閉じる",
  "account menu for {email}": "{email} のアカウントメニュー",

  // ── /login ─────────────────────────────────────────────────────────────────
  // Supabase Auth, PostgREST and Zod all emit English we don't control. The
  // frame around the message is translated; the message itself is passed
  // through, which is honest rather than a half-guessed mapping.
  "Accounts aren’t set up in this build. Everything still works without one — teams and matchups save to your browser. {0}":
    "このビルドではアカウントが設定されていません。なくても問題なく使えます——パーティもマッチアップもブラウザに保存されます。{0}",
  "my matchups →": "マイマッチアップ →",
  "Open my matchups →": "マイマッチアップを開く →",
  "Open my matchups": "マイマッチアップを開く",
  "Signed in as {0}": "ログイン中：{0}",
  "sign out": "ログアウト",
  "Create an account": "アカウントを作成",
  "Create account": "アカウント作成",
  "An account syncs your teams and matchups across browsers. Only you can see them. Everything also works without one.":
    "アカウントがあると、パーティとマッチアップを複数のブラウザ間で同期できます。見られるのは自分だけです。アカウントなしでもすべて使えます。",
  "Continue with Google": "Google で続ける",
  or: "または",
  email: "メールアドレス",
  password: "パスワード",
  "password (8+ characters)": "パスワード（8文字以上）",
  "New here? {0}": "はじめてですか？{0}",
  "Already have an account? {0}": "すでにアカウントをお持ちですか？{0}",
  "Almost there — check your email for a confirmation link, then sign in.":
    "あと少しです——メールに届いた確認リンクを開いてから、ログインしてください。",

  // ── counted nouns ──────────────────────────────────────────────────────────
  // Both English forms are separate keys; Japanese maps them to one string and
  // uses the space to put the counter word in.
  "{n} matchup": "{n} 件のマッチアップ",
  "{n} matchups": "{n} 件のマッチアップ",
  "{n} team": "{n} 件のパーティ",
  "{n} teams": "{n} 件のパーティ",
  "{n} opposing team": "{n} 件の相手パーティ",
  "{n} opposing teams": "{n} 件の相手パーティ",
  "{n} state": "{n} 個の状態",
  "{n} states": "{n} 個の状態",

  // ── import summaries (app/demo/import-group.ts) ────────────────────────────
  // `{count}` expands to a phrase ending in a Japanese glyph, so nothing here
  // may put a space after it — the particle attaches directly.
  "Already had this matchup — no plan changed; the set is now called “{team}”.":
    "このマッチアップはすでにありました——プランは変更していません。グループ名を「{team}」にしました。",
  "Already had these {count} — no plan changed; the set is now called “{team}”.":
    "この {count}はすでにありました——プランは変更していません。グループ名を「{team}」にしました。",
  "Nothing to import — you already have this exact matchup for {team}.":
    "読み込むものはありません——{team} のこのマッチアップは、まったく同じ内容ですでにあります。",
  "Nothing to import — you already have these exact {count} for {team}.":
    "読み込むものはありません——{team} のこの {count}は、まったく同じ内容ですでにあります。",
  "{n} new": "{n} 件を新規追加",
  "{n} updated": "{n} 件を更新",
  "{n} already identical": "{n} 件は同一",
  "detail| — {parts}": "——{parts}",
  "list|, ": "、",
  "Imported {count} as a separate set for {team}{detail}":
    "{count}を {team} の別グループとして読み込みました{detail}",
  "sentence|{head}.": "{head}。",
  // Japanese ends the first clause outright rather than joining with a
  // semicolon or a dash; both English shapes land on the same sentence break.
  "clause|{head}; {tail}": "{head}。{tail}",
  "clause|{head} — {tail}": "{head}。{tail}",
  "your 1 for this team was left alone.":
    "このパーティ用に自分で作った 1 件はそのままです。",
  "your {n} for this team were left alone.":
    "このパーティ用に自分で作った {n} 件はそのままです。",
  "Imported {count} for {team}{detail}.":
    "{team} に {count}を読み込みました{detail}。",

  // ── paste decoding (app/demo/workflow-io.ts) ───────────────────────────────
  // The label and the punctuation joining it to the warning are part of the
  // key, so Japanese gets its full-width colon instead of an ASCII ": ".
  "Card {n} (turn {t})": "カード {n}（ターン {t}）",
  "{label}, my side": "{label}、自分側",
  "{label}, opposing side": "{label}、相手側",
  "vs {opp} — {warning}": "対 {opp} —— {warning}",
  "slot|front": "場",
  "slot|back": "後発",
  "slot|fainted": "ひんし",
  '{label}: reference "{c}" is off the roster — dropped.':
    "{label}：参照「{c}」はパーティにいません——無視しました。",
  "{label}: {species} was placed twice — kept its first placement.":
    "{label}：{species} が2回配置されています——最初の位置を残しました。",
  "{label}: {group} had more than {cap} — {species} moved to the bench.":
    "{label}：{group}が {cap} 匹を超えています——{species} を未選出に移しました。",
  '{label}: unreadable move entry "{entry}" — dropped.':
    "{label}：技の記述「{entry}」を解釈できません——無視しました。",
  "{label}: a move points off the roster — dropped.":
    "{label}：パーティ外を指す技があります——無視しました。",
  "{label}: {species} has a move but isn't in front — move dropped.":
    "{label}：{species} に技がありますが場にいません——技を無視しました。",
  "{label}: {species}'s move target is unreadable — dropped.":
    "{label}：{species} の技の対象を解釈できません——無視しました。",
  "{label}: the recorded Mega points off the roster — dropped.":
    "{label}：記録されたメガシンカがパーティ外を指しています——無視しました。",
  "{label}: {species} Megas but isn't in front — dropped.":
    "{label}：{species} がメガシンカしていますが場にいません——無視しました。",
  "{label}: {attacker}'s move target isn't on the field — dropped.":
    "{label}：{attacker} の技の対象が場にいません——無視しました。",
  "{label}: moves aren't recorded at team preview — dropped.":
    "{label}：選出画面では技を記録しません——無視しました。",
  "Card {n}: invalid parent reference — treated as an alternate turn 1.":
    "カード {n}：前のカードへの参照が無効です——ターン1の別分岐として扱いました。",
  "Unknown Pokémon: {names} — not importing.":
    "認識できないポケモン：{names}——読み込みを中止しました。",
  "That isn't valid JSON.": "有効な JSON ではありません。",
  "That isn't a workflow document.":
    "マッチアップのドキュメントではありません。",
  "The workflow's teams are malformed.":
    "ドキュメント内のパーティの形式が不正です。",
  "The document has no opposing teams.":
    "このドキュメントには相手パーティがありません。",
  "The workflow's turn list is malformed.":
    "ドキュメント内のターン一覧の形式が不正です。",

  // ── /matchups ──────────────────────────────────────────────────────────────
  publish: "公開",
  "publish {team} so anyone can read it":
    "{team} を公開して誰でも読めるようにする",
  "Publish this set": "このグループを公開",
  Publish: "公開する",
  "Publishing…": "公開中…",
  Published: "公開しました",
  Title: "タイトル",
  "Say something about it — optional": "説明を書く——任意",
  "copy link": "リンクをコピー",
  "open it ↗": "開く ↗",
  "Anyone with the link can read it. Publish again to update it.":
    "リンクを知っている人は誰でも読めます。更新するには再度公開してください。",
  "Pick a username first — it’s your byline. Open the account menu.":
    "先にユーザー名を設定してください——署名になります。アカウントメニューから設定できます。",
  "Sign in to publish.": "公開するにはログインしてください。",
  "A title is required.": "タイトルは必須です。",
  "That’s 5 new posts today — the daily limit. Editing a post you already published still works.":
    "本日の新規投稿は 5 件に達しました——1 日の上限です。公開済みの投稿の編集は引き続きできます。",
  "That’s 30 comments today — the daily limit.":
    "本日のコメントは 30 件に達しました——1 日の上限です。",
  "Couldn’t post that — try again.":
    "投稿できませんでした——もう一度お試しください。",
  "Couldn’t publish — try again.":
    "公開できませんでした——もう一度お試しください。",
  "paste JSON": "JSON を貼り付け",
  "copy JSON": "JSON をコピー",
  "copy JSON ({n})": "JSON をコピー（{n}）",
  "＋ New matchup": "＋ 新しいマッチアップ",
  "＋ add teams": "＋ パーティを追加",
  "Paste a copied matchup": "コピーしたマッチアップを貼り付け",
  "Anything copied with {0} — one opposing team or a whole set.":
    "{0} でコピーしたものなら何でも——相手パーティ1つでも、グループ全体でも。",
  "Paste here…": "ここに貼り付け…",
  "Import notes": "読み込みの結果",
  dismiss: "閉じる",
  "Showing the matchups saved in this browser. {0} to also see the ones synced to your account.":
    "このブラウザに保存されたマッチアップを表示しています。{0}すると、アカウントに同期されたものも表示されます。",
  "Couldn’t load your account matchups: {error}. The browser ones are shown below.":
    "アカウントのマッチアップを読み込めませんでした：{error}。以下はブラウザ内のものです。",
  "Loading your matchups…": "マッチアップを読み込み中…",
  "No saved matchups yet. {0}": "保存されたマッチアップはまだありません。{0}",
  "Build one →": "作ってみる →",
  "team id {id}": "パーティ id {id}",
  "matchup id {id}": "マッチアップ id {id}",
  unpublish: "公開を取り消す",
  Unpublish: "公開を取り消す",
  "public ↗": "公開中 ↗",
  "open the published page": "公開ページを開く",
  "Take this off the web? Your set stays here.":
    "ウェブから取り下げますか？このグループは残ります。",
  "Take this off the web? Your set stays in your matchups.":
    "ウェブから取り下げますか？このグループはマイマッチアップに残ります。",
  "Taken down. The link no longer works for anyone.":
    "取り下げました。このリンクは誰からも開けません。",
  "Only you can see this — it's your post.":
    "これが見えるのはあなただけです——あなたの投稿です。",
  "Couldn’t take it down — try again.":
    "取り下げられませんでした——もう一度お試しください。",
  "Delete this set — {count} — from {places}, and take its published page down?":
    "{places}からこのグループ（{count}）を削除し、公開ページも取り下げますか？",
  "Delete this set — {count} — from {places}?":
    "{places}からこのグループ（{count}）を削除しますか？",
  "Delete set": "グループを削除",
  "not synced — retry": "未同期——再試行",
  "retrying…": "再試行中…",
  "this one isn’t in your account yet":
    "これはまだアカウントに同期されていません",
  "delete set": "グループを削除",
  "Delete from {places}?": "{places}から削除しますか？",
  "this browser": "このブラウザ",
  "your account": "あなたのアカウント",
  "copy {team} and all {count} as JSON":
    "{team} とその {count}をまとめて JSON にコピー",
  "add opposing teams to plan against {team}":
    "{team} で戦う相手パーティを追加",
  "delete {team} and all {count} it has": "{team} とその {count}を削除",
  "open {name}": "{name} を開く",
  "no plan yet": "プラン未作成",
  browser: "ブラウザ",
  account: "アカウント",
  upload: "アップロード",
  delete: "削除",

  // ── /demo (builder setup) ──────────────────────────────────────────────────
  "your team, then every team you expect to face — one plan each":
    "まず自分のパーティ、次に当たりそうなパーティをすべて——それぞれにプランを1つずつ",
  "My Team": "自分のパーティ",
  "Opposing teams": "相手パーティ",
  "New team": "新しいパーティ",
  "use existing": "既存から選ぶ",
  "Use existing": "既存から選ぶ",
  "+ import a new one instead": "＋ 代わりに新しく読み込む",
  "+ import new ones instead": "＋ 代わりに新しく読み込む",
  "No other saved teams yet — import one.":
    "保存された他のパーティはまだありません——読み込んでください。",
  "type the six, or paste several teams at once — one matchup each":
    "6匹を入力するか、複数のパーティをまとめて貼り付け——それぞれにマッチアップが1件",
  Remove: "削除",
  open: "開く",
  plan: "プラン",
  sample: "サンプル",
  samples: "サンプル",
  all: "すべて",
  "Searching…": "検索中…",
  "No team with that code or name.":
    "その番号・名前のパーティは見つかりません。",
  "Forget this team?": "このパーティをライブラリから削除しますか？",
  Forget: "削除",
  "forget {team}": "{team} を削除",
  "panel|← back to options": "← 選択に戻る",
  "Search VGCPastes — MB712, MC20, or a team name":
    "VGCPastes を検索——MB712、MC20、またはパーティ名",
  "Every team on the VGCPastes sheet — search it, or pick from your own and the samples below.":
    "VGCPastes シートの全パーティ——検索するか、下の自分のパーティとサンプルから選べます。",
  "clear the search": "検索をクリア",
  "samples from every regulation": "すべてのレギュレーションのサンプル",
  imported: "読み込み",
  saved: "保存済み",
  Simulate: "シミュレート",
  "vs. {team}": "対 {team}",
  "Your other teams": "他のパーティ",

  // ── import panel / team panel (app/demo/components.tsx) ────────────────────
  "Add — {label}": "追加 — {label}",
  "Import — {label}": "読み込み — {label}",
  paste: "貼り付け",
  "type names": "名前を入力",
  "Type a few letters and pick the Pokémon — {0} finds Pikachu. Six makes a team; sets and items come from a paste.":
    "数文字入力してポケモンを選んでください——{0} で Pikachu が見つかります。6匹でパーティになります。技や持ち物は貼り付けから読み込まれます。",
  "Paste one team or many — several pokepast.es links (one per line), a multi-team export split by {0} lines, or one comma-separated species list per line.":
    "パーティは1つでも複数でも貼り付けられます——pokepast.es のリンクを1行に1つ、{0} 行で区切った複数パーティのエクスポート、または1行につきカンマ区切りのポケモン名。",
  "Paste a team — a pokepast.es link, a Showdown/teambuilder export, or just species names separated by commas.":
    "パーティを貼り付けてください——pokepast.es のリンク、Showdown／パーティ構築のエクスポート、あるいはカンマ区切りのポケモン名だけでも。",
  Format: "レギュレーション",
  "Team name (optional)": "パーティ名（任意）",
  "Team name (optional — one team only)": "パーティ名（任意・1パーティのみ）",
  rename: "名前を変更",
  "rename {team}": "{team} の名前を変更",
  "Team — six Pokémon": "パーティ——ポケモン6匹",
  "Teams — pokepaste links, exports, or species names":
    "パーティ——pokepaste のリンク、エクスポート、ポケモン名",
  "Team — pokepaste, export, or species names":
    "パーティ——pokepaste、エクスポート、ポケモン名",
  "Add team": "パーティを追加",
  "Add teams": "パーティを追加",
  Add: "追加",
  "Couldn't fetch one of those pastes — check the links.":
    "貼り付けたリンクの1つを取得できませんでした——リンクを確認してください。",
  "Couldn't fetch that paste — check the link.":
    "その貼り付けリンクを取得できませんでした——リンクを確認してください。",
  "That doesn't parse as a team export or a species list.":
    "パーティのエクスポートでも、ポケモン名の一覧でもありません。",
  Sets: "構成",
  "Copy export": "エクスポートをコピー",
  "Ability: {value}": "とくせい：{value}",
  "EVs: {value}": "努力値：{value}",
  "{nature} Nature": "{nature} 性格",
  "pasted in on {date} · your own plans for these six are a separate set":
    "{date} に貼り付け · この6匹に対する自分のプランは別グループです",

  // ── species picker ─────────────────────────────────────────────────────────
  "remove {name}": "{name} を削除",
  "slot {n}": "{n} 番目",
  "type…": "入力…",
  "no Pokémon by that name — paste the export instead":
    "その名前のポケモンはいません——エクスポートを貼り付けてください",
  "loading names…": "名前を読み込み中…",
  "more matches — keep typing": "候補がまだあります——続けて入力",
  "click a slot and type — {0} finds Pikachu":
    "枠をクリックして入力——{0} で Pikachu が見つかります",

  // ── catalogue lookup ───────────────────────────────────────────────────────
  "looking…": "検索中…",
  "does this look like a known team? ({n} named)":
    "既知のパーティか調べますか？（{n} 匹入力済み）",
  "Published teams sharing {min}+": "{min} 匹以上が一致する公開パーティ",
  close: "閉じる",
  "The team catalogue needs an account backend configured — this build is running browser-only.":
    "パーティカタログにはアカウント用のバックエンド設定が必要です——このビルドはブラウザ内だけで動作しています。",
  "Couldn't reach the catalogue — {error}":
    "カタログに接続できませんでした——{error}",
  "No published team shares {min} of these. Nothing is wrong — the catalogue is Champions teams from VGCPastes, not every team.":
    "このうち {min} 匹が一致する公開パーティはありません。異常ではありません——カタログは VGCPastes の Champions のパーティであって、すべてのパーティではありません。",
  untitled: "無題",
  "{n} published pastes of this same six": "同じ6匹の公開ペーストが {n} 件",
  "paste ↗": "ペーストを見る ↗",
  "Reference only — nothing here changes the team you're building.":
    "参考表示のみ——ここでの操作で作成中のパーティは変わりません。",

  // ── /demo/sim (the board) ──────────────────────────────────────────────────
  "{0} vs. {1}": "{0} 対 {1}",
  "previous opponent": "前の相手",
  "next opponent": "次の相手",
  "this board (unsaved)": "このボード（未保存）",
  "{n}. vs {team}": "{n}. 対 {team}",
  "{n}. vs {team} · no plan yet": "{n}. 対 {team} · プラン未作成",
  "{i} of {total}": "{total} 件中 {i} 件目",
  " · {n} planned": " · {n} 件作成済み",
  "add another opposing team to plan against {team}":
    "{team} で戦う相手パーティをさらに追加",
  "+ add opponent": "＋ 相手を追加",
  "copy this board as JSON — paste it here or on My matchups":
    "このボードを JSON にコピー——ここか「マイマッチアップ」に貼り付けられます",
  "Copy JSON": "JSON をコピー",
  Load: "読み込む",
  "Import a matchup workflow": "マッチアップの手順を読み込む",
  "Paste a workflow copied with Copy JSON…":
    "「JSON をコピー」でコピーした内容を貼り付け…",
  "how the board works": "ボードの使い方",
  "damage calculator ↗": "ダメージ計算機 ↗",
  "turn 0 is team preview — pick the four you bring":
    "ターン0は選出画面——連れて行く4匹を選びます",
  "from turn 1, click a front slot to declare its move":
    "ターン1からは、場の枠をクリックして技を指定します",
  "moves are optional; spread moves aim themselves":
    "技の入力は任意です。全体技は自動で対象が決まります",
  "a Pokémon that switches in can’t also move":
    "交代で出てきたポケモンは技を出せません",
  "a Mega Stone holder can Mega and move the same turn":
    "メガストーンを持つポケモンは、同じターンにメガシンカして技も出せます",
  "positions carry into the next turn automatically":
    "配置は次のターンに自動で引き継がれます",
  "right-click a Pokémon to faint it":
    "ポケモンを右クリックするとひんし状態にできます",
  "⑂ records an alternate version of that same turn":
    "⑂ は同じターンの別の展開を記録します",
  "turn 2 is the last": "ターン2までです",
  "account sync failed: {error}": "アカウントへの同期に失敗しました：{error}",
  "saved to this browser, but the account sync failed: {error}":
    "このブラウザには保存しましたが、アカウントへの同期に失敗しました：{error}",
  "saved as “{name}” · {time}": "「{name}」として保存 · {time}",
  "saved as “{name}” · {time} · synced to your account":
    "「{name}」として保存 · {time} · アカウントに同期済み",
  "not saved yet — Save keeps this board":
    "未保存——「保存」でこのボードを残せます",
  "No teams set. {0}": "パーティが設定されていません。{0}",
  "Pick teams first →": "先にパーティを選ぶ →",
  "The other opposing team is in this team's matchups.":
    "もう1つの相手パーティは、このパーティのマッチアップ一覧にあります。",
  "The other {n} opposing teams are in this team's matchups.":
    "他の {n} 件の相手パーティは、このパーティのマッチアップ一覧にあります。",
  "Turn {n}": "ターン {n}",
  "⑂ alternate turn {n}": "⑂ ターン {n} の別展開",
  "⑂ alternate turn {n} · after turn {p}":
    "⑂ ターン {n} の別展開 · ターン {p} のあと",
  "+ turn {n}": "＋ ターン {n}",
  "⑂ branch": "⑂ 分岐",
  remove: "削除",
  "Opposing Team": "相手パーティ",
  "slot|Front": "場",
  "slot|Back": "後発",
  // Board pickers and slot tooltips.
  "{species} switched in this turn — switching is its action, so it can’t also move.":
    "{species} はこのターン交代で出てきました——交代が行動なので、技は出せません。",
  "⟡ Mega — recorded": "⟡ メガシンカ記録済み",
  "⟡ Mega Evolve": "⟡ メガシンカ",
  "no moves in this import": "この読み込みには技の情報がありません",
  "switch out": "交代で下げる",
  "switch to {species}": "{species} に交代",
  "no move — just position": "技なし——配置だけ記録",
  "send to bench": "未選出に戻す",
  target: "対象",
  "{species} (self)": "{species}（自分）",
  "{species} (ally)": "{species}（味方）",
  "no target": "対象なし",
  "{species} — click to send back": "{species} — クリックで後発に戻す",
  "{species} — not brought (chosen at turn 1)":
    "{species} — 未選出（ターン1で決定）",
  "{species} — fainted (right-click to revive)":
    "{species} — ひんし（右クリックで復帰）",
  "{species} — switched in this turn": "{species} — このターン交代で登場",
  "{species} — declare a move, Mega, or send back":
    "{species} — 技・メガシンカを指定、または後発に戻す",
  "{species} switched in this turn — no move":
    "{species} はこのターン交代で登場——技なし",
  "{species} — declare a move or Mega": "{species} — 技またはメガシンカを指定",
  "{species}: {detail}": "{species}：{detail}",
  "Mega, ": "メガシンカ、",
  " → {target}": " → {target}",
  "close move picker": "技の選択を閉じる",
  "Mega Evolves": "メガシンカ",
  "switched in": "交代で登場",
  "+ move": "＋ 技",
  "▾ note": "▾ メモ",
  "+ note": "＋ メモ",
  "save note": "メモを保存",
  "Why this line, what to watch for — optional":
    "なぜこの展開か、何に注意するか——任意",

  // ── /demo/lookup ───────────────────────────────────────────────────────────
  "Loading…": "読み込み中…",
  "This matchup isn’t here — the link may be wrong, or its author removed it.":
    "このマッチアップは見つかりません——リンクが違うか、作成者が削除した可能性があります。",
  "This matchup couldn’t be read — it may have been published by a newer version.":
    "このマッチアップを読み取れません——新しいバージョンで公開された可能性があります。",
  "by {author}": "作成者 {author}",
  "by a deleted account": "削除されたアカウント",
  // フォーク is understood but reads as a git word; 複製 ("duplicate") says
  // what actually happens — an editable copy of your own.
  "⑂ Fork into my builder": "⑂ 自分のエディタに複製",
  "Copying…": "複製中…",
  "Makes your own editable copy. This page doesn’t change.":
    "自分用の編集できるコピーを作ります。このページは変わりません。",
  // The guide's own prose (gameplan, reason, matchup names) is the author's
  // content, not chrome, and is deliberately left as written.
  // Condition and action phrasing (built outside JSX).
  "No weather": "天候なし",
  "No terrain": "フィールドなし",

  // ── landing ────────────────────────────────────────────────────────────────
  "Matchup planning for Pokémon doubles":
    "ポケモンダブルバトルのマッチアップ設計",
  "See turn one coming.": "1ターン目を、見通す。",
  "Try New Match Ups!": "新しいマッチアップを作る！",
  "guide lookup →": "ガイド検索 →",
  "xatu turns the “vs. common teams” part of a team report into a turn-by-turn map: what you lead, what your opponent reacts, what diverges next turn. Named after the bird that sees past and future at the same time.":
    "xatu はパーティ報告の「よく当たるパーティ対策」の部分を、逐ターンの地図に変えます——どう先発し、相手がどう応じ、次のターンでどこが分岐するか。過去と未来を同時に見る鳥から名前を取りました。",
  "Yours, then everyone’s": "まずは自分のもの、それからみんなのもの",
  "Teams and boards save in your browser — no account needed. Sign in to sync them, publish one for a short link that previews your six, and readers can fork it without touching your copy.":
    "パーティも戦術板もブラウザに保存——アカウント不要。ログインで同期、公開すれば6匹入りの短いリンクが手に入り、読んだ人は自分用に複製できます（原本はそのまま）。",
  "Branch the turn, not the essay": "分岐させるのはターン、文章ではない",
  "A different opposing lead is an alternate of the same turn, not a new paragraph. Map the two or three lines you actually play — unwritten branches simply don’t exist.":
    "相手の先発が変われば、それは同じターンの別展開であって、新しい段落ではありません。実際に選ぶ2〜3本の展開だけを描いてください——書かれていない分岐は、存在しません。",
  "Paste in, paste out": "貼り付けて入れ、貼り付けて出す",
  "Import a pokepast.es link, a Showdown export, or a bare list of species. Moves come with their real type colors, and spread moves already know they aim themselves.":
    "pokepast.es のリンク、Showdown のエクスポート、ポケモン名の一覧だけでも読み込めます。技には実際のタイプ色が付き、全体技は対象を自分で決めることを最初から知っています。",
  "The whole gameplan, portable": "戦略まるごと、持ち運べる",
  "A finished matchup tree is a few hundred bytes of JSON. Copy it out of the builder, post it under your team report, paste it back in — same board.":
    "完成したマッチアップツリーは数百バイトの JSON です。ビルダーからコピーして構築記事に貼り、また貼り戻せば——同じボードが戻ります。",
  "A miniature matchup tree: team preview branching into two turn-one lines":
    "小さなマッチアップツリー：選出画面から1ターン目の2つの展開へ分岐",
  "Turn 0 · team preview": "ターン0 · 選出",
  "⑂ if they lead {species}": "⑂ 相手が {species} を先発したら",
};
