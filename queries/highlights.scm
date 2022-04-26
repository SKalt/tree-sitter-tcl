; Literals

[
  "$"
  "::"

;  "-"  ; unary
;  "+"  ; ^
;  "~"  ; ^
;  "!"  ; ^

;  "**" ;

;  "*"
;  "/"

;  "<<"
;  ">>"

;  "<"
;  ">"
;  "<="
;  ">="
;  "gt"
;  "lt"
;  "le"
;  "ge"
;  "in"
;  "ni"

;  "&"
;  "^"
;  "|"

;  "&&"
;  "||"

;  "?"
;  ":"
] @operator

[
  (integer)
  (float)
] @number

; (command (bare_word) @keyword
;   (#matches? @keyword "^(set|proc|return)$")
; )
(command (bare_word) @function)

(quote_word) @string

(bracket_sub
  "[" @punctuation.special
  "]" @punctuation.special
) @embedded

(comment) @comment
