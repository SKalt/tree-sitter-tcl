
(command
  (bare_word) @keyword
    (#matches? @keyword "^proc$")
  (word (bare_word)) 
  (word) ; arg definitions-- can be 
  (word
    (tcl_word
      (comment)* @doc
        (#strip! @doc "^#\\s?")
      
      )) ; function body
) @local.scope

; TODO: `namespace eval`
