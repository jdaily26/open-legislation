"""Build the public library from the committed Markdown and its main-branch history."""

import argparse
from difflib import SequenceMatcher
import json
from pathlib import Path
import re
import shutil
import subprocess

from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN = MarkdownIt("commonmark", {"html": False}).enable("table")
VERSION = re.compile(r"^(v\d+(?:\.\d+)+):\s+(.*)$")


def git(*args):
    return subprocess.check_output(
        ["git", *args], cwd=ROOT, text=True, encoding="utf-8"
    )


def changed_lines(older, newer):
    old_lines = older.splitlines()
    new_lines = newer.splitlines()
    blocks = []
    for group in SequenceMatcher(None, old_lines, new_lines, autojunk=False).get_grouped_opcodes(1):
        block = []
        for kind, start, stop, next_start, next_stop in group:
            if kind == "equal":
                block.extend(["context", line] for line in old_lines[start:stop] if line)
            if kind in ("delete", "replace"):
                block.extend(["removed", line] for line in old_lines[start:stop] if line)
            if kind in ("insert", "replace"):
                block.extend(["added", line] for line in new_lines[next_start:next_stop] if line)
        if any(kind != "context" for kind, _ in block):
            blocks.append(block)
    return blocks


def document_html(text):
    rendered = MARKDOWN.render(text)
    return re.sub(r"(</?h)([1-5])(>)", lambda tag: tag[1] + str(int(tag[2]) + 1) + tag[3], rendered)


def history(relative_path, release_notes, draft_dates, key):
    hashes = git(
        "log", "--first-parent", "--diff-filter=AM", "--format=%H", "HEAD", "--", relative_path
    ).splitlines()
    if not hashes:
        raise ValueError(f"No committed revision for {relative_path}")

    versions = []
    previous_text = None
    for sha in reversed(hashes):
        text = git("show", f"{sha}:{relative_path}")
        if text == previous_text:
            continue
        date, subject = git("show", "-s", "--format=%as%n%s", sha).strip().splitlines()
        match = VERSION.fullmatch(subject)
        label, title = match.groups() if match else (sha[:9], subject)
        filename = Path(relative_path).stem
        versions.append({
            "id": sha[:9],
            "commit": sha,
            "label": label,
            "date": draft_dates.get(label, date),
            "archivedDraft": label in draft_dates,
            "summary": release_notes.get(label, {}).get(key, title),
            "body": document_html(text),
            "filename": f"{filename}-{relative_path.split('/')[1]}-{label}.md",
            "markdown": text,
            "changes": changed_lines(previous_text, text) if previous_text is not None else None,
        })
        previous_text = text
    return list(reversed(versions))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="dist", type=Path)
    arguments = parser.parse_args()
    output = arguments.out.resolve()
    output.mkdir(parents=True, exist_ok=True)

    catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
    data = {"repository": catalog["repository"], "documents": {}}
    for key, entry in catalog["documents"].items():
        document = {"label": entry["label"], "summary": entry["summary"], "editions": {}}
        for edition, directory in catalog["collections"].items():
            source = f"documents/{directory}/{entry['file']}"
            versions = history(source, catalog["releases"], catalog["draftDates"], f"{key}/{edition}")
            reference_word = f"{key}-{edition}-v1.0.docx"
            for version in versions:
                if version["label"] == "v1.0" and (ROOT / "downloads" / reference_word).is_file():
                    version["word"] = "downloads/" + reference_word
            document["editions"][edition] = {"source": source, "revisions": versions}
        data["documents"][key] = document

    encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    initial = data["documents"]["brief"]["editions"]["example"]["revisions"][0]["body"]
    layout = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
    layout = layout.replace("<!-- INITIAL_DOCUMENT -->", initial).replace("<!-- LIBRARY_DATA -->", encoded)
    (output / "index.html").write_text(layout, encoding="utf-8")
    for file in ("style.css", "library.js"):
        shutil.copy2(ROOT / "site" / file, output / file)
    shutil.copytree(ROOT / "downloads", output / "downloads", dirs_exist_ok=True)


if __name__ == "__main__":
    main()
