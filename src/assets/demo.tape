# VHS tape script for syllago hero demo GIF
#
# Before recording:
#   1. Remove the obra/superpowers registry if already added:
#      syllago registry remove obra/superpowers 2>/dev/null
#
#   2. Create BASH_ENV setup script (/tmp/syll-demo-setup.sh):
#      #!/bin/bash
#      syl() { echo n | command syl "$@" 2>/dev/null; }
#      export -f syl
#      export PS1='$ '
#
#   3. Record:
#      BASH_ENV=/tmp/syll-demo-setup.sh vhs src/assets/demo.tape
#
# The BASH_ENV trick:
#   - Wraps `syl` to suppress stderr warnings and auto-answer sandbox prompts
#   - Sets a clean prompt
#   - Avoids needing VHS Hide/Show (broken in v0.10.0)

Output public/hero-demo.gif
Set Theme "Catppuccin Mocha"
Set FontSize 17
Set Width 960
Set Height 600
Set Padding 20
Set TypingSpeed 40ms
Set Shell bash

# ── Scene 1: Add a community registry ──
Sleep 500ms
Type "syl registry add https://github.com/obra/superpowers"
Enter
Sleep 4s

# ── Scene 2: Browse what's available ──
Type "syl registry items obra/superpowers"
Enter
Sleep 3s

# ── Scene 3: Install registry skills to Claude Code ──
Type "syl sync-and-export --to claude-code --source registry --type skills"
Enter
Sleep 3s

# ── Scene 4: Convert a library agent to Codex TOML format ──
Type "syl convert api-agent --to codex"
Enter
Sleep 3s

# Hold final frame
Sleep 2s
