#!/bin/sh
# Claude Code PreToolUse hook: blocks any tool call whose target is a .env
# file, so secrets are never read, grepped, edited or piped through a shell
# command. The committed templates (.env.example, .env.<anything>.example)
# stay allowed.
#
# Only the fields that name an access target are inspected (file_path,
# command, path, glob, notebook_path): mentioning ".env" inside edited text
# (documentation, this very file) is not an access and must not block.
# Without node the whole input is scanned instead: over-broad, never under.

input=$(cat)

if command -v node >/dev/null 2>&1; then
  fields=$(printf '%s' "$input" | node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      let toolInput = {};
      try {
        toolInput = JSON.parse(raw).tool_input ?? {};
      } catch {
        // Unparseable input falls back to the raw text: fail closed.
        process.stdout.write(raw);
        return;
      }
      const targets = [
        toolInput.file_path,
        toolInput.notebook_path,
        toolInput.command,
        toolInput.path,
        toolInput.glob,
      ].filter((value) => typeof value === "string");
      process.stdout.write(targets.join("\n"));
    });
  ')
else
  fields=$input
fi

# A .env token starts a filename: preceded by start-of-line or a non-word
# character, so process.env and import.meta.env never match. The second
# grep strips that preceding character, the third drops the allowed
# *.example templates.
offending=$(printf '%s' "$fields" |
  grep -oE '(^|[^A-Za-z0-9_])\.env[A-Za-z0-9_.-]*' |
  grep -oE '\.env[A-Za-z0-9_.-]*' |
  grep -vE '\.example$' |
  sort -u)

if [ -n "$offending" ]; then
  {
    echo "Blocked: this tool call targets an env file: $(printf '%s' "$offending" | tr '\n' ' ')"
    echo "Env files hold secrets and are never read, edited or touched by a tool call."
    echo "Use .env.example for variable names and structure; if a real value is"
    echo "needed, ask the user to provide it or to run the command themselves."
  } >&2
  exit 2
fi

exit 0
