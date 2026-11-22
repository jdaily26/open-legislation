"use strict";

const byId = (id) => document.getElementById(id);
const data = JSON.parse(byId("library-data").textContent);
const documents = data.documents;
const panel = byId("document");
const workspace = byId("workspace");
const files = byId("document-files");
const contents = byId("contents");
const repository = data.repository;
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
let view;
let routeHash;
let readableRevision;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, destination, route = false) {
  const node = element("a", text);
  node.href = destination;
  if (route) node.setAttribute("data-route", "");
  return node;
}

function formatDate(date) {
  return dateFormat.format(new Date(date + "T00:00:00Z"));
}

function baseRoute(state) {
  return "#" + state.group + "/" + state.edition;
}

function readLocation() {
  const [group, edition, action, revision, section] = location.hash.slice(1).split("/");
  if (!Object.hasOwn(documents, group)) return { group: "brief", edition: "example", action: "read" };
  const state = { group, edition: edition === "template" ? "template" : "example", action: "read" };
  if (action === "history") return { ...state, action };
  if (action === "revision" || action === "compare") return { ...state, action, revision, section };
  if (action === "section") return { ...state, section: revision };
  return state;
}

function setCurrent(node, selected) {
  if (selected) node.setAttribute("aria-current", "page");
  else node.removeAttribute("aria-current");
}

function prepareDocument(active, current) {
  byId("document-tools").hidden = false;
  const type = view.edition === "template" ? "Template" : "Model draft";
  byId("version-label").textContent = [active.label, current ? type : "Archived version"].join(" · ");
  readableRevision = active;
  const wordDownload = byId("download-word");
  wordDownload.hidden = !active.word;
  if (active.word) wordDownload.setAttribute("href", active.word);
  else wordDownload.removeAttribute("href");

  panel.innerHTML = active.body;
  const headings = [...panel.querySelectorAll(":scope > h3")].filter((node) => node.textContent.trim() && node.textContent !== "Contents");
  const list = byId("contents-list");
  list.replaceChildren();
  const prefix = baseRoute(view) + (current ? "/section/" : "/revision/" + active.id + "/");
  const counts = new Map();
  for (const heading of headings) {
    const slug = heading.textContent.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    const count = (counts.get(slug) ?? 0) + 1;
    counts.set(slug, count);
    const id = slug + (count > 1 ? "-" + count : "");
    heading.id = prefix.slice(1) + id;
    heading.dataset.section = id;
    heading.tabIndex = -1;
    const item = element("li");
    item.append(link(heading.textContent, prefix + id, true));
    list.append(item);
  }
  contents.hidden = headings.length < 3 || (view.group !== "bill" && view.group !== "package");

  for (const table of panel.querySelectorAll("table")) {
    const wrap = element("div", null, "table-wrap");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", "Document table");
    wrap.tabIndex = 0;
    table.before(wrap);
    wrap.append(table);
  }
}

function historyView(item, editions) {
  const route = baseRoute(view);
  const lead = element("p", item.label + " · " + (view.edition === "template" ? "Template" : "Data center example"), "navigation-note");
  const list = element("ol", null, "version-list");
  for (const [index, revision] of editions.revisions.entries()) {
    const card = element("li", null, "version-row");
    const info = element("div", null, "version-top");
    const time = element("time", formatDate(revision.date));
    time.dateTime = revision.date;
    time.title = revision.archivedDraft ? "Original draft date" : "Date added to the repository";
    info.append(element("strong", revision.label), time);
    if (index === 0) info.append(element("span", "Current", "version-current"));
    const actions = element("div", null, "version-actions");
    actions.append(link("Read " + revision.label, index === 0 ? route : route + "/revision/" + revision.id, true));
    if (revision.changes) actions.append(link("Compare with previous", route + "/compare/" + revision.id, true));
    else actions.append(element("span", "First version in the repository", "navigation-note"));
    card.append(info, element("p", revision.summary), actions);
    list.append(card);
  }
  panel.replaceChildren(element("h2", "Revision history"), lead, list);
}

