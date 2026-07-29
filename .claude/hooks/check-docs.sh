#!/bin/sh
# Claude Code Stop hook: refuses to end a task while README.md's generated blocks are
# stale, so documentation is updated by the same task that made it necessary.

input=$(cat)

# Second pass after a previous block: let the turn end rather than loop forever.
case "$input" in
*'"stop_hook_active":true'* | *'"stop_hook_active": true'*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# A missing toolchain (fresh clone, no install) is not a documentation problem.
command -v node >/dev/null 2>&1 || exit 0
[ -d node_modules ] || exit 0

if ! output=$(node scripts/sync-docs.mjs --check 2>&1); then
  {
    echo "Documentation freshness check failed:"
    echo "$output"
    echo ""
    echo "Run 'pnpm sync:docs' to regenerate README.md's generated blocks (add any missing"
    echo "one-line descriptions in scripts/sync-docs.mjs), and review the prose sections of"
    echo "the READMEs your changes touch (root and per-workspace) before finishing."
  } >&2
  exit 2
fi

exit 0
