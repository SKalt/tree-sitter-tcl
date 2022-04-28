# tree-sitter-tcl

A tree-sitter grammar for TCL.

## Status

- [ ] lexing
  - [x] substitutions
    - [x] dollar substitutions: tested
    - [x] bracket subsitutions: tested
    - [ ] escape characters: parsed, but missing more-complicated escapes (e.g. hex)
  - [x] array references
  - [x] double-quote strings
- [x] parsing: complete. Everything's a word.
  - [x] commands
  <!-- - [ ] lists, including argument lists: not parsed since deciding whether to interpret a word as a list or a tcl script is difficult. -->
- [ ] highlighting
- [ ] locals
- [ ] tagging

## Design notes

- This grammar speculatively parses all words rather than hardcoding the core language constructs and deriving which words should be recursively parsed. This trades off faster parsing for more difficult semantic analysis and a cruder grammar API for queries and syntax highlighting.
