# Open Legislation

[Read the public library](https://jdaily26.github.io/open-legislation/).

A public collection of policy briefs, model state bills, committee fact sheets and legislative packages. The worked proposals cover **Data Center Community Benefits** and **School District AI Purchasing Reports**.

| Document | Reusable template | Data center example | AI in schools |
| --- | --- | --- | --- |
| Policy brief | [Template](documents/templates/policy-brief.md) | [Data center brief](documents/data-center-community-benefits/policy-brief.md) | [Policy brief](documents/school-ai-purchasing/policy-brief.md) |
| State bill | [Template](documents/templates/state-bill.md) | [Data center model bill](documents/data-center-community-benefits/state-bill.md) | [State bill](documents/school-ai-purchasing/state-bill.md) |
| Committee fact sheet | [Template](documents/templates/committee-fact-sheet.md) | [Data center fact sheet](documents/data-center-community-benefits/committee-fact-sheet.md) | [Committee fact sheet](documents/school-ai-purchasing/committee-fact-sheet.md) |
| Legislative package | [Template](documents/templates/legislative-package.md) | [Data center package](documents/data-center-community-benefits/legislative-package.md) | [Legislative package](documents/school-ai-purchasing/legislative-package.md) |
| Rebuttals | [Template](documents/templates/rebuttals.md) | [Data center rebuttals](documents/data-center-community-benefits/rebuttals.md) | [Rebuttals](documents/school-ai-purchasing/rebuttals.md) |
| Talking points | [Template](documents/templates/talking-points.md) | [Data center talking points](documents/data-center-community-benefits/talking-points.md) | [Talking points](documents/school-ai-purchasing/talking-points.md) |

## Suggest a change

Use **Suggest an edit** on a document or open its Markdown file and choose **Edit** on GitHub. In your pull request, name the section, explain the change, and link evidence for new factual claims. For a bill, check whether the change also affects the brief, fact sheet, or package.

Accepted document changes appear in the library’s revision history. The history follows the main branch and gives each document version a direct link. The first archive commit preserves the model clauses and fact sheets from the November 20 working draft. The v1.0 commit contains the full library.

## Build locally

Run `python3 -m pip install -r requirements.txt` in a virtual environment, then `python3 tools/build.py`. Open `dist/index.html` or serve `dist` with a local web server. Clone with full Git history to build all revisions.

The Markdown files under `documents/` are the source. Update `catalog.json` when adding a document to the library. Optional release notes use a commit title such as `v1.1: Short summary` and an entry under that version in the catalog. Word files in `downloads/` are matched to the document and version in their filenames.
