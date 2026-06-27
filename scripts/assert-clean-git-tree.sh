#!/usr/bin/env bash
# Fails when the working tree has uncommitted or untracked changes.
assert_clean_git_tree() {
  if ! command -v git >/dev/null 2>&1; then
    echo "Error: git is required for deploy." >&2
    return 1
  fi

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Error: deploy must run inside a git repository." >&2
    return 1
  fi

  local dirty
  dirty="$(git status --porcelain)"
  if [[ -n "$dirty" ]]; then
    echo "Error: working tree is not clean. Commit or stash changes before deploy." >&2
    echo "$dirty" >&2
    return 1
  fi

  return 0
}
