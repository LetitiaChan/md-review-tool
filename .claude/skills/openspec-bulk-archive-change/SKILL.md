---
name: openspec-bulk-archive-change
description: Archive multiple completed changes at once. Use when archiving several parallel changes.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.1"
  generatedBy: "1.2.0"
---

<!-- AUTO-GENERATED full copy from .aikp/skills/openspec-bulk-archive-change/SKILL.md — DO NOT EDIT -->
<!-- To modify, edit the source file and run: npm run sync-aikit -->

Archive multiple completed changes in a single operation.

This skill allows you to batch-archive changes, handling spec conflicts intelligently by checking the codebase to determine what's actually implemented.

**Input**: None required (prompts for selection)

**Steps**

1. **Get active changes**

   Run `openspec list --json` to get all active changes.

   If no active changes exist, inform user and stop.

2. **Prompt for change selection**

   Use **AskUserQuestion tool** with multi-select to let user choose changes:
   - Show each change with its schema
   - Include an option for "All changes"
   - Allow any number of selections (1+ works, 2+ is the typical use case)

   **IMPORTANT**: Do NOT auto-select. Always let the user choose.

3. **Batch validation - gather status for all selected changes**

   For each selected change, collect:

   a. **Artifact status** - Run `openspec status --change "<name>" --json`
      - Parse `schemaName` and `artifacts` list
      - Note which artifacts are `done` vs other states

   b. **Task completion** - Read `openspec/changes/<name>/tasks.md`
      - Count `- [ ]` (incomplete) vs `- [x]` (complete)
      - If no tasks file exists, note as "No tasks"

   c. **Delta specs** - Check `openspec/changes/<name>/specs/` directory
      - List which capability specs exist
      - For each, extract requirement names (lines matching `### Requirement: <name>`)

4. **Archive target assessment — identify spec merge destinations for ALL selected changes**

   **IMPORTANT**: This step MUST be completed before any spec sync, conflict resolution, or archive action.

   a. **Scan the main spec library** at `openspec/specs/`:
      - List all existing capability directory names with their file sizes

   b. **Scan archived changes** at `openspec/changes/archive/`:
      - For each archived change, note its capability names (under `specs/`)

   c. **Build a comprehensive merge destination map** across all selected changes:

      For each selected change's delta specs, classify each capability:
      - 🔄 **Merge into existing** — capability name matches an existing main spec
      - 🆕 **Create new** — capability name not found in main specs
      - ⚠️ **Possible duplicate** — similar name to an existing spec; ask user whether to merge or create new
      - ⚡ **Cross-change conflict** — multiple selected changes target the same capability (resolved in Step 5)

   d. **Present the combined assessment to user** and use **AskUserQuestion tool** to confirm:
      - Show each change's capabilities with their classification and intended action
      - Flag any cross-change conflicts (same capability touched by 2+ changes)
      - Options: "Proceed", "Merge <X> into <Y>" (redirect), or "Cancel — stop entire operation"
      - If ⚠️ possible duplicate detected, explicitly ask whether to merge into existing or create new

   **Cancel behavior**: If user chooses "Cancel" at this step, stop the entire bulk archive process. No specs will be synced and no changes will be archived.

   e. **Record user's confirmed merge plan** for use in Steps 5-8.

   **If no selected changes have delta specs**: Skip this step.

5. **Detect spec conflicts (using confirmed merge plan)**

   Build a map of `capability -> [changes that touch it]` based on the confirmed merge destinations:

   ```
   auth -> [change-a, change-b]  <- CONFLICT (2+ changes)
   api  -> [change-c]            <- OK (only 1 change)
   ```

   A conflict exists when 2+ selected changes have delta specs targeting the same capability (considering any redirections from Step 4).

6. **Resolve conflicts agentically**

   **For each conflict**, investigate the codebase:

   a. **Read the delta specs** from each conflicting change to understand what each claims to add/modify

   b. **Search the codebase** for implementation evidence:
      - Look for code implementing requirements from each delta spec
      - Check for related files, functions, or tests

   c. **Determine resolution**:
      - If only one change is actually implemented -> sync that one's specs
      - If both implemented -> apply in chronological order (older first, newer overwrites)
      - If neither implemented -> skip spec sync, warn user

   d. **Record resolution** for each conflict:
      - Which change's specs to apply
      - In what order (if both)
      - Rationale (what was found in codebase)

7. **Show consolidated status table and get final confirmation**

   Display a table summarizing all changes:

   ```
   | Change               | Artifacts | Tasks | Specs   | Merge Target   | Conflicts | Status |
   |---------------------|-----------|-------|---------|----------------|-----------|--------|
   | schema-management   | Done      | 5/5   | 2 delta | 🔄 existing ×2 | None      | Ready  |
   | project-config      | Done      | 3/3   | 1 delta | 🆕 new ×1      | None      | Ready  |
   | add-oauth           | Done      | 4/4   | 1 delta | 🔄 existing    | auth (!)  | Ready* |
   | add-verify-skill    | 1 left    | 2/5   | None    | —              | None      | Warn   |
   ```

   For conflicts, show the resolution:
   ```
   * Conflict resolution:
     - auth spec: Will apply add-oauth then add-jwt (both implemented, chronological order)
   ```

   For incomplete changes, show warnings:
   ```
   Warnings:
   - add-verify-skill: 1 incomplete artifact, 3 incomplete tasks
   ```

   **Before performing any file operations**, show a final confirmation summary and use **AskUserQuestion tool** to get explicit confirmation:

   ```
   ## Ready to Bulk Archive: N changes

   | Change | Schema | Specs | Merge Target | Conflicts | Status |
   | ... (condensed status table) ... |

   Archive destination: openspec/changes/archive/YYYY-MM-DD-<name>/

   Proceed with bulk archive?
   1. "Archive all N changes"
   2. "Archive only M ready changes (skip incomplete)"
   3. "Cancel — stop entire operation"
   ```

   Options explained:
     - "Archive all N changes" — archive everything, including incomplete ones (with warnings)
     - "Archive only M ready changes (skip incomplete)" — only shown if some changes have warnings
     - "Cancel — stop entire operation" — abort without any file changes

   If there are incomplete changes, make clear they'll be archived with warnings.

   **Cancel behavior**: If user chooses "Cancel", stop the entire bulk archive process immediately. Do NOT sync any specs, do NOT move any directories, and inform the user that no changes were made.

   **CRITICAL: Do NOT proceed without explicit user confirmation.**

