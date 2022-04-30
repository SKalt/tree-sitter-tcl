(dollar_sub
  [
    (bare_word)
    (brace_word)
    (array_ref)
  ] @local.reference
)

(command
  (bare_word) @cmd
    (#matches? @cmd "^set$")
    (word) @local.definition
    (word)
)

(command
  (bare_word) @cmd
    (#matches? @cmd "^set$")
  (word) @local.reference
)

(command
  (bare_word) @keyword
    (#matches? @keyword "^proc$")
  (word (bare_word)) 
  (word) ; arg definitions
  (word) ; function body
) @local.scope
