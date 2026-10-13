/**
 * Simplified Chinese, keyed by the English source string.
 *
 * Glossary — keep these consistent, they are the words the whole UI turns on:
 *
 *   matchup      对阵        one of your teams planned against one opposing team
 *   set / group  一组对阵     every matchup sharing one of your teams
 *   team         队伍        my team 我的队伍 · opposing team 对手队伍
 *   board        战术板      the turn tree at /demo/sim
 *   turn         回合        turn 0 is 选人 (team preview), not 第 0 回合 alone
 *   lead         首发        the two you send out first
 *   back         后备        the two behind them  (nav "back" is 返回 — different key)
 *   bring / pick 选四        bring 6 pick 4 → 带六选四
 *   branch       分支        the ⑂ alternate line
 *   plan         计划        "no plan yet" 尚未规划
 *   paste/import 粘贴 / 导入
 *
 * Pokémon data — species, moves, items, abilities, natures, types, regulation
 * strings — is never in here. It is a lookup key for the sprite sheet and the
 * dex, and translating it breaks them silently.
 */

export const ZH: Record<string, string> = {
  // ── shared chrome ──────────────────────────────────────────────────────────
  "Published matchups": "已发布的对阵",
  published: "已发布",
  Newest: "最新",
  "Most liked": "最多喜欢",
  "from the community": "来自社区",
  "Publish yours →": "发布你的 →",
  "see all →": "查看全部 →",
  "Nothing published yet.": "还没有发布的内容。",
  "Publish one from My matchups →": "去“我的对阵”发布一个 →",
  "Add a comment": "写下评论",
  "Post comment": "发表评论",
  "Posting…": "发表中…",
  "No comments yet.": "还没有评论。",
  "Delete this comment?": "删除这条评论？",
  "a deleted account": "已注销的账号",
  "Sign in to like or comment.": "登录后才能点赞或评论。",
  "to like or comment.": "后即可点赞或评论。",
  "💬 {n}": "💬 {n}",
  "back to the home page": "返回首页",
  "back to the previous page": "返回上一页",
  home: "首页",
  "nav|← back": "← 返回",
  builder: "构建器",
  matchups: "对阵",
  "Which of your teams?": "用你的哪支队伍？",
  "my matchups": "我的对阵",
  cancel: "取消",
  Delete: "删除",
  Save: "保存",
  Import: "导入",
  Reset: "重置",
  "Copied ✓": "已复制 ✓",
  "Fetching…": "获取中…",
  github: "github",
  "xatu is an unaffiliated, non-commercial fan project. Pokémon is owned by Nintendo, The Pokémon Company, Game Freak, and Creatures.":
    "xatu 是非官方、非商业的粉丝项目。宝可梦版权归任天堂、宝可梦公司、Game Freak 和 Creatures 所有。",

  // ── document metadata ──────────────────────────────────────────────────────
  "xatu — see turn one coming": "xatu — 预见第一回合",
  "Turn matchup notes into a turn-by-turn map for Pokémon doubles: which four you bring, who leads, and what happens next.":
    "把对阵笔记变成宝可梦双打的逐回合地图：带哪四只、谁首发、接下来会发生什么。",

  // ── language toggle ────────────────────────────────────────────────────────
  Language: "语言",
  "Switch to English": "切换到英文",
  "Switch to Chinese": "切换到中文",
  "Switch to Japanese": "切换到日文",

  // ── account ────────────────────────────────────────────────────────────────
  Username: "用户名",
  "Pick a username": "设置用户名",
  edit: "修改",
  set: "设置",
  "That username is taken.": "该用户名已被占用。",
  "That username is reserved.": "该用户名为保留名称。",
  "Usernames are 3–20 characters.": "用户名需为 3–20 个字符。",
  "Letters, digits, - and _ only.": "只能使用字母、数字、- 和 _。",
  "Couldn’t save that — try again.": "保存失败——请重试。",
  "The only thing shown on your posts. Change it anytime.":
    "这是你的帖子上唯一会显示的信息，随时可以修改。",
  "Needed before you can publish or comment.": "发布或评论前需要先设置。",
  "sign in": "登录",
  "Sign in": "登录",
  "My matchups": "我的对阵",
  "Sign out": "退出登录",
  "close account menu": "关闭账号菜单",
  "account menu for {email}": "{email} 的账号菜单",

  // ── /login ─────────────────────────────────────────────────────────────────
  // Supabase Auth, PostgREST and Zod all emit English we don't control. The
  // frame around the message is translated; the message itself is passed
  // through, which is honest rather than a half-guessed mapping.
  "Accounts aren’t set up in this build. Everything still works without one — teams and matchups save to your browser. {0}":
    "此版本没有配置账号。不用账号一样能用——队伍和对阵都会存在你的浏览器里。{0}",
  "my matchups →": "我的对阵 →",
  "Open my matchups →": "打开我的对阵 →",
  "Open my matchups": "打开我的对阵",
  "Signed in as {0}": "已登录：{0}",
  "sign out": "退出登录",
  "Create an account": "注册账号",
  "Create account": "注册",
  "An account syncs your teams and matchups across browsers. Only you can see them. Everything also works without one.":
    "账号会在不同浏览器之间同步你的队伍和对阵，只有你自己看得到。不注册也完全能用。",
  "Continue with Google": "使用 Google 继续",
  or: "或",
  email: "邮箱",
  password: "密码",
  username: "用户名",
  "No account with that username.": "没有这个用户名的账号。",
  "Wrong username or password.": "用户名或密码不对。",
  "Account created — sign in with it.": "账号已创建——用它登录吧。",
  "That’s 3 accounts from this connection today — try again tomorrow.":
    "今天这个网络已经注册了 3 个账号——明天再试。",
  "Passwords are 8 characters or more.": "密码至少 8 个字符。",
  "Couldn’t create that account — try again.": "账号创建失败——请重试。",
  "No email, so no password reset — keep it somewhere safe, or use Google instead.":
    "没有邮箱，也就没有找回密码——请妥善保管，或者改用 Google 登录。",
  "password (8+ characters)": "密码（至少 8 位）",
  "New here? {0}": "第一次来？{0}",
  "Already have an account? {0}": "已经有账号了？{0}",

  // ── counted nouns ──────────────────────────────────────────────────────────
  // Both English forms are separate keys; Chinese maps them to one string.
  "{n} matchup": "{n} 个对阵",
  "{n} matchups": "{n} 个对阵",
  "{n} team": "{n} 支队伍",
  "{n} teams": "{n} 支队伍",
  "{n} opposing team": "{n} 支对手队伍",
  "{n} opposing teams": "{n} 支对手队伍",
  "{n} state": "{n} 个状态",
  "{n} states": "{n} 个状态",

  // ── import summaries (app/demo/import-group.ts) ────────────────────────────
  "Already had this matchup — no plan changed; the set is now called “{team}”.":
    "这个对阵你已经有了——计划没有任何改动；这一组现在叫“{team}”。",
  "Already had these {count} — no plan changed; the set is now called “{team}”.":
    "这 {count}你已经有了——计划没有任何改动；这一组现在叫“{team}”。",
  "Nothing to import — you already have this exact matchup for {team}.":
    "没有要导入的内容——{team} 的这个对阵你已经有了，且完全相同。",
  "Nothing to import — you already have these exact {count} for {team}.":
    "没有要导入的内容——{team} 的这 {count}你已经有了，且完全相同。",
  "{n} new": "{n} 个新增",
  "{n} updated": "{n} 个更新",
  "{n} already identical": "{n} 个完全相同",
  "detail| — {parts}": "——{parts}",
  "list|, ": "、",
  "Imported {count} as a separate set for {team}{detail}":
    "已把 {count}作为 {team} 的独立一组导入{detail}",
  "sentence|{head}.": "{head}。",
  "clause|{head}; {tail}": "{head}；{tail}",
  "clause|{head} — {tail}": "{head}——{tail}",
  "your 1 for this team was left alone.": "你自己给这支队伍写的 1 个原封不动。",
  "your {n} for this team were left alone.":
    "你自己给这支队伍写的 {n} 个原封不动。",
  "Imported {count} for {team}{detail}.": "已为 {team} 导入 {count}{detail}。",

  // ── paste decoding (app/demo/workflow-io.ts) ───────────────────────────────
  // The label and the punctuation joining it to the warning are part of the
  // key, so Chinese gets its full-width colon instead of an ASCII ": ".
  "Card {n} (turn {t})": "第 {n} 张卡（第 {t} 回合）",
  "{label}, my side": "{label}，我方",
  "{label}, opposing side": "{label}，对手方",
  "vs {opp} — {warning}": "对阵 {opp} —— {warning}",
  "slot|front": "前排",
  "slot|back": "后备",
  "slot|fainted": "已倒下",
  '{label}: reference "{c}" is off the roster — dropped.':
    "{label}：引用“{c}”不在队伍中——已忽略。",
  "{label}: {species} was placed twice — kept its first placement.":
    "{label}：{species} 被放置了两次——保留第一次的位置。",
  "{label}: {group} had more than {cap} — {species} moved to the bench.":
    "{label}：{group}超过了 {cap} 只——{species} 已移到替补。",
  '{label}: unreadable move entry "{entry}" — dropped.':
    "{label}：无法解析的招式条目“{entry}”——已忽略。",
  "{label}: a move points off the roster — dropped.":
    "{label}：有招式指向队伍之外——已忽略。",
  "{label}: {species} has a move but isn't in front — move dropped.":
    "{label}：{species} 有招式但不在前排——招式已忽略。",
  "{label}: {species}'s move target is unreadable — dropped.":
    "{label}：{species} 的招式目标无法解析——已忽略。",
  "{label}: the recorded Mega points off the roster — dropped.":
    "{label}：记录的 Mega 指向队伍之外——已忽略。",
  "{label}: {species} Megas but isn't in front — dropped.":
    "{label}：{species} 进行了 Mega 进化但不在前排——已忽略。",
  "{label}: {attacker}'s move target isn't on the field — dropped.":
    "{label}：{attacker} 的招式目标不在场上——已忽略。",
  "{label}: moves aren't recorded at team preview — dropped.":
    "{label}：选人阶段不记录招式——已忽略。",
  "Card {n}: invalid parent reference — treated as an alternate turn 1.":
    "第 {n} 张卡：上一张卡的引用无效——已作为第 1 回合的另一分支处理。",
  "Unknown Pokémon: {names} — not importing.":
    "无法识别的宝可梦：{names}——本次不导入。",
  "That isn't valid JSON.": "这不是有效的 JSON。",
  "That isn't a workflow document.": "这不是一份对阵文档。",
  "The workflow's teams are malformed.": "文档中的队伍格式有误。",
  "The document has no opposing teams.": "这份文档没有任何对手队伍。",
  "The workflow's turn list is malformed.": "文档中的回合列表格式有误。",

  // ── /matchups ──────────────────────────────────────────────────────────────
  publish: "发布",
  "Team report": "队伍报告",
  "That set isn’t in this browser.": "这个浏览器里没有这一组。",
  Title: "标题",
  Summary: "简介",
  "Shown when you post the link, and on the feed.":
    "分享链接时和动态列表里会显示这段。",
  "The report": "报告正文",
  "Write between the matchups. Type a Pokémon’s name in colons — :Incineroar: — to drop its sprite into the line.":
    "在各个对阵之间写内容。用冒号括住宝可梦名字——:Incineroar:——就能把它的图标插进这一行。",
  "+ add text here": "+ 在这里加一段",
  "Why this matchup goes the way it does…": "这个对阵为什么这么打……",
  "+ Pokémon sprite": "+ 宝可梦图标",
  "edit this text": "编辑这段文字",
  done: "完成",
  "Pokémon name…": "宝可梦名字…",
  Preview: "预览",
  "Publishing…": "发布中…",
  "Update the published page": "更新已发布的页面",
  "see the page ↗": "查看页面 ↗",
  "Pick a username first — it’s your byline.": "请先设置用户名——它会作为署名。",
  report: "报告",
  "write the report that goes with {team}": "撰写 {team} 的队伍报告",
  "publish set →": "发布这一组 →",
  "publish {team} and everything you've planned against":
    "发布 {team} 以及你为它规划的全部对阵",
  "publish {team} so anyone can read it": "发布 {team}，让任何人都能查看",
  Publish: "发布",
  Published: "已发布",
  "copy link": "复制链接",
  "open it ↗": "打开 ↗",
  "Anyone with the link can read it. Publish again to update it.":
    "任何拿到链接的人都能查看。再次发布即可更新。",
  "Pick a username first — it’s your byline. Open the account menu.":
    "请先设置用户名——它会作为署名。在账号菜单里设置。",
  "Sign in to publish.": "登录后才能发布。",
  "That’s 5 new posts today — the daily limit. Editing a post you already published still works.":
    "今天已经发布 5 个新帖子——达到每日上限。已发布的帖子仍然可以继续修改。",
  "That’s 30 comments today — the daily limit.":
    "今天已经发表 30 条评论——达到每日上限。",
  "Couldn’t post that — try again.": "这条没能发出去——请重试。",
  "Couldn’t publish — try again.": "发布失败——请重试。",
  "paste JSON": "粘贴 JSON",
  "copy JSON": "复制 JSON",
  "copy JSON ({n})": "复制 JSON（{n}）",
  "＋ New matchup": "＋ 新建对阵",
  "＋ add teams": "＋ 添加队伍",
  "Paste a copied matchup": "粘贴已复制的对阵",
  "Anything copied with {0} — one opposing team or a whole set.":
    "任何用 {0} 复制出来的内容——单支对手队伍，或者一整组。",
  "Paste here…": "粘贴到这里…",
  "Import notes": "导入说明",
  dismiss: "关闭",
  "Showing the matchups saved in this browser. {0} to also see the ones synced to your account.":
    "这里显示的是保存在此浏览器中的对阵。{0}即可同时看到已同步到账号的对阵。",
  "Couldn’t load your account matchups: {error}. The browser ones are shown below.":
    "无法加载账号中的对阵：{error}。下面显示的是浏览器里的。",
  "Loading your matchups…": "正在加载你的对阵…",
  "No saved matchups yet. {0}": "还没有保存任何对阵。{0}",
  "Build one →": "去建一个 →",
  "team id {id}": "队伍 id {id}",
  "matchup id {id}": "对阵 id {id}",
  unpublish: "取消发布",
  Unpublish: "取消发布",
  "public ↗": "已公开 ↗",
  "open the published page": "打开已发布的页面",
  "Take this off the web? Your set stays here.":
    "把它从网上撤下吗？你的这一组会保留。",
  "Take this off the web? Your set stays in your matchups.":
    "把它从网上撤下吗？这一组仍会留在你的对阵里。",
  "Taken down. The link no longer works for anyone.":
    "已撤下，这个链接对所有人都失效了。",
  "Your post — only you see these.": "你的帖子——这些只有你能看到。",
  "edit this post": "编辑这篇帖子",
  "Couldn’t take it down — try again.": "撤下失败——请重试。",
  "Delete this set — {count} — from {places}, and take its published page down?":
    "从{places}删除这一组（{count}），并撤下它已发布的页面？",
  "Delete this set — {count} — from {places}?":
    "从{places}删除这一组（{count}）？",
  "Delete set": "删除整组",
  "not synced — retry": "未同步——重试",
  "retrying…": "重试中…",
  "this one isn’t in your account yet": "这一条还没有同步到你的账号",
  "delete set": "删除整组",
  "Delete from {places}?": "从{places}删除？",
  "this browser": "此浏览器",
  "your account": "你的账号",
  "copy {team} and all {count} as JSON":
    "把 {team} 和它的 {count}一起复制为 JSON",
  "add opposing teams to plan against {team}":
    "添加对手队伍，用来规划对阵 {team}",
  "delete {team} and all {count} it has": "删除 {team} 及其 {count}",
  "open {name}": "打开 {name}",
  "no plan yet": "尚未规划",
  browser: "浏览器",
  account: "账号",
  upload: "上传",
  delete: "删除",

  // ── /demo (builder setup) ──────────────────────────────────────────────────
  "your team, then every team you expect to face — one plan each":
    "先选你的队伍，再加上你预计会遇到的每一支队伍——每支一份计划",
  "My Team": "我的队伍",
  "Opposing teams": "对手队伍",
  "New team": "新建队伍",
  "use existing": "使用已有的",
  "Use existing": "使用已有的",
  "+ import a new one instead": "＋ 改为导入一支新的",
  "+ import new ones instead": "＋ 改为导入新的队伍",
  "No other saved teams yet — import one.":
    "还没有其他保存过的队伍——先导入一支。",
  "type the six, or paste several teams at once — one matchup each":
    "输入六只，或者一次粘贴多支队伍——每支各生成一个对阵",
  Remove: "移除",
  open: "打开",
  plan: "规划",
  sample: "示例",
  samples: "示例队伍",
  all: "全部",
  "Searching…": "搜索中…",
  "No team with that code or name.": "没有找到对应编号或名称的队伍。",
  "Forget this team?": "从库中移除这支队伍？",
  Forget: "移除",
  "forget {team}": "移除 {team}",
  "panel|← back to options": "← 返回选项",
  "Search VGCPastes — MB712, MC20, or a team name":
    "搜索 VGCPastes——MB712、MC20，或队伍名称",
  "Every team on the VGCPastes sheet — search it, or pick from your own and the samples below.":
    "VGCPastes 表格里的全部队伍——可以搜索，也可以直接从下面你自己的队伍和示例里选。",
  "clear the search": "清除搜索",
  "samples from every regulation": "所有赛制的示例队伍",
  imported: "导入",
  saved: "已保存",
  Simulate: "开始推演",
  "vs. {team}": "对阵 {team}",
  "Your other teams": "你的其他队伍",

  // ── import panel / team panel (app/demo/components.tsx) ────────────────────
  "Add — {label}": "添加 — {label}",
  "Import — {label}": "导入 — {label}",
  paste: "粘贴",
  "type names": "输入名字",
  "Type a few letters and pick the Pokémon — {0} finds Pikachu. Six makes a team; sets and items come from a paste.":
    "输入几个字母再选宝可梦——{0} 就能找到 Pikachu。凑满六只即成队伍；配招和道具需要从粘贴文本导入。",
  "Paste one team or many — several pokepast.es links (one per line), a multi-team export split by {0} lines, or one comma-separated species list per line.":
    "可以粘贴一支或多支队伍——多个 pokepast.es 链接（每行一个）、用 {0} 分隔的多队导出文本，或者每行一组用逗号分隔的宝可梦名字。",
  "Paste a team — a pokepast.es link, a Showdown/teambuilder export, or just species names separated by commas.":
    "粘贴一支队伍——pokepast.es 链接、Showdown／队伍编辑器导出文本，或者只用逗号分隔的宝可梦名字。",
  Format: "赛制",
  "Team name (optional)": "队伍名称（可选）",
  "Team name (optional — one team only)": "队伍名称（可选，仅限单支队伍）",
  rename: "重命名",
  "rename {team}": "重命名 {team}",
  "Team — six Pokémon": "队伍——六只宝可梦",
  "Teams — pokepaste links, exports, or species names":
    "队伍——pokepaste 链接、导出文本或宝可梦名字",
  "Team — pokepaste, export, or species names":
    "队伍——pokepaste、导出文本或宝可梦名字",
  "Add team": "添加队伍",
  "Add teams": "添加队伍",
  Add: "添加",
  "Couldn't fetch one of those pastes — check the links.":
    "其中一个粘贴链接获取失败——请检查链接。",
  "Couldn't fetch that paste — check the link.":
    "该粘贴链接获取失败——请检查链接。",
  "That doesn't parse as a team export or a species list.":
    "这段文本既不是队伍导出，也不是宝可梦名字列表。",
  Sets: "配置",
  "Copy export": "复制导出文本",
  "Ability: {value}": "特性：{value}",
  "EVs: {value}": "努力值：{value}",
  "{nature} Nature": "{nature} 性格",
  "pasted in on {date} · your own plans for these six are a separate set":
    "于 {date} 粘贴导入 · 你自己对这六只的计划是独立的一组",

  // ── species picker ─────────────────────────────────────────────────────────
  "remove {name}": "移除 {name}",
  "slot {n}": "第 {n} 格",
  "type…": "输入…",
  "no Pokémon by that name — paste the export instead":
    "没有叫这个名字的宝可梦——改用粘贴导出文本",
  "loading names…": "正在加载名称…",
  "more matches — keep typing": "还有更多匹配——继续输入",
  "click a slot and type — {0} finds Pikachu":
    "点一格再输入——{0} 就能找到 Pikachu",

  // ── catalogue lookup ───────────────────────────────────────────────────────
  "looking…": "查询中…",
  "does this look like a known team? ({n} named)":
    "看看是不是已知的队伍？（已填 {n} 只）",
  "Published teams sharing {min}+": "共有 {min} 只以上的已发布队伍",
  close: "关闭",
  "The team catalogue needs an account backend configured — this build is running browser-only.":
    "队伍库需要配置账号后端——当前版本只在浏览器本地运行。",
  "Couldn't reach the catalogue — {error}": "无法访问队伍库——{error}",
  "No published team shares {min} of these. Nothing is wrong — the catalogue is Champions teams from VGCPastes, not every team.":
    "没有已发布的队伍与其中 {min} 只重合。这不是出错——队伍库收录的是 VGCPastes 上的 Champions 队伍，并非全部队伍。",
  untitled: "未命名",
  "{n} published pastes of this same six": "同样这六只共有 {n} 份已发布的粘贴",
  "paste ↗": "查看粘贴 ↗",
  "Reference only — nothing here changes the team you're building.":
    "仅供参考——这里的内容不会改动你正在搭建的队伍。",

  // ── /demo/sim (the board) ──────────────────────────────────────────────────
  "{0} vs. {1}": "{0} 对阵 {1}",
  "previous opponent": "上一个对手",
  "next opponent": "下一个对手",
  "this board (unsaved)": "当前战术板（未保存）",
  "{n}. vs {team}": "{n}. 对阵 {team}",
  "{n}. vs {team} · no plan yet": "{n}. 对阵 {team} · 尚未规划",
  "{i} of {total}": "第 {i} / {total} 个",
  " · {n} planned": " · 已规划 {n} 个",
  "add another opposing team to plan against {team}":
    "再添加一支对手队伍，用来规划对阵 {team}",
  "+ add opponent": "＋ 添加对手",
  "copy this board as JSON — paste it here or on My matchups":
    "把这块战术板复制为 JSON——可以粘贴到这里或“我的对阵”",
  "Copy JSON": "复制 JSON",
  Load: "载入",
  "Import a matchup workflow": "导入一份对阵推演",
  "Paste a workflow copied with Copy JSON…": "粘贴用“复制 JSON”复制出来的推演…",
  "how the board works": "战术板怎么用",
  "damage calculator ↗": "伤害计算器 ↗",
  "turn 0 is team preview — pick the four you bring":
    "第 0 回合是选人——挑出要带的四只",
  "from turn 1, click a front slot to declare its move":
    "从第 1 回合起，点前排格子来指定招式",
  "moves are optional; spread moves aim themselves":
    "招式可以不填；范围招式会自动指定目标",
  "a Pokémon that switches in can’t also move": "换上场的宝可梦不能同时出招",
  "a Mega Stone holder can Mega and move the same turn":
    "携带 Mega 石的宝可梦可以在同一回合 Mega 并出招",
  "positions carry into the next turn automatically": "站位会自动带到下一回合",
  "right-click a Pokémon to faint it": "右键点击宝可梦可将其标记为倒下",
  "⑂ records an alternate version of that same turn":
    "⑂ 记录同一回合的另一种走法",
  "turn 2 is the last": "最多到第 2 回合",
  "account sync failed: {error}": "账号同步失败：{error}",
  "saved to this browser — couldn’t reach your account":
    "已保存到这个浏览器——但没能同步到你的账号",
  "saved to this browser, but the account sync failed: {error}":
    "已保存到此浏览器，但账号同步失败：{error}",
  "saved as “{name}” · {time}": "已保存为“{name}” · {time}",
  "saved as “{name}” · {time} · synced to your account":
    "已保存为“{name}” · {time} · 已同步到你的账号",
  "not saved yet — Save keeps this board": "尚未保存——点“保存”留下这块战术板",
  "No teams set. {0}": "还没有设置队伍。{0}",
  "Pick teams first →": "先去选队伍 →",
  "The other opposing team is in this team's matchups.":
    "另一支对手队伍已在这支队伍的对阵列表里。",
  "The other {n} opposing teams are in this team's matchups.":
    "另外 {n} 支对手队伍已在这支队伍的对阵列表里。",
  "Turn {n}": "第 {n} 回合",
  "⑂ alternate turn {n}": "⑂ 第 {n} 回合的另一走法",
  "⑂ alternate turn {n} · after turn {p}":
    "⑂ 第 {n} 回合的另一走法 · 承接第 {p} 回合",
  "+ turn {n}": "＋ 第 {n} 回合",
  "⑂ branch": "⑂ 分支",
  remove: "移除",
  "Opposing Team": "对手队伍",
  vs: "对",
  "slot|Front": "前排",
  "slot|Back": "后备",
  // Board pickers and slot tooltips.
  "{species} switched in this turn — switching is its action, so it can’t also move.":
    "{species} 本回合是换上场的——换人本身就是它的行动，不能再出招。",
  "⟡ Mega — recorded": "⟡ 已记录 Mega",
  "⟡ Mega Evolve": "⟡ Mega 进化",
  "no moves in this import": "这次导入没有招式信息",
  "switch out": "换下",
  "switch to {species}": "换上 {species}",
  "no move — just position": "不出招——只记站位",
  "send to bench": "收回替补",
  target: "目标",
  "{species} (self)": "{species}（自身）",
  "{species} (ally)": "{species}（我方）",
  "no target": "不指定目标",
  "{species} — click to send back": "{species} — 点击收回后备",
  "{species} — not brought (chosen at turn 1)":
    "{species} — 未带上场（在第 1 回合选定）",
  "{species} — fainted (right-click to revive)":
    "{species} — 已倒下（右键可复活）",
  "{species} — switched in this turn": "{species} — 本回合换上场",
  "{species} — declare a move, Mega, or send back":
    "{species} — 指定招式、Mega，或收回后备",
  "{species} switched in this turn — no move": "{species} 本回合换上场——不出招",
  "{species} — declare a move or Mega": "{species} — 指定招式或 Mega",
  "{species}: {detail}": "{species}：{detail}",
  "Mega, ": "Mega、",
  " → {target}": " → {target}",
  "close move picker": "关闭招式选择",
  "Mega Evolves": "已 Mega 进化",
  "switched in": "换上场",
  "+ move": "＋ 招式",
  "▾ note": "▾ 备注",
  "+ note": "＋ 备注",
  "save note": "保存备注",
  "Why this line, what to watch for — optional":
    "为什么这样走、要注意什么——可不填",

  // ── /demo/lookup ───────────────────────────────────────────────────────────
  "Loading…": "加载中…",
  "This matchup isn’t here — the link may be wrong, or its author removed it.":
    "找不到这个对阵——链接可能有误，或者作者已将其删除。",
  "This matchup couldn’t be read — it may have been published by a newer version.":
    "无法读取这个对阵——它可能是用更新的版本发布的。",
  "by {author}": "作者 {author}",
  "by a deleted account": "作者账号已注销",
  // 选出 is the VGC term for picking your four; a fork is a copy you may edit,
  // so 复制 ("copy") carries it better than 分叉 ("fork"), which in Chinese
  // reads as a git term and nothing else.
  "⑂ Fork into my builder": "⑂ 复制到我的编辑器",
  "Copying…": "复制中…",
  "Makes your own editable copy. This page doesn’t change.":
    "生成一份你自己的可编辑副本，本页面不会改变。",
  // The guide's own prose (gameplan, reason, matchup names) is the author's
  // content, not chrome, and is deliberately left as written.
  // Condition and action phrasing (built outside JSX).
  "No weather": "无天气",
  "No terrain": "无场地",

  // ── landing ────────────────────────────────────────────────────────────────
  "Matchup planning for Pokémon doubles": "宝可梦双打对阵规划",
  "See turn one coming.": "预见第一回合。",
  "Try New Match Ups!": "开始新的对阵！",
  "guide lookup →": "指南查询 →",
  "xatu turns the “vs. common teams” part of a team report into a turn-by-turn map: what you lead, what your opponent reacts, what diverges next turn. Named after the bird that sees past and future at the same time.":
    "xatu 把队伍报告里“对阵常见队伍”那一部分，变成一张逐回合的地图：你怎么首发、对手怎么应、下一回合在哪里分岔。名字取自那只同时看得见过去与未来的鸟。",
  "Branch the turn, not the essay": "要分支回合，而不是分段落",
  "A different opposing lead is an alternate of the same turn, not a new paragraph. You are free to create a new branch or proceed to the next turn.":
    "对手换一组首发，是同一回合的另一种走法，而不是新的一段文字。你可以开一条新分支，也可以直接走到下一回合。",
  "Team build & game preparation": "组队与赛前准备",
  "Worrying about the trending meta or your tournament opponent? Practice here so you don’t need to play 50 games on ladder.":
    "担心当前环境，或者下一场比赛的对手？先在这里把对局想清楚，不用在天梯上打五十场。",
  "Team report & sharing": "队伍报告与分享",
  "If you don’t want to write a 10,000-word team report, maybe one graph is enough.":
    "不想写一万字的队伍报告？也许一张图就够了。",
  "The whole gameplan, portable": "完整战术，随身携带",
  "A finished matchup tree is a few hundred bytes of JSON. Copy it out of the builder, post it under your team report, paste it back in — same board.":
    "一棵完整的对阵树只有几百字节 JSON。从构建器里复制出来，贴在你的队伍报告下面，再粘回来——还是同一块战术板。",
  "A miniature matchup tree: team preview branching into two turn-one lines":
    "一棵缩小的对阵树：从选人画面分出两条第一回合的走法",
  "Turn 0 · team preview": "第 0 回合 · 选人",
  "⑂ if they lead {species}": "⑂ 若对手首发 {species}",
};