8. **Execute archive for each confirmed change**

   Process changes in the determined order (respecting conflict resolution):

   a. **Sync specs** if delta specs exist:
      - Use the openspec-sync-specs approach (agent-driven intelligent merge)
      - For conflicts, apply in resolved order
      - Use the confirmed merge destinations from Step 4 (if a capability was redirected, sync to the redirected target)
      - Track if sync was done

   b. **Perform the archive**:
      ```bash
      mkdir -p openspec/changes/archive
      mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
      ```

   c. **Track outcome** for each change:
      - Success: archived successfully
      - Failed: error during archive (record error)
      - Skipped: user chose not to archive (if applicable)

9. **Display summary**

   Show final results:

   ```
   ## Bulk Archive Complete

   Archived 3 changes:
   - schema-management-cli -> archive/2026-01-19-schema-management-cli/
   - project-config -> archive/2026-01-19-project-config/
   - add-oauth -> archive/2026-01-19-add-oauth/

   Skipped 1 change:
   - add-verify-skill (user chose not to archive incomplete)

   Spec sync summary:
   - 4 delta specs synced to main specs
     - 3 merged into existing specs (🔄)
     - 1 created as new spec (🆕)
   - 1 conflict resolved (auth: applied both in chronological order)
   ```

   If any failures:
   ```
   Failed 1 change:
   - some-change: Archive directory already exists
   ```

**Conflict Resolution Examples**

Example 1: Only one implemented
```
Conflict: specs/auth/spec.md touched by [add-oauth, add-jwt]

Checking add-oauth:
- Delta adds "OAuth Provider Integration" requirement
- Searching codebase... found src/auth/oauth.ts implementing OAuth flow

Checking add-jwt:
- Delta adds "JWT Token Handling" requirement
- Searching codebase... no JWT implementation found

Resolution: Only add-oauth is implemented. Will sync add-oauth specs only.
```

Example 2: Both implemented
```
Conflict: specs/api/spec.md touched by [add-rest-api, add-graphql]

Checking add-rest-api (created 2026-01-10):
- Delta adds "REST Endpoints" requirement
- Searching codebase... found src/api/rest.ts

Checking add-graphql (created 2026-01-15):
- Delta adds "GraphQL Schema" requirement
- Searching codebase... found src/api/graphql.ts

Resolution: Both implemented. Will apply add-rest-api specs first,
then add-graphql specs (chronological order, newer takes precedence).
```

Example 3: Possible duplicate detection
```
Archive Target Assessment:
- Change "update-data-model" has delta spec "data-model"
- Main spec "data-model" already exists (25.96 KB)

→ Classified as: 🔄 Merge into existing data-model spec

- Change "add-feature-v2" has delta spec "feature-v2"
- Main spec "feature" exists but "feature-v2" does not

→ Classified as: ⚠️ Possible duplicate of feature
→ Ask user: Merge into feature, or create feature-v2 as new?
```

**Output On Success**

```
## Bulk Archive Complete

Archived N changes:
- <change-1> -> archive/YYYY-MM-DD-<change-1>/
- <change-2> -> archive/YYYY-MM-DD-<change-2>/

Spec sync summary:
- N delta specs synced to main specs
- M merged into existing specs, K created as new
- No conflicts (or: J conflicts resolved)
```

**Output On Partial Success**

```
## Bulk Archive Complete (partial)

Archived N changes:
- <change-1> -> archive/YYYY-MM-DD-<change-1>/

Skipped M changes:
- <change-2> (user chose not to archive incomplete)

Failed K changes:
- <change-3>: Archive directory already exists
```

**Output When No Changes**

```
## No Changes to Archive

No active changes found. Create a new change to get started.
```

**Guardrails**
- Allow any number of changes (1+ is fine, 2+ is the typical use case)
- Always prompt for selection, never auto-select
- **CRITICAL: Always run archive target assessment (Step 4) before any sync or conflict resolution**
- **CRITICAL: Always get explicit user confirmation before performing archives (Step 7)**
- **NEVER auto-merge delta specs into a main spec without user seeing and confirming the merge destination**
- When a delta spec capability name is similar but not identical to an existing main spec, flag it as a possible duplicate and ask the user
- Detect spec conflicts early and resolve by checking codebase
- When both changes are implemented, apply specs in chronological order
- Skip spec sync only when implementation is missing (warn user)
- Show clear per-change status before confirming
- Use single confirmation for entire batch
- Track and report all outcomes (success/skip/fail)
- Preserve .openspec.yaml when moving to archive
- Archive directory target uses current date: YYYY-MM-DD-<name>
- If archive target exists, fail that change but continue with others
