# tree-sitter-tcl

A draft tree-sitter grammar for TCL

Design notes:

- I'm hardcoding the core language constructs and deriving which words should be recursively parsed rather than giving recursive parsing high precedence and speculatively parsing all words. I'm not sure what performance impact, if any, this would have. Rather, I'm doing this to create a neater grammar API for queries and syntax highlighting.

<!-- - I'm going to co-locate a language server here, treating this as a monorepo -->
