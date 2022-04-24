// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c
// see https://tcl.tk/about/language.html

import {
  choice,
  field,
  optional,
  prec,
  repeat,
  seq,
  token,
  repeat1,
} from "ts-dsl-tree-sitter/src/functional";

const enum precedence { // least -> greatest
  min = 1,
  word,
  bare_word,
  other_word,
  integer,
  float,
  array_ref,
  quote,
  tcl_word,
  max,
}

export const _ = () =>
  prec.right(repeat1(choice(/[\r\t ]+/, _escaped_whitespace)));
export const _newline = () => /\n+/;

export const _escaped_newline = () => /\\\n/; // these take precedence over newlines

export const _escaped_whitespace = () =>
  prec.right(repeat1(choice(_escaped_newline, /\\\r/, /\\\t/, /\\ /)));

export const _escaped_char = () => /\\[^\s]/;

export const escape = () => choice(_escaped_char, _escaped_whitespace);

// https://tcl.tk/about/language.html ----------------------------------------------------
// Tcl scripts are made up of commands separated by newlines or semicolons.
export const _command_separator = () =>
  choice(";", seq(optional(comment), _newline));
export const tcl_script = () =>
  prec.right(
    seq(
      repeat(choice(_newline, comment, _)),
      command,
      optional(_),
      repeat(
        seq(_command_separator, optional(_), optional(command), optional(_)),
      ),
    ),
    precedence.min,
  );
export const integer = () => token(prec(/\d+/, precedence.integer));
export const float = () =>
  token(prec(choice(/\d+\.\d*/, /\.\d+/), precedence.float));

export const command = () =>
  prec.right(seq(bare_word, repeat(seq(_, optional(word)))));

export const dollar_sub = () =>
  seq("$", choice(bare_word, brace_word, array_ref));

// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L1457
export const array_ref = () =>
  prec(
    seq(field("array", bare_word), "(", field("index", optional(word)), ")"),
    precedence.array_ref,
  );
export const bracket_sub = () => seq("[", optional(tcl_script), "]");
// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L565, TclIsBareword
/** function name/identifier/bare variable name  */
export const bare_word = () =>
  token(prec(/[a-zA-Z0-9_]+/, precedence.bare_word));
export const quote_word = () =>
  prec.left(
    seq(
      '"',
      repeat(choice(_escaped_char, dollar_sub, bracket_sub, /[^\["$]+/)),
      '"',
    ),
    precedence.quote,
  );

// TODO: parse backslash escapes; see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L782

// see https://github.com/tcltk/tcl/blob/main/library/word.tcl
// see https://github.com/tcltk/tcl/blob/main/generic/regc_lex.c
export const comment = () => /\s*#[^\n]*/;
export const other_word = () =>
  seq(
    choice(bare_word, _escaped_char, /[^a-zA-Z0-9_\s;\(\)\[\]\{\}\$"]+/),
    repeat(choice(/[^\s;$\\]+/, _escaped_char, dollar_sub, bracket_sub)),
  );
export const ns_ref = () =>
  seq(
    optional(bare_word),
    repeat1(seq(token(prec("::", precedence.max)), bare_word)),
  );
export const word = () =>
  prec.right(
    choice(
      quote_word,
      bracket_sub,
      brace_word,
      tcl_word,
      array_ref,
      repeat1(dollar_sub),
      ns_ref,
      bare_word,
      float,
      integer,
      other_word,
    ),
    precedence.word,
  );

export const brace_word = () => seq("{", /[^\}]*/, "}");
export const tcl_word = () =>
  prec.dynamic(seq("{", optional(tcl_script), "}"), precedence.tcl_word);
