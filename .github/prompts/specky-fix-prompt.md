# Copilot Prompt: Fix Feature Number Auto-Detection in Specky

---
**Model:** `claude-sonnet-4-6`
**Chat mode:** Agent mode
**Extended thinking:** No
**Rationale:** Approved spec, clear scope, ≤10 files, iterative implementation with test feedback loop. Opus + extended thinking would add cost without benefit here.

---

## Context

You are working on the **Specky** repository (`paulasilvatech/specky`).

The `.specs/` directory currently contains two existing specs:
- `.specs/001-specky-mcp-server/` — COMPLETE (all 56 tasks verified)
- `.specs/002-enterprise-ready/` — IN PROGRESS (implementation pending)

**The bug:** `sdd_init` does not scan `.specs/` to detect the next available
feature number. It likely defaults to `001`, which would collide with the
existing spec. Any developer running `sdd_init` today would overwrite or
conflict with the existing specs.

**The fix requires changes in 5 locations:**
1. `src/services/file-manager.ts` — add `getNextFeatureNumber()` method
2. `src/tools/pipeline.ts` — update `sdd_init` handler to use it
3. `.specs/002-enterprise-ready/SPECIFICATION.md` — add REQ-INTG-005
4. `.specs/002-enterprise-ready/TASKS.md` — add T-069
5. `.specs/002-enterprise-ready/ANALYSIS.md` — update INTG coverage 4→5
6. `.specs/002-enterprise-ready/CHECKLIST.md` — add CHK-043
7. `.specs/001-specky-mcp-server/CONSTITUTION.md` — fix example directory listing

---

## STEP 1 — Read the current source before touching anything

Read these files first so you understand the current implementation:

```
src/services/file-manager.ts
src/tools/pipeline.ts
src/schemas/pipeline.ts (or wherever sdd_init input schema is defined)
.specs/002-enterprise-ready/SPECIFICATION.md
.specs/002-enterprise-ready/TASKS.md
.specs/002-enterprise-ready/ANALYSIS.md
.specs/002-enterprise-ready/CHECKLIST.md
.specs/001-specky-mcp-server/CONSTITUTION.md
```

Do NOT make any changes until you have read all of these files.

---

## STEP 2 — Fix `src/services/file-manager.ts`

Add the following method to the `FileManager` class. Place it after the
`listFeatures()` method (or the nearest logical grouping of read methods).

The method must:
- Scan `.specs/` for directories matching pattern `^\d{3}-`
- Find the highest existing number
- Return `(maxNum + 1)` zero-padded to 3 digits
- Return `'001'` if `.specs/` does not exist or contains no numbered dirs

```typescript
/**
 * Scans .specs/ and returns the next available zero-padded feature number.
 * If .specs/ is empty or does not exist, returns '001'.
 * If 001 and 002 exist, returns '003'. Never collides with existing dirs.
 */
async getNextFeatureNumber(): Promise<string> {
  const specsDir = path.join(this.workspaceRoot, DEFAULT_SPEC_DIR);

  try {
    const entries = await fs.readdir(specsDir);
    const numbered = entries.filter((e) => /^\d{3}-/.test(e));

    if (numbered.length === 0) {
      return '001';
    }

    const maxNum = numbered.reduce((max, dir) => {
      const num = parseInt(dir.slice(0, 3), 10);
      return num > max ? num : max;
    }, 0);

    return String(maxNum + 1).padStart(3, '0');
  } catch {
    // .specs/ does not exist yet — first feature will be 001
    return '001';
  }
}
```

**Important:** Use whatever import aliases and constants are already in
`file-manager.ts`. If `DEFAULT_SPEC_DIR` is imported from `constants.ts`,
use that. If `fs` is `import * as fs from 'fs/promises'`, use that. Match
the existing style exactly.

---

## STEP 3 — Fix `src/tools/pipeline.ts` (sdd_init handler)

Locate the `sdd_init` tool handler. Find where the feature directory name is
constructed — it will look something like:

```typescript
const featureDir = `${input.feature_number}-${input.feature_name}`;
// or
const featureDir = `${featureNumber}-${featureName}`;
```

Replace the hardcoded or input-driven number with a call to
`fileManager.getNextFeatureNumber()`:

```typescript
// BEFORE (broken — collides with existing specs)
const featureDir = `${input.feature_number}-${input.feature_name}`;

// AFTER (correct — always picks next available number)
const nextNum = await fileManager.getNextFeatureNumber();
const featureDir = `${nextNum}-${slugify(input.feature_name)}`;
// Use whatever slug/kebab helper is already in the codebase.
// If there is no helper, use: input.feature_name.toLowerCase().replace(/\s+/g, '-')
```

