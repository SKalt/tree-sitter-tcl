# tree-sitter-tcl

A draft tree-sitter grammar for TCL

Design notes:

- I'm giving recursive parsing high precedence and speculatively parsing all words rather than hardcoding the core language constructs and deriving which words should be recursively parsed. This trades off faster parsing for more difficult semantic analysis and a cruder grammar API for queries and syntax highlighting.

<!-- - I'm going to co-locate a language server here, treating this as a monorepo -->
