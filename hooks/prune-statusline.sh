#!/usr/bin/env bash
flag="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.prune-active"
[ -f "$flag" ] || exit 0

mode=$(head -n1 "$flag" | tr -d '[:space:]')

if [ -z "$mode" ] || [ "$mode" = "full" ]; then
    printf '\033[38;5;108m[PRUNE]\033[0m'
else
    printf '\033[38;5;108m[PRUNE:%s]\033[0m' "$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')"
fi
