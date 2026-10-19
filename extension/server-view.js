/**
 * Server view page.
 *
 * The popup fetches the tab's HTML again, screenshots the tab, and leaves both
 * in extension storage under a random id; this page draws them side by side.
 * The server HTML only ever goes into a sandboxed srcdoc frame (see
 * src/ui/server-view-doc.js) — nothing from it touches this document.
 */

document.addEventListener("DOMContentLoaded", () => {
  window.applyI18n(document);
  applyTheme();
  load();
});

function applyTheme() {
  chrome.storage.sync.get({ darkMode: "auto" }, (settings) => {
    const dark =
      settings.darkMode === "dark" ||
      (settings.darkMode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  });
}

function load() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[\w-]+$/.test(id)) {
    showMissing();
    return;
  }

  const { area } = window.SSRServerView.storageArea(chrome);
  const key = window.SSRServerView.STORAGE_PREFIX + id;
  area.get(key, (values) => {
    const entry = !chrome.runtime.lastError && values ? values[key] : null;
    if (!entry || typeof entry.html !== "string") {
      showMissing();
      return;
    }
    if (entry.deleteAfterRead) area.remove(key, () => void chrome.runtime.lastError);
    render(entry);
  });
}

function showMissing() {
  const status = document.getElementById("status");
  status.hidden = false;
  status.textContent = window.t(
    "serverViewMissing",
    "This preview is no longer available. Open the extension on the page and choose “See server view” again.",
  );
}

function httpHref(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function notice(text, tone) {
  const node = document.createElement("div");
  node.className = "notice";
  if (tone) node.dataset.tone = tone;
  node.setAttribute("role", "note");
  node.textContent = text;
  return node;
}

function render(entry) {
  document.getElementById("status").hidden = true;

  const title = String(entry.title || "").trim();
  document.title = `${window.t("serverViewTitle", "Server view")} — ${title || entry.url}`;

  const info = document.getElementById("page-info");
  info.hidden = false;
  document.getElementById("page-title").textContent = title;
  document.getElementById("page-title").hidden = !title;
  const link = document.getElementById("page-url");
  link.textContent = entry.url;
  const href = httpHref(entry.url);
  if (href) link.href = href;

  const fetched = new Date(entry.fetchedAt || Date.now()).toLocaleString();
  const meta = [window.t("serverViewFetched", "Fetched {time}").replace("{time}", fetched)];
  if (entry.status) {
    meta.push(window.t("serverViewStatus", "HTTP {status}").replace("{status}", String(entry.status)));
  }
  document.getElementById("page-meta").textContent = meta.join(" · ");

  const notices = [];
  if (entry.fetchError) {
    notices.push(
      notice(
        window
          .t("serverViewFetchError", "The page's HTML could not be fetched again ({error}).")
          .replace("{error}", entry.fetchError),
        "warn",
      ),
    );
  } else if (entry.status !== 200) {
    notices.push(
      notice(
        window
          .t(
            "serverViewNotOk",
            "The server answered HTTP {status}. This may be a bot check or an error page, not what visitors get.",
          )
          .replace("{status}", String(entry.status)),
        "warn",
      ),
    );
  }
  if (entry.truncated) {
    notices.push(
      notice(
        window.t(
          "serverViewTruncated",
          "The server HTML was larger than 2 MB, so only the first 2 MB are shown.",
        ),
        "warn",
      ),
    );
  }
  const noticeBox = document.getElementById("notices");
  noticeBox.replaceChildren(...notices);
  noticeBox.hidden = notices.length === 0;

  const widthApi = window.SSRServerViewWidth;
  const viewport = widthApi.validViewport(entry.viewport);
  const options = widthApi.buildOptions(viewport);
  const prepared = window.SSRServerView.prepareSrcdoc(entry.html, entry.url);
  const frame = window.SSRServerView.createServerFrame(
    document,
    prepared.srcdoc,
    window.t("serverViewServerPane", "From the server (no JavaScript)"),
  );
  const serverBox = document.getElementById("server-viewport");
  serverBox.replaceChildren(frame);

  const liveBox = document.getElementById("live-viewport");
  const liveNote = document.getElementById("live-note");
  const hasLiveShot = typeof entry.liveShot === "string" && entry.liveShot.startsWith("data:image/");
  if (hasLiveShot) {
    const img = document.createElement("img");
    img.src = entry.liveShot;
    img.alt = window.t("serverViewLivePane", "Live page (after JavaScript)");
    liveBox.replaceChildren(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = window.t(
      "serverViewNoShot",
      "No screenshot of the live page was available.",
    );
    liveBox.replaceChildren(placeholder);
    liveNote.textContent = "";
  }

  const widthNote = document.getElementById("server-width-note");
  const widthControls = document.getElementById("server-width-controls");
  const labelKeys = {
    desktop: ["serverViewWidthDesktop", "Desktop"],
    tablet: ["serverViewWidthTablet", "Tablet"],
    mobile: ["serverViewWidthMobile", "Mobile"],
    window: ["serverViewWidthWindow", "Window"],
  };
  const buttons = options.map((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");
    button.dataset.widthId = option.id;
    button.tabIndex = -1;

    const [key, fallback] = labelKeys[option.id];
    const name = document.createElement("span");
    name.textContent = window.t(key, fallback);
    const width = document.createElement("span");
    width.className = "width-option-value";
    width.textContent = String(option.width);
    button.append(name, width);
    button.addEventListener("click", () => selectOption(option));
    return button;
  });
  widthControls.replaceChildren(...buttons);

  let selectedOption = options.find(
    (option) => option.id === widthApi.defaultOptionId(viewport),
  ) || options[0];

  const fit = () => {
    const { scale, boxHeight, offsetX } = widthApi.computeFit(
      serverBox.clientWidth,
      selectedOption.width,
      selectedOption.height,
    );
    frame.width = String(selectedOption.width);
    frame.height = String(selectedOption.height);
    frame.style.transform = `scale(${scale})`;
    frame.style.left = `${offsetX}px`;
    serverBox.style.height = `${boxHeight}px`;
    if (!hasLiveShot) liveBox.style.height = `${boxHeight}px`;
  };

  function selectOption(option) {
    selectedOption = option;
    buttons.forEach((button) => {
      const checked = button.dataset.widthId === option.id;
      button.setAttribute("aria-checked", String(checked));
      button.tabIndex = checked ? 0 : -1;
    });
    widthNote.hidden = !widthApi.showsWidthNote(option.id);
    if (hasLiveShot) {
      liveNote.textContent = widthApi.liveShotLabelNeeded(option, viewport)
        ? window
            .t("serverViewShotAtWidth", "Live screenshot at {width}px (your window)")
            .replace("{width}", String(viewport.width))
        : window.t("serverViewShotNote", "Screenshot of the tab when you opened this view.");
    }
    fit();
  }

  widthControls.addEventListener("keydown", (event) => {
    const currentIndex = buttons.findIndex((button) => button === document.activeElement);
    if (currentIndex < 0) return;

    let nextIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    selectOption(options[nextIndex]);
    buttons[nextIndex].focus();
  });

  document.getElementById("panes").hidden = false;
  selectOption(selectedOption);
  new ResizeObserver(fit).observe(serverBox);
}
