# tree-sitter-tcl

A tree-sitter grammar for TCL.

## Status

- [x] lexing
  - [x] substitutions
    - [x] dollar substitutions: tested
    - [x] bracket subsitutions: tested
    - [x] escape characters: parsed, but not tested
  - [x] array references
  - [x] double-quote strings
- [x] parsing: complete. Everything's a word.
  - [x] commands
  <!--
    - [ ] math expressions
    - [ ] boolean expressions
    - [ ] lists, including argument lists: not parsed since deciding whether to interpret a word as a list or a tcl script is difficult.
  -->
- [ ] highlighting: WIP
- [ ] locals: WIP
- [ ] tagging: WIP

## Contributing

Please do! Until 2023, I'll try to review PRs with comprehensive comments and tests.

To contribute a feature or bugfix,

- create an issue to get an idea of whether this repo's the right place for the work
- fork &/ branch off of `main`
- write [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)
- make sure either the tests are passing or no new tests are failing prior to submitting a PR

I'd vaguely like to write a TCL language server, but I'm not sure I'll get to it in 2022. I ironically don't use tcl myself.

## Design notes

This grammar speculatively parses all words rather than hardcoding the core language constructs and deriving which words should be recursively parsed. This trades off faster parsing for more difficult semantic analysis and a cruder grammar API for queries and syntax highlighting.
