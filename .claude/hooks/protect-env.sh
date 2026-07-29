#!/bin/sh
# Claude Code PreToolUse hook: blocks any tool call whose target names a
# .env file, so secrets are not read, grepped, edited or piped through a
# shell command by accident. The committed templates (.env.example,
# .env.<anything>.example) and the dummy fixture
# supabase/functions/.env.test stay allowed.
#
# This is a guardrail against accidental access, not a sandbox: a command
# that resolves the name at run time is out of its reach. Only the fields
# that name an access target are inspected (file_path, command, path, glob,
# notebook_path, and Glob's pattern): mentioning ".env" inside edited text
# (documentation, this very file) is not an access and must not block.
# Without node the whole input is scanned instead: over-broad, never under.

input=$(cat)

if command -v node >/dev/null 2>&1; then
  fields=$(printf '%s' "$input" | node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      let parsed = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Unparseable input falls back to the raw text: fail closed.
        process.stdout.write(raw);
        return;
      }
      const toolInput = parsed.tool_input ?? {};
      const targets = [
        toolInput.file_path,
        toolInput.notebook_path,
        toolInput.command,
        toolInput.path,
        toolInput.glob,
      ];
      // Glob names its file pattern "pattern"; Grep uses "pattern" for the
      // searched text, which may legitimately mention env files.
      if (parsed.tool_name === "Glob") targets.push(toolInput.pattern);
      const joined = targets
        .filter((value) => typeof value === "string")
        .join("\n");
      // The tracked fixture holds dummy values and is edited like code.
      process.stdout.write(
        joined.replace(
          /supabase\/functions\/\.env\.test(?![A-Za-z0-9_.-])/g,
          "",
        ),
      );
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
