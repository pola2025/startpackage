(() => {
  const part = document.body.dataset.part || "A";
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const tg = (html, n, label, cls = "", tag = "span") =>
    `<${tag} class="target ring ${cls}" data-go="${n}" data-detail-label="${esc(label)}">${html}</${tag}>`;

  /* ---------- icons ---------- */
  const I = {
    vsc: '<svg viewBox="0 0 100 100"><path fill="#0065a9" d="M96.5 10.8 75.9.9a6.2 6.2 0 0 0-7.1 1.2L29.4 38 12.2 25a4.2 4.2 0 0 0-5.3.2l-5.5 5a4.2 4.2 0 0 0 0 6.2L16.3 50 1.4 63.6a4.2 4.2 0 0 0 0 6.2l5.5 5a4.2 4.2 0 0 0 5.3.2l17.2-13 39.4 36a6.2 6.2 0 0 0 7.1 1.2l20.6-9.9a6.2 6.2 0 0 0 3.5-5.6V16.4a6.2 6.2 0 0 0-3.5-5.6ZM75 72.7 45.1 50 75 27.3Z"/><path fill="#007acc" d="M96.5 10.8 75.9.9a6.2 6.2 0 0 0-7.1 1.2L29.4 38l45.6 34.7V27.3l-.1.1Z" opacity=".55"/></svg>',
    folder:
      '<svg viewBox="0 0 48 48"><path fill="#e8a33d" d="M4 10a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z"/><path fill="#f8c95c" d="M4 16h40v20a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z"/></svg>',
    drive:
      '<svg viewBox="0 0 48 48"><rect x="5" y="14" width="38" height="22" rx="3" fill="#cfd6df"/><rect x="5" y="28" width="38" height="8" rx="2" fill="#9aa6b5"/><circle cx="37" cy="32" r="1.6" fill="#3cd070"/><path fill="#0078d4" d="M12 17h7v7h-7zM20 17h7v7h-7zM12 25h7v2h-7zM20 25h7v2h-7z" opacity=".9"/></svg>',
    pc: '<svg viewBox="0 0 48 48"><rect x="6" y="8" width="36" height="24" rx="2" fill="#3b8fe0"/><rect x="9" y="11" width="30" height="18" fill="#9fd0ff"/><rect x="18" y="34" width="12" height="3" fill="#7b8794"/><rect x="13" y="37" width="22" height="3" rx="1" fill="#9aa6b5"/></svg>',
    bin: '<svg viewBox="0 0 48 48"><path fill="#cfd8e3" d="M12 12h24l-2.5 30h-19Z"/><path fill="#9aa6b5" d="M10 9h28v4H10z"/><path d="M18 17v20M24 17v20M30 17v20" stroke="#9aa6b5" stroke-width="2"/></svg>',
    g: '<svg viewBox="0 0 48 48"><path fill="#fbbc05" d="M10.5 28.6A13.9 13.9 0 0 1 10.1 24c0-1.6.3-3.1.8-4.6L4 14.1A23.8 23.8 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7Z"/><path fill="#ea4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8A23.6 23.6 0 0 0 24 0 24 24 0 0 0 2.6 13.3l7.9 6.1A14.3 14.3 0 0 1 24 9.5Z"/><path fill="#34a853" d="M24 38.5c-6.3 0-11.6-4-13.5-9.9l-7.9 6.1A24 24 0 0 0 24 48c6.2 0 11.9-2.2 16.1-6.1l-7.5-5.8a14.6 14.6 0 0 1-8.6 2.4Z"/><path fill="#4285f4" d="M47.5 24.5c0-1.6-.2-3.3-.5-4.9H24v9.3h13.2a11.3 11.3 0 0 1-4.6 7.2l7.5 5.8c4.4-4 7.4-10 7.4-17.4Z"/></svg>',
    gh: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M8 0C3.6 0 0 3.6 0 8a8 8 0 0 0 5.5 7.6c.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.6 4 .3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 16 8c0-4.4-3.6-8-8-8Z"/></svg>',
    apple:
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8a4.6 4.6 0 0 0-3.6-2c-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4a10.7 10.7 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.5-4.1ZM14 5.2A4.3 4.3 0 0 0 15 2a4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3.1A3.7 3.7 0 0 0 14 5.2Z"/></svg>',
    win: '<svg viewBox="0 0 24 24"><path fill="#0078d4" d="M2 2h9.5v9.5H2zM12.5 2H22v9.5h-9.5zM2 12.5h9.5V22H2zM12.5 12.5H22V22h-9.5z"/></svg>',
    winw: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M2 2h9.5v9.5H2zM12.5 2H22v9.5h-9.5zM2 12.5h9.5V22H2zM12.5 12.5H22V22h-9.5z"/></svg>',
    chrome:
      '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#db4437"/><path fill="#0f9d58" d="M24 46a22 22 0 0 1-19-33l11 19a9 9 0 0 0 15.6 0l-6.5 14Z"/><path fill="#ffcd40" d="M43 13a22 22 0 0 1-18.9 33l11-19a9 9 0 0 0 0-9Z"/><circle cx="24" cy="24" r="9.5" fill="#fff"/><circle cx="24" cy="24" r="7.5" fill="#4285f4"/></svg>',
    codex:
      '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14.2" fill="none" stroke="#000" stroke-width="2.4"/><path d="m10.2 12.3 3.4 3.7-3.4 3.7" fill="none" stroke="#000" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.4 20h5.6" stroke="#000" stroke-width="2.3" stroke-linecap="round"/></svg>',
    exe: '<svg viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="3" fill="#e9eef5" stroke="#9aa6b5"/><rect x="8" y="6" width="32" height="7" rx="3" fill="#3b8fe0"/><path d="M17 27l5 5 9-11" fill="none" stroke="#2c7be5" stroke-width="3"/></svg>',
    shield:
      '<svg class="ic" viewBox="0 0 24 24"><path fill="none" stroke="#4daafc" stroke-width="1.6" d="M12 2.8 4.5 5.6v5.6c0 4.7 3.2 8.9 7.5 10 4.3-1.1 7.5-5.3 7.5-10V5.6Z"/><path d="M12 7.5v5M12 15.4v.2" stroke="#4daafc" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };
  const act = (n) => {
    const p = [
      "M5 3h9l5 5v13H5zM14 3v5h5",
      "M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM15.5 16l5 5",
      "M7 5a2 2 0 1 1 0 .1M7 7v10M7 21a2 2 0 1 1 0-.1M17 9a2 2 0 1 1 0-.1M17 11c0 4-10 2-10 6",
      "M7 4l12 8-12 8z",
      "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM15 13l5 5M20 13l-5 5",
    ];
    return (
      p
        .map(
          (d, i) =>
            `<i class="${i === n ? "on" : ""}"><svg viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="#cccccc" stroke-width="1.3" stroke-linejoin="round"/></svg></i>`,
        )
        .join("") +
      '<span class="grow"></span><i><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" fill="none" stroke="#ccc" stroke-width="1.3"/><path d="M4.5 20c1.2-4 4-5.5 7.5-5.5s6.3 1.5 7.5 5.5" fill="none" stroke="#ccc" stroke-width="1.3"/></svg></i><i><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="#ccc" stroke-width="1.3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="#ccc" stroke-width="1.3"/></svg></i>'
    );
  };
  const lnkIco = {
    file: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v4h4M12 11v6M9 14h6" fill="none" stroke="#4daafc" stroke-width="1.3"/></svg>',
    open: '<svg viewBox="0 0 24 24"><path d="M5 4h9l5 5v11H5zM9 13h6M12 10v6" fill="none" stroke="#4daafc" stroke-width="1.3"/></svg>',
    folder:
      '<svg viewBox="0 0 24 24"><path d="M3 6h6l2 2h10v11H3z" fill="none" stroke="#4daafc" stroke-width="1.3"/></svg>',
    git: '<svg viewBox="0 0 24 24"><path d="M7 5a2 2 0 1 1 0 .1M7 7v10M7 21a2 2 0 1 1 0-.1M17 9a2 2 0 1 1 0-.1M17 11c0 4-10 2-10 6" fill="none" stroke="#4daafc" stroke-width="1.3"/></svg>',
    remote:
      '<svg viewBox="0 0 24 24"><path d="M4 4l7 7-7 7M20 6l-6 6 6 6" fill="none" stroke="#4daafc" stroke-width="1.3"/></svg>',
    gen: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4zM15 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="none" stroke="#4daafc" stroke-width="1.3"/></svg>',
  };

  /* ---------- VS Code window ---------- */
  const MENUS = [
    "File",
    "Edit",
    "Selection",
    "View",
    "Go",
    "Run",
    "Terminal",
    "Help",
  ];
  const FILE_MENU = [
    ["New Text File", "Ctrl+N"],
    ["New File...", "Ctrl+Alt+Windows+N"],
    ["New Window", "Ctrl+Shift+N"],
    ["New Window with Profile", "›"],
    "-",
    ["Open File...", "Ctrl+O"],
    ["Open Folder...", "Ctrl+K Ctrl+O"],
    ["Open Workspace from File...", ""],
    ["Open Recent", "›"],
    "-",
    ["Add Folder to Workspace...", ""],
    ["Save Workspace As...", ""],
    ["Duplicate Workspace", ""],
    "-",
    ["Save", "Ctrl+S"],
    ["Save As...", "Ctrl+Shift+S"],
    ["!Save All", "Ctrl+K S"],
    "-",
    ["Share", "›"],
    "-",
    ["Auto Save", ""],
    ["Preferences", "›"],
    "-",
    ["Revert File", ""],
    ["Close Editor", "Ctrl+F4"],
    ["Close Window", "Alt+F4"],
    "-",
    ["Exit", ""],
  ];
  const TERM_MENU = [
    ["New Terminal", "Ctrl+Shift+`"],
    ["!Split Terminal", "Ctrl+Shift+5"],
    ["!New Terminal Window", "Ctrl+Shift+Alt+`"],
    "-",
    ["Run Task...", ""],
    ["Run Build Task...", "Ctrl+Shift+B"],
    ["Run Active File", ""],
    ["Run Selected Text", ""],
    "-",
    ["!Show Running Tasks...", ""],
    ["!Restart Running Task...", ""],
    ["!Terminate Task...", ""],
    "-",
    ["Configure Tasks...", ""],
    ["Configure Default Build Task...", ""],
  ];
  function menuPop(items, style, pick, n, label) {
    return `<div class="vsc-menu-pop" style="${style}">${items
      .map((it) => {
        if (it === "-") return "<hr>";
        let [name, key] = it;
        const dis = name.startsWith("!");
        if (dis) name = name.slice(1);
        const k =
          key === "›" ? '<span class="chev">›</span>' : `<kbd>${key}</kbd>`;
        const row = `<span>${name}</span>${k}`;
        if (name === pick) return tg(row, n, label, "hl", "div");
        return `<div class="${dis ? "dis" : ""}">${row}</div>`;
      })
      .join("")}</div>`;
  }
  function burgerPop(subOpen) {
    const rows = MENUS.map(
      (m) =>
        `<div class="${m === subOpen ? "hl" : ""}"><span>${m}</span><span class="chev">›</span></div>`,
    ).join("");
    return `<div class="vsc-menu-pop" style="left:.9cqw;top:2.9cqw;min-width:17cqw">${rows}</div>`;
  }
  function vscTitle(o) {
    const menu =
      o.menu !== "full"
        ? o.burgerTarget
          ? tg("<i></i>", o.burgerTarget, "☰ 메뉴", "vsc-burger")
          : `<span class="vsc-burger ${o.burgerOpen ? "open" : ""}"><i></i></span>`
        : `<div class="vsc-menu">${MENUS.map((m) => `<span class="${o.menuOpen === m ? "open" : ""}">${m}</span>`).join("")}</div>`;
    const close = o.closeTarget
      ? tg("✕", o.closeTarget, "VS Code 닫기 ✕", "x", "i")
      : '<i class="x">✕</i>';
    return `<div class="vsc-title"><span class="vsc-logo">${I.vsc}</span>${menu}<span class="vsc-nav">←&nbsp;→</span><div class="vsc-cc">${o.cc || "Search"}</div><span class="vsc-chatbtn">💬 ▾</span><span class="vsc-sign">${o.signed ? "홍" : "Sign In"}</span><span class="vsc-layout"><i></i><i></i><i></i><i></i></span><div class="wctl"><i>—</i><i>▢</i>${close}</div></div>`;
  }
  const welcome = (recent) =>
    `<div class="welcome"><h2>Visual Studio Code<small>Editing evolved</small></h2><div><h3>Start</h3><div class="lnk">${lnkIco.file}New File...</div><div class="lnk">${lnkIco.open}Open File...</div><div class="lnk">${lnkIco.folder}Open Folder...</div><div class="lnk">${lnkIco.git}Clone Git Repository...</div><div class="lnk">${lnkIco.remote}Connect to...</div><div class="lnk">${lnkIco.gen}Generate New Workspace...</div><div class="recent"><h3>Recent</h3>${recent || "You have no recent folders, <a>open a folder</a> to start."}</div></div><div><h3>Walkthroughs</h3><div class="walk"><b>★ Get started with VS Code</b><span>Customize your editor, learn the basics, and start coding</span></div><div class="walk"><b>💡 Learn the Fundamentals</b></div></div></div>`;
  function vsc(o = {}) {
    const side = o.folder
      ? `<aside class="vsc-side"><h4>Explorer <span>···</span></h4><div class="vsc-tree"><div class="root">⌄ ${o.folder}</div>${(o.files || []).map((f) => `<div>&nbsp;&nbsp;&nbsp;${f}</div>`).join("")}</div><div class="foot"><div>› Outline</div><div>› Timeline</div></div></aside>`
      : "";
    const chat =
      o.chat === false
        ? ""
        : `<aside class="vsc-chat"><div class="head"><b>Chat</b><span style="margin-left:auto;color:#bbb;font-size:1cqw">＋ ⋯ ⛶ ✕</span></div><div class="mid"><div>💬<b>Build with Agent</b>AI responses may be inaccurate</div></div><div class="box">Describe what to build<div><span>＋</span><span>Agent</span><span>Models</span><span style="margin-left:auto">🎤 ↑</span></div></div></aside>`;
    const maxBtn = o.maxTarget
      ? tg("⛶", o.maxTarget, "터미널 크게 보기 ⛶")
      : "<span>⛶</span>";
    const panel =
      o.term !== undefined
        ? `<div class="vsc-panel" style="${o.panelMax ? "" : "height:" + (o.panelH || 22) + "cqw"}"><div class="vsc-ptabs"><span>Problems</span><span>Output</span><span>Debug Console</span><span class="on">Terminal</span><span>Ports</span><span class="tools"><span>⌨ powershell</span><span>＋ ▾</span><span>⧉</span><span>🗑</span><span>⋯</span>${maxBtn}<span>✕</span></span></div><div class="term">${o.term}</div></div>`
        : "";
    const center = o.panelMax
      ? `<div class="vsc-center" style="grid-template-rows:minmax(0,1fr)">${panel}</div>`
      : `<div class="vsc-center" style="grid-template-rows:2.6cqw minmax(0,1fr) ${o.term !== undefined ? "auto" : ""}"><div class="vsc-tabs"><div class="vsc-tab"><span class="vsc-logo" style="width:1.1cqw;height:1.1cqw">${I.vsc}</span>Welcome <span class="x">✕</span></div><div class="tools">◫ ⋯</div></div><div class="vsc-editor">${o.editor || welcome(o.recent)}</div>${panel}</div>`;
    const cols = `3.3cqw ${o.folder ? "auto" : ""} minmax(0,1fr) ${o.chat === false ? "" : "auto"}`;
    const banner = o.restricted
      ? `<div class="vsc-banner">${I.shield}<span>Restricted Mode is intended for safe code browsing. Trust this folder to enable all features.</span><u>Manage</u><u>Learn More</u><span class="sp"></span>✕</div>`
      : "";
    return `<div class="screen"><div class="vsc" style="grid-template-rows:3.05cqw ${o.restricted ? "2.2cqw" : ""} minmax(0,1fr) 1.9cqw">${vscTitle(o)}${banner}<div class="vsc-main" style="grid-template-columns:${cols}"><nav class="vsc-act">${act(o.folder ? 0 : -1)}</nav>${side}${center}${chat}</div><div class="vsc-status">${o.restricted ? '<span class="rm">🛡 Restricted Mode</span>' : "<span>⟩⟨</span>"}<span>ⓧ 0 ⚠ 0</span><span class="sp"></span><span>🔔</span></div></div>${o.overlay || ""}</div>`;
  }

  /* ---------- terminal ---------- */
  const LOGO = [
    "          ⣀⣤⣤⣤⣀⣀",
    "       ⣠⣶⣿⣿⣿⣿⣿⣿⣿⣿⣦⣤⣤⣤⣤⣤⣤⡀",
    "     ⢀⣾⣿⣿⠿⠋⠉⠉⢉⣭⣿⣿⣿⣿⣿⠿⣿⣿⣿⣿⣷⣄",
    "    ⣀⣾⣿⣿⠃ ⣀⣴⣾⣿⣿⡿⠟⠋ ⣀⡀ ⠈⠙⢿⣿⣿⣧",
    " ⣀⣶⣿⣿⣿⣿⡇ ⢸⣿⣿⡿⠛⠉⢀⣠⣴⣿⣿⣿⣷⣦⣀⠈⢻⣿⣿⡇",
    "⣰⣿⣿⡿⢿⣿⣿⡇ ⢸⣿⣿⢀⣤⣶⣿⣿⣿⠟⠛⠻⣿⣿⣿⣿⣮⣿⣿⡷",
    "⢰⣿⣿⡟⠁⢸⣿⣿⡇ ⢸⣿⣿⣿⣿⠿⠿⣿⣿⣿⣦⣄⡀⠈⠛⠿⣿⣿⣿⣧⡀",
    "⣾⣿⣿⠃ ⢸⣿⣿⡇ ⢸⣿⣿⠋⠁  ⠈⠙⢻⣿⣿⣿⣶⣤⡀ ⠹⢿⣿⣷⡄",
    "⢸⣿⣿⣇ ⠸⣿⣿⣷⣦⣼⣿⣿      ⢸⣿⣿⠻⢿⣿⣿⡇ ⠘⣿⣿⣿",
    "⠈⢿⣿⣿⣦⡀⠈⠛⠿⣿⣿⣿⣿⣄⡀  ⢀⣠⣼⣿⣿  ⣿⣿⡇  ⣿⣿⣿⠇",
    "  ⢻⣿⣿⣿⣷⣦⣀⠈⠙⠻⣿⣿⣿⣶⣶⣿⣿⣿⣿⣿  ⣿⣿⡇ ⣠⣿⣿⣿",
    "  ⢸⣿⣿⡿⢿⣿⣿⣿⣦⣠⣴⣿⣿⣿⡿⠟⠋⢸⣿⣿  ⣿⣿⣷⣴⣿⣿⣿⠃",
    "  ⠘⣿⣿⣷ ⠈⠛⢿⣿⣿⣿⠿⠋⠉ ⣠⣴⣿⣿⣿  ⣿⣿⣿⣿⣿⠟⠁",
    "   ⠻⣿⣿⣿⣤⣀ ⠈⠉ ⢀⣤⣶⣿⣿⣿⠿⠟⠁ ⣰⣿⣿⡟⠋⠁",
    "    ⠈⠿⣿⣿⣿⣿⣶⣾⣿⣿⣿⣿⠟⠋⠁  ⣠⣼⣿⣿⡟",
    "       ⠙⠛⠛⠛⠻⠛⢿⣿⣿⣿⣿⣷⣾⣿⣿⣿⡿⠏",
    "              ⠈⠙⠛⠿⠿⠿⠿⠛⠉",
  ];
  function fmt(line) {
    let out = "",
      re = /\[\[([a-z ]+)\|(.*?)\]\]/g,
      last = 0,
      m;
    while ((m = re.exec(line))) {
      out +=
        esc(line.slice(last, m.index)) +
        `<span class="${m[1]}">${esc(m[2])}</span>`;
      last = re.lastIndex;
    }
    out += esc(line.slice(last));
    return out.replace(/\{CUR\}/g, '<span class="cur"></span>');
  }
  const T = (lines) =>
    lines
      .map((l) =>
        typeof l === "object" ? l.html : `<div class="ln">${fmt(l)}</div>`,
      )
      .join("");
  const tline = (text, n, label, cls = "", rest = "") => {
    const [, lead, body] = text.match(/^( *)(.*)$/);
    const tail = rest ? `<span class="${cls}">${fmt(rest)}</span>` : "";
    return {
      html: `<div class="ln">${lead}${tg(fmt(body), n, label, "tl " + cls, "span")}${tail}</div>`,
    };
  };
  const footerTyping = (model) => [
    "",
    `  [[dim|${model || "GPT-6.1-Sol low"} · 100% context left]]`,
    "  [[dim|tab to queue message]]",
  ];
  const DIR = "C:\\bas_mkt";
  const PS = `PS ${DIR}> `;
  const INSTALL =
    'powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"';
  const head = () => [
    "",
    `  [[bl|>_ ]][[b|OpenAI Codex]][[dim| (v0.163.0)]]`,
    `     [[dim|${DIR}]]`,
    "",
  ];
  const logo = () =>
    LOGO.map((l) => ({
      html: `<div class="ln logo">${" ".repeat(26)}${esc(l)}</div>`,
    }));
  const footer = (model) => [
    "",
    `  [[dim|${model || "GPT-6.1-Sol low"} · 100% context left]]`,
    "  [[dim|? for shortcuts]]",
  ];
  const inputLine = (text) =>
    text
      ? `[[b|›]] [[typed|${text}]]{CUR}`
      : `[[b|›]] [[dim|Ask Codex to do anything]]`;

  /* ---------- Windows bits ---------- */
  const wTitle = (ico, title) =>
    `<div class="w11-title">${ico ? `<span class="ico">${ico}</span>` : ""}<span>${title}</span><div class="wctl"><i>—</i><i>▢</i><i class="x">✕</i></div></div>`;
  const desk = (inside, opt = {}) =>
    `<div class="screen light"><div class="desk">${inside}${opt.taskbar === false ? "" : `<div class="taskbar"><i class="win">${I.win}</i><i>🔍</i><i style="width:2.6cqw">${I.folder}</i><i style="width:2.6cqw">${I.chrome}</i></div>`}</div></div>`;
  const deskIcon = (ico, name, style) =>
    `<div class="dicon" style="${style}"><span>${ico}</span><b>${name}</b></div>`;

  /* ---------- Inno setup (Korean, Default.ko.isl) ---------- */
  const INNO = { title: "Microsoft Visual Studio Code (User) 설치" };
  const innoWin = (headB, headS, body, buttons) =>
    `<div class="inno"><div class="inno-title"><span class="ico" style="width:1.2cqw;height:1.2cqw">${I.vsc}</span><span>${INNO.title}</span><div class="wctl"><i>—</i><i class="x">✕</i></div></div><div class="inno-head"><div><b>${headB}</b><span>${headS}</span></div>${I.vsc}</div><div class="inno-body">${body}</div><div class="inno-foot">${buttons}</div></div>`;

  /* ---------- Chrome ---------- */
  const chrome = (tabTitle, fav, url, body, extra = "") =>
    `<div class="screen light"><div class="chr"><div class="chr-tabs"><div class="chr-tab"><span class="fav">${fav}</span>${tabTitle}</div><span class="plus">＋</span><div class="wctl"><i>—</i><i>▢</i><i class="x">✕</i></div></div><div class="chr-bar"><span class="nav">←&nbsp;→&nbsp;⟳</span><div class="chr-url"><span class="lock">⊜</span><span class="host">${url}</span></div><span class="icons">☆ ⤓ ⋮</span></div><div class="chr-body">${body}</div>${extra}</div></div>`;
  const vfav = `<span style="display:block;width:100%;height:100%">${I.vsc}</span>`;

  /* ---------- copy ---------- */
  const copyBlock = (items) =>
    items && items.length
      ? `<div class="copy-list">${items.map((c) => `<div class="copy-item">${c.label ? `<small>${c.label}</small>` : ""}<div class="copy-row"><code class="${c.prompt ? "prompt" : ""}">${esc(c.code)}</code><button type="button" class="copy-btn" data-copy="${esc(c.code)}">복사</button></div></div>`).join("")}</div>`
      : "";

  /* ================= SCENES ================= */
  const SC = {};
  const explorerTop = (title, crumb, searchLabel) =>
    `${wTitle(title === "내 PC" ? I.pc : I.drive, title)}<div class="exp-bar"><span class="nav">←&nbsp;→&nbsp;↑&nbsp;⟳</span><div class="exp-addr"><span style="width:1.2cqw">${I.pc}</span>${crumb}</div><div class="exp-search">${searchLabel} 검색</div></div>`;
  const expNav = (onC) =>
    `<nav class="exp-nav"><div>🏠 홈</div><div>🖼 갤러리</div><hr><div>🖥 바탕 화면</div><div>⤓ 다운로드</div><div>📄 문서</div><div>🖼 사진</div><hr><div class="${onC ? "" : "on"}">💻 내 PC</div>${onC ? '<div class="on" style="padding-left:1.6cqw">💽 로컬 디스크 (C:)</div>' : ""}<div>🌐 네트워크</div></nav>`;
  const cmdBar = (newOn) =>
    `<div class="exp-cmd"><span class="new" ${newOn ? 'style="background:#e5e5e5"' : ""}><b>⊕</b>새로 만들기 ⌄</span><span>✂</span><span>⧉</span><span>📋</span><span>⇅ 정렬 ⌄</span><span>☰ 보기 ⌄</span><span>⋯</span></div>`;
  const cFolders = [
    "PerfLogs",
    "Program Files",
    "Program Files (x86)",
    "Users",
    "Windows",
  ];

  /* ----- 08A: VS Code ----- */
  SC.A = [
    {
      cover: 1,
      ey: "CHAPTER 08A · AI AUTOMATION",
      title: "AI 자동화 설정<br><em>VS Code 준비</em>",
      desc: "AI 에이전트가 일할 작업 공간을 만듭니다. VS Code를 설치하고 bas_mkt 업무 폴더를 연결하는 데까지 실제 화면 순서대로 따라합니다.",
      route: [
        "VS Code 설치",
        "bas_mkt 폴더 만들기",
        "구글 로그인",
        "작업 폴더 열기",
      ],
    },
    {
      concept: 1,
      ey: "BEFORE YOU START",
      title: "시작 전에<br><em>준비할 것</em>",
      desc: "08A·08B·08C를 순서대로 따라하면 Codex를 켜고 모델과 권한까지 설정한 상태가 됩니다.",
      html: `<div class="cards two"><div class="card"><small>PC</small><strong>Windows 10 · 11 PC</strong><p>노트북 또는 데스크탑에서 진행합니다. 휴대폰으로는 설정할 수 없습니다.</p></div><div class="card"><small>GOOGLE</small><strong>Google 계정</strong><p>VS Code 첫 화면에서 구글로 로그인할 때 사용합니다.</p></div><div class="card on"><small>CHATGPT</small><strong>ChatGPT 유료 요금제</strong><p>Codex는 ChatGPT 계정으로 로그인합니다. Plus 이상 요금제를 기준으로 안내합니다.</p></div><div class="card"><small>ORDER</small><strong>08A → 08B → 08C</strong><p>VS Code 준비 → Codex 설치·설정 → 세션과 사용 한도 순서입니다.</p></div></div>`,
    },
    {
      ey: "STEP 01",
      title: "VS Code<br><em>내려받기</em>",
      desc: "Chrome에서 code.visualstudio.com에 접속해 파란색 Download for Windows 버튼을 누릅니다.",
      mode: "Download for Windows",
      tone: "set",
      copy: [{ label: "접속 주소", code: "https://code.visualstudio.com" }],
      screen: (n) =>
        chrome(
          "Visual Studio Code - The open...",
          vfav,
          "code.visualstudio.com",
          `<div class="vsweb"><div class="vsweb-nav"><b>${I.vsc} Visual Studio Code</b><span>Docs</span><span>Updates</span><span>Blog</span><span>API</span><span>Extensions</span><span>MCP</span><span>FAQ</span><span class="dl">Download</span></div><div class="vsweb-hero"><div><h2>The open source<br>AI code editor</h2><p>Your home for multi-agent development</p>${tg(`<span style="width:1.4cqw;display:inline-block">${I.winw}</span><span>Download for Windows</span>`, n, "Download for Windows", "vsweb-btn")}<div class="terms"><a>Web</a>, <a>Insiders edition</a>, or <a>other platforms</a><br>By using VS Code, you agree to its <a>license</a> and <a>privacy statement</a>.</div></div><div class="vsweb-shot"><i></i><i></i><div>function greet() {<br>&nbsp;&nbsp;// hello<br>&nbsp;&nbsp;return "Hi"<br>}</div></div></div></div>`,
        ),
    },
    {
      ey: "STEP 02",
      title: "내려받은 파일<br><em>실행하기</em>",
      desc: "오른쪽 위에 다운로드 창이 열리면 VSCodeUserSetup으로 시작하는 파일을 누릅니다.",
      mode: "다운로드 목록에서 클릭",
      tone: "set",
      note: "다운로드 창이 사라졌다면 Chrome 오른쪽 위의 ⤓ 아이콘을 누르면 다시 보입니다.",
      screen: (n) =>
        chrome(
          "Visual Studio Code - Code E...",
          vfav,
          "code.visualstudio.com/thank-you?dv=win64user",
          `<div class="vsweb"><div class="vsweb-nav"><b>${I.vsc} Visual Studio Code</b><span>Docs</span><span>Updates</span><span>Blog</span><span>API</span><span>Extensions</span><span class="dl">Download</span></div><div class="vsweb-hero" style="grid-template-columns:1fr"><div><h2 style="font-size:2.6cqw">Your download of Visual Studio Code<br>should start shortly.</h2><p><a style="color:#0066b8">Direct download link.</a></p></div></div></div>`,
          `<div class="dl-bubble"><h6>최근 다운로드 기록</h6>${tg(`<span>${I.exe}</span><span><b>VSCodeUserSetup-x64-1.142.0.exe</b><span>완료</span></span><span style="color:#5f6368">📁</span>`, n, "VSCodeUserSetup-x64 파일 열기", "dl-item", "div")}<div class="all">전체 다운로드 기록</div></div>`,
        ),
    },
    {
      ey: "STEP 03",
      title: "사용권 계약에<br><em>동의</em>",
      desc: "설치 창이 열리면 “동의합니다”를 선택하고 다음 버튼을 누릅니다.",
      mode: "동의합니다 → 다음",
      tone: "set",
      screen: (n) =>
        desk(
          innoWin(
            "사용권 계약",
            "계속하기 전에 다음의 중요 정보를 읽어보십시오.",
            `<div>다음 사용권 계약을 읽어보십시오, 설치를 계속하려면 이 계약에 동의해야 합니다.</div><div class="box">이 라이선스는 Visual Studio 코드 제품에 적용됩니다. Visual Studio 코드의 소스 코드는 MIT 라이선스 계약 아래 https://github.com/Microsoft/vscode에 나와 있습니다.<br><br>MICROSOFT 소프트웨어 라이선스 계약서<br>MICROSOFT VISUAL STUDIO 코드<br><br>본 라이선스 계약은 귀하와 Microsoft Corporation(또는 거주 지역에 따라 계열사 중 하나) 간에 체결되는 계약입니다...</div>${tg('<i class="on"></i>동의합니다(A)', n, "동의합니다(A)", "radio", "div")}<div class="radio"><i></i>동의하지 않습니다(D)</div>`,
            '<span class="def">다음(N) &gt;</span><span>취소</span>',
          ),
        ),
    },
    {
      ey: "STEP 04",
      title: "설치 위치는<br><em>그대로 다음</em>",
      desc: "설치 위치 화면은 바꾸지 않고 다음을 누릅니다. 이어서 나오는 시작 메뉴 폴더 화면에서도 그대로 다음을 누릅니다.",
      mode: "그대로 다음 · 두 번",
      tone: "keep",
      screen: (n) =>
        desk(
          innoWin(
            "설치 위치 선택",
            "Visual Studio Code의 설치 위치를 선택하십시오.",
            `<div style="display:flex;gap:1cqw;align-items:center"><span style="width:2.6cqw">${I.folder}</span>다음 폴더에 Visual Studio Code을(를) 설치합니다.</div><div style="margin-top:1cqw">계속하려면 "다음"을, 다른 폴더를 선택하려면 "찾아보기"를 클릭하십시오.</div><div style="display:flex;gap:.6cqw;margin-top:1cqw"><div style="flex:1;padding:.35cqw .6cqw;border:1px solid #a0a0a0;background:#fff">C:\\Users\\사용자\\AppData\\Local\\Programs\\Microsoft VS Code</div><span style="padding:.35cqw .8cqw;border:1px solid #adadad;background:#e1e1e1">찾아보기(R)...</span></div>`,
            `<span>&lt; 뒤로(B)</span>${tg("다음(N) &gt;", n, "다음(N) >", "def")}<span>취소</span>`,
          ),
        ),
    },
    {
      ey: "STEP 05",
      title: "바탕 화면<br><em>바로가기 체크</em>",
      desc: "추가 작업 화면에서 “바탕 화면에 바로가기 만들기”를 체크합니다. 맨 아래 “PATH에 추가”는 처음부터 체크되어 있으니 그대로 두고 다음을 누릅니다.",
      mode: "바로가기 체크 → 다음",
      tone: "set",
      note: "<b>“PATH에 추가”는 체크를 풀지 않습니다.</b> 체크가 풀리면 터미널에서 code 명령을 쓸 수 없습니다.",
      screen: (n) =>
        desk(
          innoWin(
            "추가 작업 선택",
            "수행할 추가 작업을 선택하십시오.",
            `<div>Visual Studio Code 설치 과정에 포함할 추가 작업을 선택한 후, "다음"을 클릭하십시오.</div><div class="grp">아이콘 추가:</div>${tg('<i class="on"></i>바탕 화면에 바로가기 만들기(D)', n, "바탕 화면에 바로가기 만들기 · 체크", "chk", "div")}<div class="grp">기타:</div><div class="chk"><i></i>"Code(으)로 열기" 작업을 Windows 탐색기 파일의 상황에 맞는 메뉴에 추가</div><div class="chk"><i></i>"Code(으)로 열기" 작업을 Windows 탐색기 디렉터리의 상황에 맞는 메뉴에 추가</div><div class="chk"><i class="on"></i>Code을(를) 지원되는 파일 형식에 대한 편집기로 등록합니다.</div><div class="chk"><i class="on"></i>PATH에 추가(다시 시작한 후 사용 가능)</div>`,
            '<span>&lt; 뒤로(B)</span><span class="def">다음(N) &gt;</span><span>취소</span>',
          ),
        ),
    },
    {
      ey: "STEP 06",
      title: "설치<br><em>시작하기</em>",
      desc: "설치 준비 완료 화면에서 설치 버튼을 누릅니다. 1분 정도 걸립니다.",
      mode: "설치 클릭",
      tone: "set",
      screen: (n) =>
        desk(
          innoWin(
            "설치 준비 완료",
            "귀하의 컴퓨터에 Visual Studio Code을(를) 설치할 준비가 되었습니다.",
            `<div>설치를 계속하려면 "설치"를, 설정을 변경하거나 검토하려면 "뒤로"를 클릭하십시오.</div><div class="box" style="height:16cqw">설치 위치:<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;C:\\Users\\사용자\\AppData\\Local\\Programs\\Microsoft VS Code<br><br>시작 메뉴 폴더:<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Visual Studio Code<br><br>추가 작업:<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;아이콘 추가:<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;바탕 화면에 바로가기 만들기(D)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;기타:<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Code을(를) 지원되는 파일 형식에 대한 편집기로 등록합니다.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;PATH에 추가(다시 시작한 후 사용 가능)</div>`,
            `<span>&lt; 뒤로(B)</span>${tg("설치(I)", n, "설치(I)", "def")}<span>취소</span>`,
          ),
        ),
    },
    {
      ey: "STEP 07",
      title: "실행 체크를<br><em>끄고 종료</em>",
      desc: "설치가 끝나면 “Visual Studio Code 실행” 체크를 끄고 종료 버튼을 누릅니다. 작업 폴더를 먼저 만든 뒤에 실행합니다.",
      mode: "체크 해제 → 종료",
      tone: "set",
      screen: (n) =>
        desk(
          `<div class="inno done-page"><div class="inno-title"><span class="ico" style="width:1.2cqw;height:1.2cqw">${I.vsc}</span><span>${INNO.title}</span><div class="wctl"><i>—</i><i class="x">✕</i></div></div><div class="inno-split"><div class="art">${I.vsc}</div><div class="txt"><h6>Visual Studio Code 설치 마법사 완료</h6><p>귀하의 컴퓨터에 Visual Studio Code이(가) 설치되었습니다, 응용프로그램은 설치된 아이콘을 선택하여 시작할 수 있습니다.</p><p>설치를 끝내려면 "종료"를 클릭하십시오.</p><div class="inno-body" style="padding:0">${tg("<i></i>Visual Studio Code 실행", n, "Visual Studio Code 실행 · 체크 해제", "chk", "div")}</div></div></div><div class="inno-foot"><span class="def">종료(F)</span></div></div>`,
        ),
    },
    {
      ey: "STEP 08",
      title: "탐색기에서<br><em>C 드라이브 열기</em>",
      desc: "키보드의 Windows 키와 E를 함께 눌러 파일 탐색기를 엽니다. 왼쪽에서 내 PC를 고르고 로컬 디스크 (C:)를 두 번 누릅니다.",
      mode: "⊞ + E → 로컬 디스크 (C:)",
      tone: "set",
      screen: (n) =>
        desk(
          `<div class="w11 exp">${explorerTop("내 PC", "›&nbsp;내 PC&nbsp;›", "내 PC")}${cmdBar()}<div class="exp-body">${expNav(false)}<div class="exp-main"><h6>⌄ 장치 및 드라이브</h6><div class="drives">${tg(`${I.drive}<div style="flex:1"><b>로컬 디스크 (C:)</b><div class="bar"><i></i></div><span>212GB 사용 가능/476GB</span></div>`, n, "로컬 디스크 (C:)", "drive", "div")}</div></div></div></div>`,
        ),
    },
    {
      ey: "STEP 09",
      title: "새 폴더<br><em>만들기</em>",
      desc: "C 드라이브가 열리면 위쪽의 새로 만들기를 누르고 폴더를 선택합니다.",
      mode: "새로 만들기 → 폴더",
      tone: "set",
      screen: (n) =>
        desk(
          `<div class="w11 exp">${explorerTop("로컬 디스크 (C:)", "›&nbsp;내 PC&nbsp;›&nbsp;로컬 디스크 (C:)&nbsp;›", "로컬 디스크 (C:)")}${cmdBar(true)}<div class="exp-body">${expNav(true)}<div class="exp-main"><div class="files">${cFolders.map((f) => `<div class="fi">${I.folder}<span>${f}</span></div>`).join("")}</div></div></div><div class="ctx" style="left:1.2cqw;top:10.9cqw">${tg(`<span class="ico">${I.folder}</span>폴더`, n, "새로 만들기 → 폴더", "hl", "div")}<div>🔗 바로 가기</div><hr><div>🖼 비트맵 이미지</div><div>📄 텍스트 문서</div><div>🗜 압축(ZIP) 폴더</div></div></div>`,
        ),
    },
    {
      ey: "STEP 10",
      title: "이름을<br><em>bas_mkt로</em>",
      desc: "새 폴더 이름 칸에 bas_mkt를 입력하고 Enter를 누릅니다. 밑줄(_)까지 정확히 입력합니다.",
      mode: "bas_mkt 입력 → Enter",
      tone: "set",
      copy: [{ label: "폴더 이름", code: "bas_mkt" }],
      note: "영문 소문자와 밑줄만 씁니다. 한글이나 띄어쓰기를 넣지 않습니다.",
      screen: (n) =>
        desk(
          `<div class="w11 exp">${explorerTop("로컬 디스크 (C:)", "›&nbsp;내 PC&nbsp;›&nbsp;로컬 디스크 (C:)&nbsp;›", "로컬 디스크 (C:)")}${cmdBar()}<div class="exp-body">${expNav(true)}<div class="exp-main"><div class="files">${cFolders.map((f) => `<div class="fi">${I.folder}<span>${f}</span></div>`).join("")}${tg(`${I.folder}<span class="rename">bas_mkt</span>`, n, "bas_mkt 입력 후 Enter", "fi on", "div")}</div></div></div></div>`,
        ),
    },
    {
      ey: "STEP 11",
      title: "VS Code<br><em>실행하기</em>",
      desc: "바탕 화면의 Visual Studio Code 아이콘을 두 번 누릅니다.",
      mode: "아이콘 더블클릭",
      tone: "set",
      note: "아이콘이 없으면 작업 표시줄 검색에 visual studio code를 입력하고 열기를 누릅니다.",
      screen: (n) =>
        desk(
          `<div class="dicons">${deskIcon(I.bin, "휴지통", "")}${deskIcon(I.chrome, "Google Chrome", "")}${tg(`<span>${I.vsc}</span><b>Visual Studio Code</b>`, n, "Visual Studio Code 아이콘", "dicon", "div")}</div>`,
        ),
    },
    {
      ey: "STEP 12",
      title: "첫 화면에서<br><em>구글로 로그인</em>",
      desc: "Welcome to VS Code 창이 뜨면 파란 GitHub 버튼 오른쪽의 G(구글) 버튼을 누릅니다.",
      mode: "G 버튼 클릭",
      tone: "set",
      note: "Continue with GitHub 버튼은 누르지 않습니다. 이 창은 처음 실행할 때 한 번만 나옵니다.",
      screen: (n) =>
        vsc({
          cc: "Search",
          overlay: `<div class="vsc-shade"></div><div class="onboard"><div class="dots"><i class="on"></i><i></i></div><span class="cls">✕</span><div class="hello">${I.vsc}<div><h6>Welcome to VS Code</h6><p>Sign in to use GitHub Copilot.</p><div class="sso"><span class="gh">${I.gh}Continue with GitHub</span>${tg(I.g, n, "Google로 로그인 (G 버튼)")}<span>${I.apple}</span><span>GHE</span></div></div></div><div class="legal">By signing in, you agree to GitHub's <a>Terms</a> and <a>Privacy Statement</a>. GitHub Copilot may show <a>public code</a> suggestions and use your data to improve the product. You can change these <a>settings</a> anytime.</div><div class="foot"><span>Continue without Signing In</span></div></div>`,
        }),
    },
    {
      ey: "STEP 13",
      title: "구글 계정<br><em>선택하기</em>",
      desc: "브라우저에 Google 로그인 화면이 열립니다. 사용할 구글 계정을 누릅니다. 계정 목록이 없으면 이메일 또는 휴대전화 칸에 구글 이메일을 넣고 다음을 누릅니다.",
      mode: "내 구글 계정 클릭",
      tone: "set",
      note: "GitHub 계정이 없으면 이어서 GitHub 가입 화면이 나올 수 있습니다. 안내에 따라 사용자 이름을 정하고 계속 진행합니다.",
      screen: (n) =>
        chrome(
          "로그인 - Google 계정",
          I.g,
          "accounts.google.com",
          `<div class="gpage"><div class="gcard"><div class="ghead"><span style="width:1.3cqw">${I.g}</span>Google 계정으로 로그인</div><div class="gbody"><span style="display:inline-block;width:3cqw;color:#1f2328">${I.gh}</span><h6>계정 선택</h6><div class="to"><a>GitHub</a>(으)로 이동</div><div class="gacc">${tg('<span class="av">홍</span><span><b>홍길동</b><span>example@gmail.com</span></span>', n, "사용할 구글 계정", "", "div")}<div><span class="av" style="background:#e8eaed;color:#444">＋</span><span>다른 계정 사용</span></div></div><div class="gnote">앱을 사용하기 전에 GitHub의 <a>개인정보처리방침</a> 및 <a>서비스 약관</a>을 검토하세요.</div></div></div></div>`,
        ),
    },
    {
      ey: "STEP 14",
      title: "VS Code로<br><em>돌아가기</em>",
      desc: "로그인이 끝나면 브라우저 위쪽에 “Visual Studio Code을(를) 여시겠습니까?” 창이 뜹니다. Visual Studio Code 열기를 누릅니다.",
      mode: "Visual Studio Code 열기",
      tone: "set",
      note: "GitHub 권한 승인 화면이 먼저 나오면 초록색 승인 버튼을 누른 뒤 이 창으로 넘어옵니다.",
      screen: (n) =>
        chrome(
          "Visual Studio Code",
          vfav,
          "vscode.dev/redirect",
          `<div class="vsredirect"><div>${I.vsc}<h6>Sign in successful!</h6><p>You can now close this window and return to Visual Studio Code.</p></div></div>`,
          `<div class="openprompt"><h6>Visual Studio Code을(를) 여시겠습니까?</h6><p>https://vscode.dev에서 이 애플리케이션을 열려고 합니다.</p><div class="chk"><i></i>vscode.dev에서 연결된 앱에서 이 유형의 링크를 항상 열도록 허용</div><div class="btns">${tg("Visual Studio Code 열기", n, "Visual Studio Code 열기", "go")}<span>취소</span></div></div>`,
        ),
    },
    {
      ey: "STEP 15",
      title: "테마는 그대로<br><em>Get Started</em>",
      desc: "Make It Yours 화면이 이어서 나옵니다. 색상 테마는 바꾸지 않고 오른쪽 아래 Get Started를 누릅니다.",
      mode: "Get Started",
      tone: "keep",
      note: "Get Started 대신 Continue 버튼이 보이면 Continue를 눌러 넘기고, 마지막 화면에서 Get Started를 누릅니다.",
      screen: (n) =>
        vsc({
          cc: "Search",
          signed: true,
          overlay: `<div class="vsc-shade"></div><div class="onboard"><div class="dots"><i></i><i class="on"></i></div><span class="cls">✕</span><div class="theme"><h6>Make It Yours</h6><p>Tip: Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to access all VS Code commands.</p><small>COLOR THEME</small><span style="font-size:.85cqw;color:#9d9d9d">You can browse and install more themes later from the Extensions view.</span><div class="grid"><div class="d1">Dark 2026</div><div class="d2">Dark High Contrast</div><div class="d3">Solarized Dark</div><div class="l1" style="color:#1b1b1b">Light 2026</div><div class="l2" style="color:#1b1b1b">Light High Contrast</div><div class="l3" style="color:#1b1b1b">Solarized Light</div></div></div><div></div><div class="foot"><span>Back</span>${tg("Get Started", n, "Get Started", "pri")}</div></div>`,
        }),
    },
    {
      ey: "STEP 16",
      title: "왼쪽 위<br><em>☰ 메뉴</em>",
      desc: "VS Code 왼쪽 위의 삼선(☰) 메뉴를 누릅니다. 창이 넓으면 ☰ 대신 File · Edit · Selection 메뉴가 그대로 보이는데, 그때는 File을 바로 누릅니다.",
      mode: "☰ 클릭",
      tone: "set",
      note: "오른쪽 아래에 “언어 팩을 설치하여 표시 언어를 한국어(으)로 변경합니다.” 알림이 뜨면 ✕로 닫습니다. 메뉴를 영어로 유지해야 교육 화면과 같습니다.",
      screen: (n) =>
        vsc({ menu: "burger", burgerTarget: n, cc: "Search", signed: true }),
    },
    {
      ey: "STEP 17",
      title: "File에서<br><em>Add Folder to Workspace</em>",
      desc: "☰ 메뉴의 File에 마우스를 올리고, 오른쪽에 펼쳐진 목록에서 Add Folder to Workspace...를 누릅니다.",
      mode: "File → Add Folder to Workspace...",
      tone: "set",
      note: "Open Folder...가 아니라 그 아래쪽의 Add Folder to Workspace...를 누릅니다. 이렇게 하면 화면 구성이 바뀌지 않아 터미널만 열면 됩니다.",
      screen: (n) =>
        vsc({
          menu: "burger",
          burgerOpen: true,
          cc: "Search",
          signed: true,
          overlay:
            burgerPop("File") +
            menuPop(
              FILE_MENU,
              "left:18.4cqw;top:2.9cqw;min-width:30cqw",
              "Add Folder to Workspace...",
              n,
              "Add Folder to Workspace...",
            ),
        }),
    },
    {
      ey: "STEP 18",
      title: "bas_mkt 선택 후<br><em>Add</em>",
      desc: "Add Folder to Workspace 창에서 왼쪽의 로컬 디스크 (C:)를 누르고, 앞에서 만든 bas_mkt 폴더를 한 번 눌러 고른 뒤 오른쪽 아래 Add 버튼을 누릅니다.",
      mode: "bas_mkt → Add",
      tone: "set",
      note: "bas_mkt 폴더를 두 번 눌러 안으로 들어간 상태에서 Add를 눌러도 같은 결과가 됩니다.",
      screen: (n) =>
        desk(
          `<div class="w11 pick">${wTitle("", "Add Folder to Workspace")}<div class="exp-bar"><span class="nav">←&nbsp;→&nbsp;↑&nbsp;⟳</span><div class="exp-addr"><span style="width:1.2cqw">${I.pc}</span>›&nbsp;내 PC&nbsp;›&nbsp;로컬 디스크 (C:)&nbsp;›</div><div class="exp-search">로컬 디스크 (C:) 검색</div></div><div class="exp-cmd"><span>구성 ⌄</span><span>새 폴더</span></div><div class="exp-body">${expNav(true)}<div class="exp-main"><div class="rows"><div class="rh"><span>이름</span><span>수정한 날짜</span><span>유형</span></div>${tg(`<span>${I.folder}bas_mkt</span><span>2026-10-16 오후 3:20</span><span>파일 폴더</span>`, n, "bas_mkt 폴더", "rw on", "div")}${cFolders.map((f) => `<div class="rw"><span>${I.folder}${f}</span><span>2026-09-30 오전 9:12</span><span>파일 폴더</span></div>`).join("")}</div></div></div><div class="pick-foot"><span>폴더:</span><div class="inp">bas_mkt</div><span class="btn pri">Add</span><span class="btn">취소</span></div></div>`,
          { taskbar: false },
        ),
    },
    {
      ey: "STEP 19",
      title: "폴더 신뢰는<br><em>Yes</em>",
      desc: "Add를 누르면 바로 “Do you trust the authors of the files in this folder?” 창이 뜹니다. 파란색 Yes를 누릅니다.",
      mode: "Yes 클릭",
      tone: "set",
      note: "No를 누르면 터미널과 Codex가 제한된 상태로 열립니다. 반드시 Yes를 누릅니다.",
      screen: (n) =>
        vsc({
          cc: "Untitled (Workspace)",
          signed: true,
          overlay: `<div class="vsc-dialog" style="left:30cqw;top:22cqw"><span class="close">✕</span><h5>${I.shield}<span>Do you trust the authors of the files in this folder?</span></h5><p>You are adding files that are not currently trusted to a trusted workspace. Do you trust the authors of these new files?</p><div class="btns">${tg("Yes", n, "Yes", "pri")}<span>No</span></div></div>`,
        }),
    },
    {
      ey: "STEP 20",
      title: "bas_mkt<br><em>연결 완료</em>",
      desc: "위쪽 가운데 칸에 Untitled (Workspace)가 표시되면 앞에서 만든 bas_mkt 폴더가 VS Code에 연결된 것입니다. 화면 구성은 바뀌지 않으므로 08B에서는 터미널만 열면 됩니다.",
      mode: "Untitled (Workspace) 확인",
      tone: "keep",
      note: "Untitled는 작업 영역 설정 파일을 따로 저장하지 않았다는 표시입니다. 연결된 폴더는 bas_mkt입니다. 터미널을 열면 첫 줄에 PS C:\\bas_mkt&gt;가 보입니다.",
      screen: (n) =>
        vsc({
          signed: true,
          cc: tg(
            "Untitled (Workspace)",
            n,
            "Untitled (Workspace) · bas_mkt 연결",
          ),
        }),
    },
    {
      final: 1,
      ey: "CHAPTER 08A COMPLETE",
      title: "작업 공간<br><em>준비 완료</em>",
      desc: "VS Code에 bas_mkt 폴더가 연결된 상태로 08B를 시작합니다. 08B에서는 터미널을 열고 Codex를 설치합니다.",
      route: [
        "VS Code 설치",
        "bas_mkt 폴더",
        "구글 로그인",
        "폴더 추가 · 신뢰",
        "08B 이어서",
      ],
    },
  ];

  /* ----- 08B: Codex ----- */
  const termBase = (lines, o = {}) =>
    vsc(
      Object.assign(
        {
          cc: "Untitled (Workspace)",
          signed: true,
          chat: false,
          panelMax: true,
          term: T(lines),
        },
        o,
      ),
    );
  SC.B = [
    {
      cover: 1,
      ey: "CHAPTER 08B · CODEX SETUP",
      title: "Codex 설치와<br><em>첫 설정</em>",
      desc: "VS Code 터미널에서 Codex를 설치하고 ChatGPT 계정으로 로그인합니다. 모델과 추론 단계, 사용 권한까지 정합니다.",
      route: [
        "터미널 열기",
        "Codex 설치",
        "로그인",
        "모델 · 추론",
        "권한 Full Access",
      ],
    },
    {
      ey: "STEP 01",
      title: "☰ → Terminal<br><em>New Terminal</em>",
      desc: "bas_mkt가 연결된 VS Code에서 ☰ 메뉴의 Terminal에 마우스를 올리고 New Terminal을 누릅니다.",
      mode: "Terminal → New Terminal",
      tone: "set",
      note: "단축키 Ctrl + Shift + ` 로도 열 수 있습니다.",
      screen: (n) =>
        vsc({
          menu: "burger",
          burgerOpen: true,
          cc: "Untitled (Workspace)",
          signed: true,
          overlay:
            burgerPop("Terminal") +
            menuPop(
              TERM_MENU,
              "left:18.4cqw;top:15.5cqw;min-width:30cqw",
              "New Terminal",
              n,
              "New Terminal",
            ),
        }),
    },
    {
      ey: "STEP 02",
      title: "Chat 닫고<br><em>터미널 크게</em>",
      desc: "아래쪽에 터미널이 열렸습니다. 오른쪽 Chat 창은 ✕로 닫고, 터미널 오른쪽 위의 ⛶ 버튼을 눌러 터미널을 크게 키웁니다.",
      mode: "Chat ✕ · 터미널 ⛶",
      tone: "set",
      note: "터미널 첫 줄에 <b>PS C:\\bas_mkt&gt;</b>가 보여야 합니다. 다른 경로가 보이면 08A의 Add Folder to Workspace를 다시 합니다. 회색 글씨 안내가 함께 보이면 무시합니다.",
      screen: (n) =>
        vsc({
          cc: "Untitled (Workspace)",
          signed: true,
          term: T([`${PS}{CUR}`]),
          panelH: 20,
          maxTarget: n,
        }),
    },
    {
      ey: "STEP 03",
      title: "Codex<br><em>설치 명령 붙여넣기</em>",
      desc: "아래 설치 명령을 복사해 터미널에 붙여넣고 Enter를 누릅니다. 붙여넣기는 Ctrl + V 또는 마우스 오른쪽 클릭입니다.",
      mode: "복사 → 붙여넣기 → Enter",
      tone: "set",
      copy: [{ label: "Codex 설치 명령 (Windows)", code: INSTALL }],
      screen: (n) =>
        termBase([
          tline(
            `${PS}[[typed|${INSTALL}]]{CUR}`,
            n,
            "설치 명령 붙여넣기 → Enter",
          ),
        ]),
    },
    {
      ey: "STEP 04",
      title: "설치 완료 후<br><em>Enter만 누르기</em>",
      desc: "installed successfully가 보이면 설치가 끝난 것입니다. 마지막 줄 “Start Codex now? [y/N]”에서는 아무것도 입력하지 않고 Enter만 누릅니다.",
      mode: "질문에는 Enter",
      tone: "set",
      note: "여기서 Codex를 바로 켜지 않습니다. 다음 단계에서 VS Code를 다시 연 뒤 실행합니다.",
      screen: (n) =>
        termBase([
          `${PS}${INSTALL}`,
          "==> Installing Codex CLI",
          "==> Detected platform: Windows (x64)",
          "==> Resolved version: 0.163.0",
          "==> Downloading Codex CLI",
          "==> PATH updated for future PowerShell sessions.",
          "==> Current PowerShell session: codex",
          "==> Future PowerShell windows: open a new PowerShell window and run: codex",
          "[[g|Codex CLI 0.163.0 installed successfully.]]",
          tline(
            "Start Codex now? [y/N]: {CUR}",
            n,
            "Start Codex now? [y/N] · Enter",
          ),
        ]),
    },
    {
      ey: "STEP 05",
      title: "VS Code를<br><em>껐다 켜기</em>",
      desc: "방금 설치한 codex 명령을 터미널이 알아보도록 VS Code를 오른쪽 위 ✕로 완전히 닫았다가 바탕 화면 아이콘으로 다시 엽니다. bas_mkt 연결은 그대로 유지됩니다.",
      mode: "✕ 닫기 → 다시 실행",
      tone: "warn",
      note: "다시 연 뒤 ☰ → Terminal → New Terminal로 터미널을 열고 ⛶로 크게 키웁니다.",
      screen: (n) =>
        vsc({
          cc: "Untitled (Workspace)",
          signed: true,
          chat: false,
          term: T([`${PS}{CUR}`]),
          panelH: 20,
          closeTarget: n,
        }),
    },
    {
      ey: "STEP 06",
      title: "codex<br><em>입력하고 Enter</em>",
      desc: "터미널에 codex를 입력하고 Enter를 누릅니다. Codex 화면이 터미널 안에 열립니다.",
      mode: "codex → Enter",
      tone: "set",
      copy: [{ label: "Codex 실행", code: "codex" }],
      note: "“codex 용어가 cmdlet... 이름으로 인식되지 않습니다” 오류가 나오면 VS Code를 한 번 더 껐다 켭니다.",
      screen: (n) =>
        termBase([tline(`${PS}[[typed|codex]]{CUR}`, n, "codex 입력 → Enter")]),
    },
    {
      ey: "STEP 07",
      title: "Sign in with<br><em>ChatGPT</em>",
      desc: "처음 실행하면 로그인 방법을 묻습니다. 1번 Sign in with ChatGPT가 선택된 상태에서 Enter를 누릅니다.",
      mode: "1번 선택 → Enter",
      tone: "set",
      screen: (n) =>
        termBase([
          "",
          "  Welcome to [[b|Codex]], OpenAI's command-line coding agent",
          "",
          "  Sign in with ChatGPT to use Codex as part of your paid plan",
          "  or connect an API key for usage-based billing",
          "",
          tline(
            "[[c|> 1. Sign in with ChatGPT]]",
            n,
            "1. Sign in with ChatGPT",
          ),
          "     [[dim|Usage included with Plus, Pro, Business, and Enterprise plans]]",
          "",
          "  2. Sign in with Device Code",
          "     [[dim|Sign in from another device with a one-time code]]",
          "",
          "  3. Provide your own API key",
          "     [[dim|Pay for what you use]]",
          "",
          "  [[dim|Press ]][[b|enter]][[dim| to continue]]",
        ]),
    },
    {
      ey: "STEP 08",
      title: "브라우저가<br><em>자동으로 열림</em>",
      desc: "터미널에 Finish signing in via your browser가 표시되고 브라우저가 열립니다. 터미널은 그대로 두고 브라우저로 넘어갑니다.",
      mode: "브라우저로 이동",
      tone: "keep",
      note: "브라우저가 열리지 않으면 터미널에서 c 키를 눌러 주소를 복사한 뒤 브라우저 주소창에 붙여넣습니다.",
      screen: (n) =>
        termBase([
          "",
          "  [[b|Finish signing in via your browser]]",
          "",
          "  [[dim|If the link doesn't open automatically, press ]][[b|c]][[dim| to copy it:]]",
          "",
          tline(
            "  [[c|https://auth.openai.com/oauth/authorize?response_type=code&client_id=app_…]]",
            n,
            "로그인 주소 · 브라우저가 자동으로 열림",
          ),
          "  [[c|&redirect_uri=http%3A%2F%2Flocalhost%3A1455%2Fauth%2Fcallback…]]",
          "",
          "  [[dim|On a remote or headless machine? Press ]][[b|esc]][[dim| and choose ]][[b|Sign in with Device Code]][[dim|.]]",
          "",
          "  [[dim|Press ]][[b|esc]][[dim| to cancel]]",
        ]),
    },
    {
      ey: "STEP 09",
      title: "브라우저에서<br><em>ChatGPT 로그인</em>",
      desc: "브라우저에 OpenAI 로그인 화면이 열립니다. 평소 ChatGPT에 로그인하는 방법을 그대로 고릅니다. 구글로 가입했다면 Google로 계속하기를 누릅니다.",
      mode: "평소 ChatGPT 로그인 방법",
      tone: "set",
      note: "이미 ChatGPT에 로그인되어 있으면 이 화면 없이 바로 다음 화면으로 넘어갈 수 있습니다. 계속 버튼이 보이면 계속을 누릅니다.",
      screen: (n) =>
        chrome(
          "로그인 - OpenAI",
          '<span style="display:block;width:100%;height:100%;border-radius:50%;background:#0d0d0d"></span>',
          "auth.openai.com/log-in",
          `<div class="oapage"><h6>로그인 또는 회원 가입</h6><p>ChatGPT 계정으로 Codex에 로그인합니다.</p>${tg(`<span style="width:1.4cqw">${I.g}</span>Google로 계속하기`, n, "Google로 계속하기", "oabtn")}<div class="oabtn"><span style="width:1.4cqw">${I.apple}</span>Apple로 계속하기</div><div class="oabtn">⊞ Microsoft로 계속하기</div><div class="or">또는</div><div class="oainp">이메일 주소</div><div class="oabtn black">계속</div></div>`,
        ),
    },
    {
      ey: "STEP 10",
      title: "Signed in<br><em>to Codex</em>",
      desc: "브라우저에 Signed in to Codex가 보이면 로그인이 끝났습니다. 브라우저 탭은 닫고 VS Code 터미널로 돌아갑니다.",
      mode: "완료 화면 확인 → VS Code로",
      tone: "keep",
      screen: (n) =>
        chrome(
          "Sign into Codex",
          '<span style="display:block;width:100%;height:100%">' +
            I.codex +
            "</span>",
          "localhost:1455/success",
          `<div class="oapage" style="padding-top:7cqw"><div style="width:4.6cqw;height:4.6cqw;border-radius:1cqw;box-shadow:0 .1cqw .8cqw rgba(0,0,0,.15);display:grid;place-items:center"><span style="width:2.8cqw">${I.codex}</span></div>${tg('<h6 style="font-weight:400;font-size:2.6cqw;margin:1.6cqw 0 .8cqw">Signed in to Codex</h6>', n, "Signed in to Codex", "", "div")}<p>You may now close this page</p></div>`,
        ),
    },
    {
      ey: "STEP 11",
      title: "로그인 확인 후<br><em>Enter</em>",
      desc: "VS Code 터미널에 Signed in with your ChatGPT account가 표시됩니다. 안내를 읽고 Enter를 누릅니다.",
      mode: "Enter",
      tone: "set",
      screen: (n) =>
        termBase([
          "",
          tline(
            "[[g|✓ Signed in with your ChatGPT account]]",
            n,
            "✓ Signed in with your ChatGPT account",
          ),
          "",
          "  [[b|You're in control]]",
          "  [[dim|Learn about permissions and approvals in the Codex docs]]",
          "",
          "  [[b|Codex can make mistakes]]",
          "  [[dim|Review the code it writes and commands it runs]]",
          "",
          "  [[b|Included with your ChatGPT plan]]",
          "  [[dim|Your plan's rate limits and training data preferences apply]]",
          "",
          "  [[dim|Press ]][[b|enter]][[dim| to continue]]",
        ]),
    },
    {
      ey: "STEP 12",
      title: "샌드박스 안내가<br><em>나오면 1번</em>",
      desc: "Windows에서는 Codex 보호 환경(샌드박스)을 설정할지 물을 수 있습니다. 1번 Set up default sandbox에서 Enter를 누르고, 관리자 권한 창이 뜨면 예를 누릅니다.",
      mode: "1번 → Enter → 예",
      tone: "set",
      note: "이 안내가 나오지 않으면 다음 단계로 넘어갑니다.",
      screen: (n) =>
        termBase([
          ...head(),
          "  Set up the Codex agent sandbox to protect your files and control network access.",
          "  [[dim|Learn more <https://developers.openai.com/codex/windows>]]",
          "",
          tline(
            "[[c|› 1. Set up default sandbox (requires Administrator permissions)]]",
            n,
            "1. Set up default sandbox",
          ),
          "  2. Use non-admin sandbox (higher risk if prompt injected)",
          "  3. Quit",
          "",
          "  [[dim|Press ]][[b|enter]][[dim| to continue]]",
        ]),
    },
    {
      ey: "STEP 13",
      title: "Update 안내가<br><em>나오면 Update now</em>",
      desc: "새 버전이 있으면 시작할 때 Update available 안내가 뜹니다. 1번 Update now에서 Enter를 누르고, 업데이트가 끝나면 codex를 다시 입력해 새로 시작합니다.",
      mode: "Update now → codex 다시 실행",
      tone: "warn",
      copy: [
        { label: "안내 없이 직접 업데이트할 때", code: "codex update" },
        { label: "업데이트 후 다시 시작", code: "codex" },
      ],
      note: "방금 설치했다면 이미 최신 버전이라 이 안내가 나오지 않습니다. 나중에 안내가 뜨면 Update now를 고르고, 업데이트가 끝나면 codex를 다시 실행합니다.",
      screen: (n) =>
        termBase([
          ...head(),
          "  [[b|✨ Update available!]] [[dim|0.163.0 -> 0.164.0]]",
          "",
          "  [[dim|Release notes: https://github.com/openai/codex/releases/latest]]",
          "",
          tline(
            "[[c|› 1. Update now (runs `codex update`)]]",
            n,
            "1. Update now",
          ),
          "  2. Skip",
          "  3. Skip until next version",
          "",
          "  [[dim|Press ]][[b|enter]][[dim| to continue]]",
        ]),
    },
    {
      ey: "STEP 14",
      title: "Codex<br><em>기본 화면</em>",
      desc: "이 화면이 보이면 Codex가 켜진 것입니다. 위에는 버전과 작업 폴더, 아래에는 입력창과 현재 모델이 표시됩니다.",
      mode: "작업 폴더 C:\\bas_mkt 확인",
      tone: "keep",
      note: "폴더 신뢰 질문(Trust this folder?)이 먼저 나오면 Yes를 고르고 Enter를 누릅니다.",
      screen: (n) =>
        termBase([
          "",
          `  [[bl|>_ ]][[b|OpenAI Codex]][[dim| (v0.163.0)]]`,
          tline(`     [[dim|${DIR}]]`, n, "작업 폴더 C:\\bas_mkt"),
          "",
          ...logo(),
          "",
          inputLine(),
          ...footer(),
        ]),
    },
    {
      ey: "STEP 15",
      title: "/model<br><em>입력하기</em>",
      desc: "입력창에 /model을 입력합니다. 목록 맨 위에 /model이 선택되면 Enter를 누릅니다.",
      mode: "/model → Enter",
      tone: "set",
      copy: [{ label: "모델 설정 명령", code: "/model" }],
      screen: (n) =>
        termBase([
          ...head(),
          tline(
            "[[b|›]] /model",
            n,
            "/model",
            "sel",
            "  choose what model and reasoning effort to use",
          ),
          "",
          inputLine("/model"),
          ...footerTyping(),
        ]),
    },
    {
      ey: "STEP 16",
      title: "모델은<br><em>GPT-6.1-Sol</em>",
      desc: "모델 목록에서 GPT-6.1-Sol을 고르고 Enter를 누릅니다. 일반 모델 중 가장 높은 모델입니다.",
      mode: "GPT-6.1-Sol → Enter",
      tone: "set",
      note: "<b>GPT-6-Astra 같은 최상위 모델은 고르지 않습니다.</b> 사용 한도가 훨씬 빨리 줄어듭니다. 교육 시점에 따라 모델 이름은 바뀔 수 있으니, 설명이 “Latest workhorse model”인 일반 모델을 고릅니다.",
      screen: (n) =>
        termBase([
          ...head(),
          "  [[b|Select Model and Effort]]",
          "",
          tline(
            "› 1. GPT-6.1-Sol (current)",
            n,
            "1. GPT-6.1-Sol",
            "sel",
            "  Latest workhorse model for coding and everyday work.",
          ),
          "  2. GPT-6-Astra            [[dim|Frontier intelligence for the most demanding work.]]",
          "  3. GPT-6-Sol              [[dim|Previous generation workhorse model.]]",
          "  4. GPT-6-Luna             [[dim|Fast and affordable model for easier tasks.]]",
          "  5. GPT-5.6-Sol            [[dim|Older generation workhorse model.]]",
          "  6. GPT-5.6-Terra          [[dim|Older balanced model for straightforward work.]]",
          "  7. GPT-5.6-Luna           [[dim|Older fast and efficient model.]]",
          "",
          "  [[b|enter]] [[dim|select ·]] [[b|esc]] [[dim|back]]",
        ]),
    },
    {
      ey: "STEP 17",
      title: "추론은<br><em>Extra high</em>",
      desc: "추론 단계 목록이 나오면 ↓ 키로 4번 Extra high까지 내려가 Enter를 누릅니다. Enter로 고르면 다음 실행 때도 유지됩니다.",
      mode: "↓ → Extra high → Enter",
      tone: "set",
      note: "5번 More reasoning…(Max · Ultra)은 사용 한도를 더 빨리 씁니다. 한도에 자주 걸리면 3번 High로 낮춥니다.",
      screen: (n) =>
        termBase([
          ...head(),
          "  [[b|Select Reasoning Level for GPT-6.1-Sol]]",
          "",
          "  1. Low (default)         [[dim|Fast responses with lighter reasoning]]",
          "  2. Medium                [[dim|Balances speed and reasoning depth for everyday tasks]]",
          "  3. High                  [[dim|Greater reasoning depth for complex problems]]",
          tline(
            "› 4. Extra high",
            n,
            "4. Extra high",
            "sel",
            "            Extra high reasoning depth for complex problems",
          ),
          "  5. More reasoning…       [[dim|Max and Ultra consume usage limits faster]]",
          "",
          "  [[b|enter]] [[dim|default ·]] [[b|s]] [[dim|session ·]] [[b|esc]] [[dim|back]]",
        ]),
    },
    {
      ey: "STEP 18",
      title: "모델 변경<br><em>확인</em>",
      desc: "Model changed to gpt-6.1-sol xhigh가 보이면 모델과 추론 설정이 끝난 것입니다. 아래쪽 상태 줄에도 GPT-6.1-Sol xhigh가 표시됩니다.",
      mode: "GPT-6.1-Sol xhigh 확인",
      tone: "keep",
      screen: (n) =>
        termBase([
          ...head(),
          tline(
            "[[dim|•]] Model changed to gpt-6.1-sol xhigh",
            n,
            "Model changed to gpt-6.1-sol xhigh",
          ),
          "",
          "",
          inputLine(),
          ...footer("GPT-6.1-Sol xhigh"),
        ]),
    },
    {
      ey: "STEP 19",
      title: "/permissions<br><em>입력하기</em>",
      desc: "이어서 입력창에 /permissions를 입력하고 Enter를 누릅니다. Codex가 할 수 있는 일의 범위를 정하는 명령입니다.",
      mode: "/permissions → Enter",
      tone: "set",
      copy: [{ label: "권한 설정 명령", code: "/permissions" }],
      screen: (n) =>
        termBase([
          ...head(),
          "[[dim|•]] Model changed to gpt-6.1-sol xhigh",
          "",
          tline(
            "[[b|›]] /permissions",
            n,
            "/permissions",
            "sel",
            "  choose what Codex is allowed to do",
          ),
          "",
          inputLine("/permissions"),
          ...footerTyping("GPT-6.1-Sol xhigh"),
        ]),
    },
    {
      ey: "STEP 20",
      title: "권한은<br><em>Full Access</em>",
      desc: "권한 목록에서 ↓ 키로 3번 Full Access까지 내려가 Enter를 누릅니다.",
      mode: "↓ ↓ → Full Access → Enter",
      tone: "set",
      screen: (n) =>
        termBase([
          ...head(),
          "  [[b|Update Model Permissions]]",
          "",
          "  1. Ask for approval  [[dim|Read and edit workspace files and run commands, with approval required]]",
          "                       [[dim|for internet access or edits outside the workspace]]",
          "  2. Approve for me    [[dim|Only ask for actions detected as potentially unsafe]]",
          tline(
            "› 3. Full Access",
            n,
            "3. Full Access",
            "sel",
            "       Use with caution: Codex can edit files outside this workspace and",
          ),
          "                       [[dim|access the internet without approval]]",
          "  4. Read Only         [[dim|Read workspace files, with approval required for edits or internet]]",
          "                       [[dim|access]]",
          "",
          "  [[b|enter]] [[dim|select ·]] [[b|esc]] [[dim|back]]",
        ]),
    },
    {
      ey: "STEP 21",
      title: "경고창에서<br><em>Yes, continue</em>",
      desc: "Enable full access? 경고가 한 번 더 나옵니다. 1번 Yes, continue anyway에서 Enter를 누릅니다.",
      mode: "1번 → Enter",
      tone: "set",
      note: "<b>Full Access는 이번 세션에만 적용됩니다.</b> Codex를 새로 켤 때마다 /permissions → Full Access를 다시 고릅니다. 작업은 bas_mkt 폴더 안에서만 시킵니다.",
      screen: (n) =>
        termBase([
          ...head(),
          "",
          "                 [[b|Enable full access?]]",
          "                 When Codex runs with full access, it can edit any file on your",
          "                 computer and run commands with network, without your approval.",
          "                 [[r|Exercise caution when enabling full access. This significantly]]",
          "                 [[r|increases the risk of data loss, leaks, or unexpected behavior.]]",
          "",
          "",
          tline(
            "               › 1. Yes, continue anyway",
            n,
            "1. Yes, continue anyway",
            "sel",
            "  Apply full access for this session",
          ),
          "                 2. Cancel                [[dim|Go back without enabling full access]]",
          "",
          "                 [[b|enter]] [[dim|select ·]] [[b|esc]] [[dim|back]]",
        ]),
    },
    {
      ey: "STEP 22",
      title: "설정 완료<br><em>/status로 확인</em>",
      desc: "/status를 입력하고 Enter를 누르면 지금 설정이 한 번에 보입니다. Model과 Permissions 두 줄을 확인합니다.",
      mode: "Model · Permissions 확인",
      tone: "keep",
      copy: [{ label: "현재 설정 확인", code: "/status" }],
      screen: (n) =>
        termBase([
          "[[dim|•]] Permission selection requested: Full Access",
          "",
          "/status",
          "",
          "  [[bl|>_ ]][[b|OpenAI Codex]][[dim| (v0.163.0)]]",
          "",
          "  [[dim|Visit https://chatgpt.com/settings/usage for up-to-date]]",
          "  [[dim|information on rate limits and credits]]",
          "",
          tline(
            "  Model:               GPT-6.1-Sol (reasoning xhigh, summaries auto)",
            n,
            "Model · Permissions 줄 확인",
          ),
          "  Model provider:      openai",
          `  Directory:           ${DIR}`,
          "  Permissions:         [[b|Full Access]]",
          "  Account:             example@gmail.com (Plus)",
          "  Collaboration mode:  Default",
          "",
          "  Context window:      100% left (0 used / 872K)",
          "  5h limit:            [██████████████████████] 100% left",
          "  Weekly limit:        [██████████████████████] 100% left",
          "",
          inputLine(),
          ...footer("GPT-6.1-Sol xhigh"),
        ]),
    },
    {
      final: 1,
      ey: "CHAPTER 08B COMPLETE",
      title: "Codex<br><em>사용 준비 완료</em>",
      desc: "모델 GPT-6.1-Sol, 추론 Extra high, 권한 Full Access로 Codex가 켜졌습니다. 08C에서는 세션과 사용 한도를 설명합니다.",
      route: [
        "Codex 설치",
        "ChatGPT 로그인",
        "GPT-6.1-Sol · Extra high",
        "Full Access",
        "08C 이어서",
      ],
    },
  ];

  /* ----- 08C: session · limits ----- */
  SC.C = [
    {
      cover: 1,
      ey: "CHAPTER 08C · SESSION & LIMITS",
      title: "세션과<br><em>사용 한도</em>",
      desc: "Codex와 오래 일하려면 세션, 컨텍스트, 사용 한도를 알아야 합니다. 노트에 비유해 쉽게 정리합니다.",
      route: ["세션", "컨텍스트", "핸드오프", "사용 한도", "오류 번호"],
    },
    {
      concept: 1,
      ey: "SESSION",
      title: "세션은<br><em>한 작업 단위</em>",
      desc: "codex를 실행해서 대화를 시작하고 끝낼 때까지가 세션 하나입니다. 노트 한 권을 펼쳐 한 가지 일을 적어 나가는 것과 같습니다.",
      html: `<div class="cards"><div class="card on"><small>SESSION = 노트 한 권</small><strong>한 가지 일을 처음부터 끝까지</strong><p>예: “블로그 글 5개 만들기”, “홈페이지 문구 정리하기”처럼 한 주제로 묶어서 일을 시킵니다.</p></div><div class="card"><small>NEW SESSION</small><strong>다른 일은 새 세션에서</strong><p>주제가 바뀌면 /clear로 새 세션을 시작합니다. 앞 작업의 내용이 섞이지 않아 결과가 정확해집니다.</p></div></div>`,
    },
    {
      ey: "CONTEXT",
      title: "컨텍스트는<br><em>노트 한 바닥</em>",
      desc: "한 세션에서 Codex가 기억할 수 있는 양에는 한도가 있습니다. 노트 한 바닥이 다 차면 더 이상 쓸 수 없는 것과 같습니다. 남은 양은 아래 상태 줄에서 확인합니다.",
      mode: "context left 확인",
      tone: "keep",
      note: "/status를 입력하면 Context window 줄에서 남은 비율을 더 자세히 볼 수 있습니다.",
      screen: (n) =>
        termBase([
          ...head(),
          "[[dim|•]] 블로그 글 5개 초안을 완성했습니다. bas_mkt\\blog 폴더에 저장했습니다.",
          "",
          "",
          inputLine(),
          "",
          tline(
            "  [[dim|GPT-6.1-Sol xhigh · ]][[y|18% context left]]",
            n,
            "18% context left · 노트가 거의 다 참",
          ),
          "  [[dim|? for shortcuts]]",
        ]),
    },
    {
      concept: 1,
      ey: "WHEN FULL",
      title: "노트가 차면<br><em>두 가지 방법</em>",
      desc: "컨텍스트가 거의 다 차면 Codex가 앞부분을 요약해 공간을 만들거나, 내가 직접 정리하고 새 세션으로 넘어갑니다.",
      html: `<div class="cards two"><div class="card"><small>AUTO</small><strong>자동 압축</strong><p>Codex가 알아서 앞의 대화를 요약해 공간을 만듭니다. 편하지만 세부 내용이 빠질 수 있습니다. 직접 하려면 /compact를 입력합니다.</p></div><div class="card on"><small>RECOMMENDED</small><strong>세션 핸드오프 → /clear</strong><p>지금까지 한 일을 파일로 정리하게 한 뒤 /clear로 노트를 비우고, 정리한 파일을 읽혀 이어서 진행합니다.</p></div></div>`,
    },
    {
      ey: "HANDOFF 1",
      title: "핸드오프<br><em>정리 요청</em>",
      desc: "“세션 핸드오프”는 다음 세션이 이어받을 수 있게 지금까지의 내용을 요약해 정리하라는 뜻입니다. 아래 문장을 복사해 Codex에게 보냅니다.",
      mode: "복사 → 붙여넣기 → Enter",
      tone: "set",
      copy: [
        {
          label: "세션 핸드오프 요청",
          code: "지금까지 한 작업을 다음 세션에서 이어갈 수 있게 bas_mkt 폴더의 HANDOFF.md 파일에 정리해 줘. 완료한 일, 남은 일, 다음에 바로 할 일을 나눠서 적어 줘.",
          prompt: true,
        },
      ],
      screen: (n) =>
        termBase([
          ...head(),
          "",
          "",
          tline(
            "[[b|›]] [[typed|지금까지 한 작업을 다음 세션에서 이어갈 수 있게 bas_mkt 폴더의 HANDOFF.md 파일에 정리해 줘.]]",
            n,
            "핸드오프 요청 입력",
          ),
          "  [[typed|완료한 일, 남은 일, 다음에 바로 할 일을 나눠서 적어 줘.]]{CUR}",
          "",
          "  [[dim|GPT-6.1-Sol xhigh · ]][[y|15% context left]]",
          "  [[dim|? for shortcuts]]",
        ]),
    },
    {
      ey: "HANDOFF 2",
      title: "/clear로<br><em>노트 비우기</em>",
      desc: "HANDOFF.md가 만들어진 것을 확인한 뒤 /clear를 입력하고 Enter를 누릅니다. 터미널이 지워지고 새 세션이 시작됩니다.",
      mode: "/clear → Enter",
      tone: "set",
      copy: [{ label: "새 세션 시작", code: "/clear" }],
      screen: (n) =>
        termBase([
          ...head(),
          "[[dim|•]] HANDOFF.md에 완료한 일, 남은 일, 다음 할 일을 정리했습니다.",
          "",
          tline(
            "[[b|›]] /clear",
            n,
            "/clear",
            "sel",
            "  clear the terminal and start a new chat",
          ),
          "",
          inputLine("/clear"),
          "",
          "  [[dim|GPT-6.1-Sol xhigh · ]][[y|14% context left]]",
          "  [[dim|tab to queue message]]",
        ]),
    },
    {
      ey: "HANDOFF 3",
      title: "정리한 파일로<br><em>이어서 진행</em>",
      desc: "새 세션에서 아래 문장을 보내면 Codex가 HANDOFF.md를 읽고 이전 작업을 이어서 합니다.",
      mode: "복사 → 붙여넣기 → Enter",
      tone: "set",
      copy: [
        {
          label: "이어서 진행 요청",
          code: "HANDOFF.md 파일을 읽고 이전 작업을 이어서 진행해 줘.",
          prompt: true,
        },
      ],
      screen: (n) =>
        termBase([
          ...head(),
          "",
          "",
          tline(
            "[[b|›]] [[typed|HANDOFF.md 파일을 읽고 이전 작업을 이어서 진행해 줘.]]{CUR}",
            n,
            "이어서 진행 요청",
          ),
          "",
          "  [[dim|GPT-6.1-Sol xhigh · 100% context left]]",
          "  [[dim|? for shortcuts]]",
        ]),
    },
    {
      ey: "NEXT DAY",
      title: "다음 날<br><em>다시 시작하기</em>",
      desc: "VS Code를 열면 bas_mkt 연결이 그대로 유지됩니다. ☰ → Terminal → New Terminal로 터미널을 열고 codex를 입력합니다. 어제 세션을 그대로 이어가려면 codex resume --last를 입력합니다.",
      mode: "codex 또는 codex resume --last",
      tone: "set",
      copy: [
        { label: "새로 시작", code: "codex" },
        { label: "마지막 세션 이어서", code: "codex resume --last" },
      ],
      note: "Codex를 새로 켰다면 /permissions → Full Access를 다시 고릅니다. 모델과 추론 설정은 유지됩니다.",
      screen: (n) =>
        termBase([
          tline(
            `${PS}[[typed|codex resume --last]]{CUR}`,
            n,
            "codex resume --last",
          ),
        ]),
    },
    {
      concept: 1,
      ey: "USAGE LIMITS",
      title: "사용 한도는<br><em>두 가지</em>",
      desc: "ChatGPT 요금제에는 Codex를 쓸 수 있는 양이 정해져 있습니다. 한도를 다 쓰면 초기화될 때까지 사용이 멈춥니다.",
      html: `<div class="cards two"><div class="card warn"><small>5H LIMIT</small><strong>5시간 한도</strong><p>5시간 동안 쓸 수 있는 양입니다. 다 쓰면 5시간 구간이 초기화될 때까지 멈춥니다. Plus 요금제에 적용됩니다.</p></div><div class="card bad"><small>WEEKLY LIMIT</small><strong>주간 한도</strong><p>일주일 동안 쓸 수 있는 양입니다. 주간 한도를 넘기면 초기화 날짜까지 사용이 중단됩니다.</p></div><div class="card"><small>CHECK</small><strong>/status로 남은 양 확인</strong><p>5h limit과 Weekly limit 줄에 남은 비율과 초기화 시각이 표시됩니다.</p></div><div class="card"><small>OTHER AI</small><strong>다른 AI도 비슷합니다</strong><p>Claude 같은 다른 AI 도구도 5시간 한도와 주간 한도가 있습니다. 5시간 한도를 다 쓰면 그 구간이 끝날 때까지 사용이 정지됩니다.</p></div></div>`,
    },
    {
      ey: "CHECK LIMITS",
      title: "/status로<br><em>남은 한도 보기</em>",
      desc: "/status를 입력하면 5시간 한도와 주간 한도의 남은 비율, 초기화 시각이 보입니다. 큰 작업을 맡기기 전에 확인합니다.",
      mode: "5h limit · Weekly limit",
      tone: "keep",
      copy: [{ label: "한도 확인", code: "/status" }],
      note: "추론을 Extra high로 쓰면 같은 작업에도 한도가 더 빨리 줄어듭니다.",
      screen: (n) =>
        termBase([
          "/status",
          "",
          "  [[bl|>_ ]][[b|OpenAI Codex]][[dim| (v0.163.0)]]",
          "",
          "  [[dim|Visit https://chatgpt.com/settings/usage for up-to-date]]",
          "  [[dim|information on rate limits and credits]]",
          "",
          "  Model:               GPT-6.1-Sol (reasoning xhigh, summaries auto)",
          `  Directory:           ${DIR}`,
          "  Permissions:         Full Access",
          "  Account:             example@gmail.com (Plus)",
          "",
          "  Context window:      62% left (331K used / 872K)",
          tline(
            "  5h limit:            [████████░░░░░░░░░░░░░░] 34% left (resets 8:15 PM)",
            n,
            "5h limit · 남은 비율",
          ),
          "  Weekly limit:        [███████████████░░░░░░░] 71% left (resets 9:00 AM on 21 Oct)",
          "",
          inputLine(),
          "",
          "  [[dim|GPT-6.1-Sol xhigh · 62% context left]]",
        ]),
    },
    {
      concept: 1,
      ey: "ERRORS",
      title: "오류 번호로<br><em>원인 알기</em>",
      desc: "이용자가 몰리는 시간에는 모델이 과부하되어 답이 느려지거나, 답이 나오지 않거나, 오류가 날 수 있습니다. 오류 번호를 보면 원인을 알 수 있습니다.",
      html: `<div class="err-table"><div class="err-row head"><span>번호</span><span>뜻</span><span>이렇게 합니다</span></div><div class="err-row"><b>401</b><strong>로그인 만료</strong><span>codex를 다시 실행해 로그인합니다.</span></div><div class="err-row"><b>403</b><strong>권한 없음</strong><span>요금제와 로그인한 계정을 확인합니다.</span></div><div class="err-row warn"><b>429</b><strong>한도 초과 · 요청 과다</strong><span>/status로 초기화 시각을 확인하고 기다립니다.</span></div><div class="err-row"><b>500</b><strong>서버 내부 오류</strong><span>잠시 뒤 같은 요청을 다시 보냅니다.</span></div><div class="err-row bad"><b>502 · 503</b><strong>서버 과부하 · 점검</strong><span>이용자가 몰리는 시간입니다. 몇 분 뒤 다시 시도합니다.</span></div><div class="err-row"><b>504</b><strong>응답 시간 초과</strong><span>요청을 작게 나눠 다시 보냅니다.</span></div><div class="err-row bad"><b>529</b><strong>Claude 과부하</strong><span>Claude에서 쓰는 번호입니다. 잠시 뒤 다시 시도합니다.</span></div></div>`,
    },
    {
      ey: "NETWORK",
      title: "번호 없이<br><em>멈출 때</em>",
      desc: "Codex는 오류를 번호 없이 문장으로 보여 줄 때가 많습니다. stream disconnected가 보이면 인터넷 연결이 끊긴 것이니 같은 요청을 다시 보냅니다.",
      mode: "같은 요청 다시 보내기",
      tone: "warn",
      screen: (n) =>
        termBase([
          ...head(),
          "[[b|›]] 블로그 글 3번을 다시 다듬어 줘.",
          "",
          tline(
            "[[r|■ stream disconnected before completion: error sending request]]",
            n,
            "stream disconnected · 연결 끊김",
          ),
          "",
          "",
          inputLine(),
          ...footer("GPT-6.1-Sol xhigh"),
        ]),
    },
    {
      final: 1,
      ey: "CHAPTER 08C COMPLETE",
      title: "세션 관리<br><em>준비 완료</em>",
      desc: "VS Code 작업 폴더, Codex 설치와 설정, 세션과 한도 관리까지 마쳤습니다. 08D에서는 에이전트 키트를 Codex에게 전달하고 네이버 첫 로그인까지 진행합니다.",
      route: ["VS Code", "Codex", "세션 · 핸드오프", "사용 한도", "08D 이어서"],
    },
  ];

  /* ================= RENDER ================= */
  // Parts D, E and F live in their own files and register a builder before this script runs.
  const extraPart = (window.AI_SETUP_PARTS || {})[part];
  if (!SC[part] && extraPart)
    SC[part] = extraPart({
      esc,
      tg,
      I,
      chrome,
      termBase,
      tline,
      head,
      inputLine,
      footerTyping,
      desk,
      wTitle,
      DIR,
    });
  const scenes = SC[part];
  const lessonSlide = (s, i) =>
    `<section class="slide" data-title="${esc(s.ey)}"><div class="lesson"><div class="lesson-copy"><span class="step-no">${s.ey}</span><h1>${s.title}</h1><p>${s.desc}</p>${s.mode ? `<span class="mode ${s.tone || "set"}">${s.mode}</span>` : ""}${s.note ? `<div class="note">${s.note}</div>` : ""}${copyBlock(s.copy)}</div><div class="screen-stage">${s.screen(Math.min(i + 1, scenes.length - 1))}</div></div></section>`;
  const stage = document.getElementById("stage");
  stage.innerHTML = scenes
    .map((s, i) => {
      if (s.cover)
        return `<section class="slide${i === 0 ? " active" : ""}"><div class="hero"><p class="eyebrow">${s.ey}</p><h1>${s.title}</h1><p>${s.desc}</p><div class="hero-route">${s.route.map((x) => `<span>${x}</span>`).join("<i></i>")}</div></div></section>`;
      if (s.final)
        return `<section class="slide"><div class="final-stage"><p class="eyebrow">${s.ey}</p><h1>${s.title}</h1><p>${s.desc}</p><div class="final-route">${s.route.map((x) => `<span>${x}</span>`).join("")}</div></div></section>`;
      if (s.concept)
        return `<section class="slide"><div class="concept"><div class="concept-copy"><span class="step-no">${s.ey}</span><h1>${s.title}</h1><p>${s.desc}</p>${s.note ? `<div class="note">${s.note}</div>` : ""}</div><div>${s.html}</div></div></section>`;
      return lessonSlide(s, i);
    })
    .join("");

  function fallback(text) {
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.append(t);
    t.select();
    try {
      document.execCommand("copy");
    } catch {}
    t.remove();
  }
  document.addEventListener(
    "click",
    (e) => {
      const b = e.target.closest(".copy-btn");
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      const text = b.dataset.copy;
      const done = () => {
        b.textContent = "복사됨";
        b.classList.add("done");
        setTimeout(() => {
          b.textContent = "복사";
          b.classList.remove("done");
        }, 1600);
      };
      if (navigator.clipboard?.writeText)
        navigator.clipboard.writeText(text).then(done, () => {
          fallback(text);
          done();
        });
      else {
        fallback(text);
        done();
      }
    },
    true,
  );

  const slides = [...document.querySelectorAll(".slide")];
  let index = 0;
  const current = document.getElementById("current"),
    total = document.getElementById("total"),
    progress = document.getElementById("progress"),
    prevButton = document.getElementById("prev"),
    nextButton = document.getElementById("next");
  const NAV = {
    A: {
      prev: "chapter-07b-ad-form.html#/999",
      next: "chapter-08b-ai-codex.html#/1",
      nextLabel: "08B 이어서",
    },
    B: {
      prev: "chapter-08-ai-vscode.html#/999",
      next: "chapter-08c-ai-session.html#/1",
      nextLabel: "08C 이어서",
    },
    C: {
      prev: "chapter-08b-ai-codex.html#/999",
      next: "chapter-08d-ai-kit.html#/1",
      nextLabel: "08D 이어서",
    },
    D: {
      prev: "chapter-08c-ai-session.html#/999",
      next: "chapter-08e-blog-setup.html#/1",
      nextLabel: "08E 이어서",
    },
    E: {
      prev: "chapter-08d-ai-kit.html#/999",
      next: "chapter-08f-blog-write.html#/1",
      nextLabel: "08F 이어서",
    },
    F: {
      prev: "chapter-08e-blog-setup.html#/999",
      next: "social-content-training.html",
      nextLabel: "다음 챕터",
    },
  }[part];
  total.textContent = String(slides.length).padStart(2, "0");
  function show(n) {
    index = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, i) => s.classList.toggle("active", i === index));
    current.textContent = String(index + 1).padStart(2, "0");
    progress.style.width = `${((index + 1) / slides.length) * 100}%`;
    prevButton.textContent = index === 0 ? "이전 챕터" : "이전";
    nextButton.textContent =
      index === slides.length - 1 ? NAV.nextLabel : "다음";
    history.replaceState(null, "", `#/${index + 1}`);
  }
  function move(d) {
    if (d < 0 && index === 0) {
      location.href = NAV.prev;
      return;
    }
    if (d > 0 && index === slides.length - 1) {
      location.href = NAV.next;
      return;
    }
    show(index + d);
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (t) {
      e.stopPropagation();
      show(Number(t.dataset.go));
    }
  });
  prevButton.onclick = () => move(-1);
  nextButton.onclick = () => move(1);
  document.getElementById("replay").onclick = () => show(0);
  document.getElementById("full").onclick = () =>
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen?.();
  const nextKeys = new Set([
      "ArrowRight",
      "ArrowDown",
      "PageDown",
      " ",
      "Enter",
      "MediaTrackNext",
    ]),
    previousKeys = new Set([
      "ArrowLeft",
      "ArrowUp",
      "PageUp",
      "Backspace",
      "MediaTrackPrevious",
    ]);
  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.target.closest?.(".copy-btn")) return;
    if (nextKeys.has(e.key)) {
      e.preventDefault();
      move(1);
      return;
    }
    if (previousKeys.has(e.key)) {
      e.preventDefault();
      move(-1);
      return;
    }
    if (e.key === "Home") show(0);
    if (e.key === "End") show(slides.length - 1);
    if (e.key.toLowerCase() === "r") show(index);
    if (e.key.toLowerCase() === "f") document.getElementById("full").click();
  });
  const want = parseInt(location.hash.split("/")[1], 10) || 1;
  show(want >= 999 ? slides.length - 1 : Math.max(0, want - 1));
})();