If `feature_number` is currently a **required field** in the Zod input
schema, change it to **optional** with a note that it is now auto-detected.
Preserve backward compatibility: if a caller explicitly passes
`feature_number`, use that value; otherwise auto-detect.

The updated schema should look like:

```typescript
const sddInitSchema = z.object({
  feature_name: z.string().min(1).describe('Feature name in kebab-case or plain text'),
  feature_number: z.string().optional().describe(
    'Optional 3-digit number (e.g. "003"). Auto-detected from .specs/ if omitted.'
  ),
  // ... rest of existing fields unchanged
}).strict();
```

And the handler logic:

```typescript
const nextNum = input.feature_number
  ?? await fileManager.getNextFeatureNumber();
const featureDir = `${nextNum}-${slugify(input.feature_name)}`;
```

---

## STEP 4 — Update `.specs/002-enterprise-ready/SPECIFICATION.md`

Open the file. Find **Section 4: Integration Polish (REQ-INTG)**. It
currently ends at `REQ-INTG-004`. Append the following new requirement
**after** `REQ-INTG-004`, before the `## 5. Enterprise Trust Signals` heading.

Do NOT change any existing requirement. Only insert the new one.

```markdown
### REQ-INTG-005: Feature Number Auto-Detection (Ubiquitous)

The `sdd_init` tool shall scan the `.specs/` directory and automatically
assign the next available feature number instead of defaulting to `001`.

**Acceptance Criteria:**
- When `.specs/` is empty or does not exist, `sdd_init` assigns `001`
- When `.specs/001-*` exists, `sdd_init` assigns `002`
- When `.specs/001-*` and `.specs/002-*` exist, `sdd_init` assigns `003`
- The feature number is always zero-padded to 3 digits
- If a caller explicitly passes `feature_number`, that value is used as-is
- `sdd_init` never overwrites an existing feature directory without an
  explicit `force: true` parameter

**Traces to:** SC-004 (zero-config experience), SC-010 (cross-IDE compatibility)
```

Also update the **Acceptance Criteria Summary** table at the bottom of the
file. Change the INTG row from:

```
| INTG (Integration) | 4 | Manual testing + cross-IDE verification |
```

to:

```
| INTG (Integration) | 5 | Manual testing + cross-IDE verification |
```

And update the total from `31` to `32`.

Also update the YAML frontmatter:
- `requirement_count`: change from `32` to `33`
- `version`: bump from `1.0.0` to `1.1.0`

---

## STEP 5 — Update `.specs/002-enterprise-ready/TASKS.md`

Open the file. Find **Phase 4: Integration Polish**. It currently ends at
`T-068`. Add `T-069` as the last row in that phase's table:

```markdown
| T-069 | Fix `sdd_init`: implement `getNextFeatureNumber()` in `FileManager`, scan `.specs/` for max `NNN` prefix, auto-assign next number. Make `feature_number` optional in Zod schema with auto-detect fallback. | S | T-060 | not-started |
```

Also update the **Summary** table at the bottom:
- Phase 4 tasks: change from `9` to `10`
- Total tasks: change from `56` to `57`

Also update the YAML frontmatter:
- `task_count` (if present): change from `56` to `57`

---

## STEP 6 — Update `.specs/002-enterprise-ready/ANALYSIS.md`

Open the file. Find **Section 1.4: Integration Polish (REQ-INTG)**.

Add the new row to the traceability table:

```markdown
| REQ-INTG-005: Feature number auto-detection | §1 Architecture Overview, FileManager | T-069 | Covered |
```

Update the footer line:

```
**INTG coverage: 4/4 (100%)**
```

to:

```
**INTG coverage: 5/5 (100%)**
```

Find **Section 2: Coverage Report**. Update the INTG row:

```
| INTG | 4 | 4 | 4 | **100%** |
```

to:

```
| INTG | 5 | 5 | 5 | **100%** |
```

Update the **Total** row:
- Requirements: `32` → `33`
- Designed: `32` → `33`
- Tasks Mapped: `32` → `33`

Update the YAML frontmatter:
- `requirement_count`: `32` → `33`
- `task_count`: `56` → `57`
- `version`: `1.0.0` → `1.1.0`

---

## STEP 7 — Update `.specs/002-enterprise-ready/CHECKLIST.md`

Open the file. Find **Phase 4: Integration Polish**. It currently ends at
`CHK-042`. Add `CHK-043` as the next row:

```markdown
| CHK-043 | `sdd_init` with existing `001` and `002` dirs creates `003`, not `001` | Yes | ⬜ Pending | — |
```