function comparisonView(item, newer, older) {
  const route = baseRoute(view);
  panel.replaceChildren(
    element("h2", "Compare revisions"),
    element("p", item.label + " · " + older.label + " → " + newer.label, "diff-intro"),
    element("p", newer.summary),
  );
  if (!newer.changes.length) {
    panel.append(element("p", "This revision changes only spacing."));
  }
  for (const block of newer.changes) {
    const patch = element("div", null, "diff-block");
    for (const [kind, text] of block) {
      const row = element("div", null, "diff-line");
      const marker = element("span", { added: "+", removed: "−", context: "" }[kind], "diff-marker");
      marker.setAttribute("aria-hidden", "true");
      const line = element("code");
      if (kind !== "context") line.append(element("span", kind === "added" ? "Added: " : "Removed: ", "sr-only"));
      const heading = text.match(/^#{1,6} (.+)$/);
      const readable = (heading ? heading[1] : text).replace(/\\([\[\]*_])/g, "$1");
      line.append(heading ? element("strong", readable) : readable);
      row.dataset.kind = kind;
      row.append(marker, line);
      patch.append(row);
    }
    panel.append(patch);
  }
  const actions = element("div", null, "version-actions");
  const newest = newer.id === documents[view.group].editions[view.edition].revisions[0].id;
  actions.append(
    link("Read " + older.label, route + "/revision/" + older.id, true),
    link("Read " + newer.label, newest ? route : route + "/revision/" + newer.id, true),
    link("Back to revision history", route + "/history", true),
  );
  panel.append(actions);
}

function scrollToPanel() {
  const toolbar = workspace.querySelector(".toolbar");
  if (panel.getBoundingClientRect().top < toolbar.getBoundingClientRect().bottom || panel.getBoundingClientRect().top > innerHeight - 235) {
    workspace.scrollIntoView({ block: "start" });
  }
  const title = panel.querySelector(":scope > h2");
  if (title) title.tabIndex = -1;
  (title ?? panel).focus({ preventScroll: true });
}

function render(moveFocus = false) {
  if (routeHash === location.hash) return;
  routeHash = location.hash;
  view = readLocation();
  panel.dataset.view = view.action;
  const selected = documents[view.group];
  const edition = selected.editions[view.edition];
  const revisions = edition.revisions;
  const route = baseRoute(view);
  const latest = revisions[0];
  const revisionIndex = view.revision ? revisions.findIndex(({ id }) => id === view.revision) : 0;
  const revision = revisions[revisionIndex];
  const older = revisions[revisionIndex + 1];
  const active = revision ?? latest;
  for (const node of byId("document-list").querySelectorAll("a")) {
    node.href = "#" + node.dataset.group + "/" + view.edition;
    setCurrent(node, node.dataset.group === view.group);
  }
  for (const name of ["template", "example"]) {
    const node = byId(name + "-link");
    node.href = "#" + view.group + "/" + name;
    setCurrent(node, name === view.edition);
  }
  byId("history-link").href = route + "/history";
  setCurrent(byId("history-link"), view.action === "history");
  byId("contribute-link").href = repository + "/edit/main/" + edition.source;
  byId("source-link").href = repository + "/blob/" + active.commit + "/" + edition.source;
  byId("document-tools").hidden = true;
  contents.open = false;
  files.open = false;
  if (view.action === "history") {
    historyView(selected, edition);
  } else if (view.action === "compare" && revision && older) {
    comparisonView(selected, revision, older);
  } else if (revision && view.action !== "compare") {
    prepareDocument(revision, revisionIndex === 0);
    if (revisionIndex !== 0) {
      const previous = link("Back to revision history", route + "/history", true);
      previous.className = "button";
      panel.append(previous);
    }
  } else {
    panel.replaceChildren(
      element("h2", "Revision unavailable"),
      element("p", "This revision link doesn’t match the document."),
      link("View revision history", route + "/history", true),
    );
  }

  if (view.section) {
    const section = [...panel.querySelectorAll("[data-section]")].find((node) => node.dataset.section === view.section);
    if (section) {
      section.scrollIntoView({ block: "start" });
      section.focus({ preventScroll: true });
      return;
    }
  }
  if (moveFocus || location.hash) scrollToPanel();
}

for (const [name, spec] of Object.entries(documents)) {
  const node = link(null, "#" + name + "/example", true);
  node.className = "document-link";
  node.dataset.group = name;
  node.append(element("strong", spec.label), element("span", spec.summary));
  byId("document-list").append(node);
}

function activateTheme(preference) {
  const dark = preference === "dark";
  document.documentElement.dataset.theme = preference;
  byId("theme-toggle").textContent = dark ? "Light mode" : "Dark mode";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#141c17" : "#f3f1e8";
}
const colorPreference = matchMedia("(prefers-color-scheme: dark)");
function loadTheme() {
  try {
    const saved = localStorage.getItem("open-legislation-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return colorPreference.matches ? "dark" : "light";
}
activateTheme(loadTheme());
colorPreference.addEventListener("change", () => activateTheme(loadTheme()));
byId("theme-toggle").addEventListener("click", () => {
  const setting = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("open-legislation-theme", setting); } catch {}
  activateTheme(setting);
});

document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a[data-route]");
  if (anchor && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    if (anchor.hash !== location.hash) {
      history.pushState(null, "", anchor.hash);
      render(true);
    } else {
      scrollToPanel();
    }
  }
  if (files.open && !files.contains(event.target)) files.open = false;
});
addEventListener("popstate", () => render(true));
addEventListener("hashchange", () => render(true));

for (const [control, target] of [[".skip-link", panel], ["#back-to-documents", byId("documents")]]) {
  document.querySelector(control).addEventListener("click", (event) => {
    event.preventDefault();
    target.scrollIntoView({ block: "start" });
    target.focus({ preventScroll: true });
  });
}
files.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && files.open) {
    files.open = false;
    files.querySelector("summary").focus();
  }
});
byId("download-markdown").addEventListener("click", () => {
  const blob = new Blob([readableRevision.markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const download = link(null, url);
  download.download = readableRevision.filename;
  download.hidden = true;
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
});
byId("print-document").addEventListener("click", () => {
  files.open = false;
  window.print();
  files.querySelector("summary").focus();
});

byId("repository-link").href = repository;
workspace.querySelector(".toolbar").hidden = false;
byId("theme-toggle").hidden = false;
byId("document-footer").hidden = false;
render();
