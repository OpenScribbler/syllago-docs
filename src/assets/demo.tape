# VHS tape script for syllago hero demo GIF
#
# Recording setup:
#   1. Pre-seed /tmp/syll-demo/ with provider content:
#      - package.json (empty object — project marker)
#      - .claude/skills/code-review.md (Claude Code skill)
#      - .claude/skills/research.md (Claude Code skill)
#      - .copilot/agents/api-agent.md (Copilot CLI agent)
#
#   2. Create BASH_ENV setup script (/tmp/syll-demo-setup.sh):
#      syl() { command syl "$@" 2>/dev/null; }
#      export -f syl
#      export PS1='$ '
#
#   3. Record from the demo directory:
#      mkdir -p /tmp/syll-home-fresh
#      HOME=/tmp/syll-home-fresh BASH_ENV=/tmp/syll-demo-setup.sh vhs demo.tape
#
# The BASH_ENV trick silently sets up a syl wrapper that suppresses stderr
# warnings, avoiding the need for VHS Hide/Show (which is broken in v0.10.0).

Output hero-demo.gif
Set Theme "Catppuccin Mocha"
Set FontSize 17
Set Width 960
Set Height 600
Set Padding 20
Set TypingSpeed 40ms
Set Shell bash

# Add skills from Claude Code
Sleep 500ms
Type "syl add skills --from claude-code"
Enter
Sleep 2s

# Install those skills to Gemini CLI
Type "syl install --to gemini-cli --type skills"
Enter
Sleep 2500ms

# Add agents from Copilot CLI
Type "syl add agents --from copilot-cli"
Enter
Sleep 2s

# Install agents to Claude Code
Type "syl install --to claude-code --type agents"
Enter
Sleep 3s
