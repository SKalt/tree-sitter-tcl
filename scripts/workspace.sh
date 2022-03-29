#!/usr/bin/env bash
# also compatible with zsh

old_path="$PATH"
repo_root="$(git rev-parse --show-toplevel)"
export PATH="$repo_root/node_modules/.bin:$PATH"

function deactivate(){
    export PATH="$old_path"
}

