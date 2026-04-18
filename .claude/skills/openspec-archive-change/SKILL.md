---
name: openspec-archive-change
description: Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.1"
  generatedBy: "1.2.0"
---

<!-- AUTO-GENERATED full copy from .aikp/skills/openspec-archive-change/SKILL.md — DO NOT EDIT -->
<!-- To modify, edit the source file and run: npm run sync-aikit -->

Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `artifacts`: List of artifacts with their status (`done` or other)

   **If any artifacts are not `done`:**
   - Display warning listing incomplete artifacts
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically `tasks.md`) to check for incomplete tasks.

   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Archive target assessment — identify spec merge destinations**

   **IMPORTANT**: This step MUST be completed before any spec sync or archive action.

   a. **Scan the change's delta specs** at `openspec/changes/<name>/specs/`:
      - List each `<capability>` directory name

   b. **Scan the main spec library** at `openspec/specs/`:
      - List all existing capability directory names

   c. **Scan archived changes** at `openspec/changes/archive/`:
      - For each archived change, note its capability names (under `specs/`)

   d. **Classify each delta spec capability**:
      - 🔄 **Merge into existing** — capability name matches an existing main spec
      - 🆕 **Create new** — capability name not found in main specs
      - ⚠️ **Possible duplicate** — similar name to an existing spec; ask user whether to merge or create new

   e. **Present the assessment to user** and use **AskUserQuestion tool** to confirm:
      - Show each capability with its classification and intended action
      - Options: "Proceed", "Merge <X> into <Y>" (redirect), or "Cancel — stop entire operation"
      - If ⚠️ possible duplicate detected, explicitly ask whether to merge into existing or create new

   **Cancel behavior**: If user chooses "Cancel" at this step, stop the entire archive process. No specs will be synced and no changes will be archived. Inform the user that no changes were made.

   f. **Record user's confirmed merge plan** for use in Step 5.

   **If no delta specs exist**: Skip this step entirely (no spec sync will happen).

5. **Assess delta spec sync state (using confirmed merge plan)**

   Check for delta specs at `openspec/changes/<name>/specs/`. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Using the merge plan confirmed in Step 4, compare each delta spec with its **confirmed target** main spec at `openspec/specs/<capability>/spec.md`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   If user chooses sync, use Task tool (subagent_type: "general-purpose", prompt: "Use Skill tool to invoke openspec-sync-specs for change '<name>'. Delta spec analysis: <include the analyzed delta spec summary>"). Proceed to archive regardless of choice.

6. **Final confirmation and perform the archive**

   **Before performing any file operations**, show a final summary and use **AskUserQuestion tool** to get explicit confirmation:

   ```
   ## Ready to Archive: <change-name>

   - Schema: <schema-name>
   - Artifacts: <completion status>
   - Tasks: <completion status>
   - Specs: <sync status / merge plan summary>
   - Archive to: openspec/changes/archive/YYYY-MM-DD-<name>/

   Proceed with archive?
   1. "Yes, archive now"
   2. "Cancel — stop entire operation"
   ```

   **Cancel behavior**: If user chooses "Cancel", stop the entire archive process immediately. Do NOT move any directories, and inform the user that no changes were made.

   **Only after user confirms "Yes"**, perform the archive:

   Create the archive directory if it doesn't exist:
   ```bash
   mkdir -p openspec/changes/archive
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move the change directory to archive

   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

7. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Whether specs were synced (if applicable), including merge destinations
   - Note about any warnings (incomplete artifacts/tasks)

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs (or "No delta specs" or "Sync skipped")
  - user-auth: 🔄 Merged into existing spec (added 2 requirements)
  - notifications: 🆕 Created new spec

All artifacts complete. All tasks complete.
```

**Guardrails**
- Always prompt for change selection if not provided
- Use artifact graph (openspec status --json) for completion checking
- Don't block archive on warnings - just inform and confirm
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use openspec-sync-specs approach (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
- **CRITICAL: Always run archive target assessment (Step 4) before any sync or archive action**
- **CRITICAL: Always get explicit user confirmation before performing the archive (Step 6)**
- **NEVER auto-merge delta specs into a main spec without user seeing and confirming the merge destination**
- When a delta spec capability name is similar but not identical to an existing main spec, flag it as a possible duplicate and ask the user