Update the **Summary** section:
- Total: change from `30` to `31`

Update the YAML frontmatter:
- `version`: `1.0.0` → `1.1.0`

---

## STEP 8 — Update `.specs/001-specky-mcp-server/CONSTITUTION.md`

Open the file. Find **Section 2.4: Feature Directory Naming**. The current
example shows generic user-facing directories:

```
.specs/
├── 001-user-authentication/
│   ├── CONSTITUTION.md
│   ...
├── 002-payment-integration/
│   └── ...
└── .sdd-state.json
```

Replace with the actual directories in this repository:

```
.specs/
├── 001-specky-mcp-server/   ← Specky core MCP server (complete ✅)
│   ├── CONSTITUTION.md
│   ├── SPECIFICATION.md
│   ├── DESIGN.md
│   ├── TASKS.md
│   ├── ANALYSIS.md
│   ├── CHECKLIST.md
│   └── VERIFICATION.md
├── 002-enterprise-ready/    ← Specky v3.0 enterprise features (in progress 🔄)
│   └── ...
├── 003-next-feature/        ← Next user feature created by sdd_init
│   └── ...
└── .sdd-state.json
```

Also update the YAML frontmatter:
- `version`: bump from `1.1.0` to `1.2.0`
- `last_amended`: update to today's date
- `amendment_count`: increment by 1

Add a new row to the **Amendment Log** table in Section 5.2:

```markdown
| 2 | 2026-04-12 | Paula Silva | Fix feature directory example to reflect actual repo structure; clarify that 001 and 002 are Specky's own specs | Art. 2.4 |
```

---

## STEP 9 — Verify the fix works

After making all source changes, verify:

1. Run `npm run build` — must compile with zero errors
2. Run `npm test` — all existing tests must still pass
3. Add a unit test to the `FileManager` test file (or create
   `src/services/__tests__/file-manager.test.ts` if it does not exist yet)
   that covers these cases:

```typescript
describe('FileManager.getNextFeatureNumber()', () => {
  it('returns 001 when .specs/ does not exist', async () => { ... });
  it('returns 001 when .specs/ is empty', async () => { ... });
  it('returns 003 when 001 and 002 already exist', async () => { ... });
  it('returns 010 when 009 is the highest existing number', async () => { ... });
  it('ignores non-numbered directories like .sdd-state.json', async () => { ... });
});
```

Use the testing patterns already present in the existing test files.

---

## STEP 10 — Final checklist before committing

Verify each item before creating a commit or PR:

- [ ] `npm run build` passes with zero errors
- [ ] `npm test` passes with zero failures
- [ ] `src/services/file-manager.ts` has `getNextFeatureNumber()` method
- [ ] `sdd_init` handler calls `getNextFeatureNumber()` when no number given
- [ ] `feature_number` is optional (not required) in the init Zod schema
- [ ] `.specs/002-enterprise-ready/SPECIFICATION.md` has REQ-INTG-005
- [ ] `.specs/002-enterprise-ready/SPECIFICATION.md` total count updated to 33
- [ ] `.specs/002-enterprise-ready/TASKS.md` has T-069
- [ ] `.specs/002-enterprise-ready/TASKS.md` total count updated to 57
- [ ] `.specs/002-enterprise-ready/ANALYSIS.md` INTG row shows 5/5
- [ ] `.specs/002-enterprise-ready/ANALYSIS.md` total requirements updated to 33
- [ ] `.specs/002-enterprise-ready/CHECKLIST.md` has CHK-043
- [ ] `.specs/002-enterprise-ready/CHECKLIST.md` total updated to 31
- [ ] `.specs/001-specky-mcp-server/CONSTITUTION.md` section 2.4 shows real dirs
- [ ] All amended frontmatters have version bumped and date updated
- [ ] No existing requirements, tasks, or checklist items were modified or deleted

---

## Commit message (suggested)

```
fix(sdd_init): auto-detect next feature number from .specs/ directory

- Add FileManager.getNextFeatureNumber() that scans .specs/ for highest NNN prefix
- Make feature_number optional in sdd_init Zod schema with auto-detect fallback
- Prevents collision with existing 001-specky-mcp-server and 002-enterprise-ready
- Add REQ-INTG-005 to 002-enterprise-ready SPECIFICATION.md
- Add T-069 to 002-enterprise-ready TASKS.md (Phase 4)
- Update ANALYSIS.md INTG coverage from 4/4 to 5/5
- Add CHK-043 to CHECKLIST.md Phase 4
- Fix CONSTITUTION.md section 2.4 to show actual repo spec directories

Fixes: sdd_init would default to 001, colliding with existing Specky specs
```
