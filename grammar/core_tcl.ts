// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c
// see https://tcl.tk/about/language.html

import {
  choice,
  optional,
  prec,
  repeat,
  seq,
  token,
  repeat1,
} from "ts-dsl-tree-sitter/src/functional";
import type { RuleOrLiteral } from "ts-dsl-tree-sitter/src/functional";
import * as dsl from "ts-dsl-tree-sitter/src/functional";
const enum Precedence { // least -> greatest
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

const field = {
  name: (_: RuleOrLiteral) => dsl.field("name", _),
  index: (_: RuleOrLiteral) => dsl.field("index", _),
  def: (_: RuleOrLiteral) => dsl.field("def", _),
  ref: (_: RuleOrLiteral) => dsl.field("ref", _),
};

export const _ = () =>
  prec.right(repeat1(choice(/[\r\t ]+/, _escaped_whitespace)));
export const _newline = () => /\n+/;

export const _escaped_newline = () => /\\\n/; // these take precedence over newlines

export const _escaped_whitespace = () =>
  prec.right(repeat1(choice(_escaped_newline, /\\\r/, /\\\t/, /\\ /)));

export const escaped_char = () => /\\[\w.\\~!@#$%^&*()-+=:"'?,]/;

export const _escape = () => choice(escaped_char, _escaped_whitespace);

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
    Precedence.min,
  );
export const integer = () => token(prec(/\d+/, Precedence.integer));
export const float = () =>
  token(prec(choice(/\d+\.\d*/, /\.\d+/), Precedence.float));

export const command = () =>
  prec.right(seq(bare_word, repeat(seq(_, optional(word)))));

export const dollar_sub = () =>
  seq("$", field.ref(choice(bare_word, brace_word, array_ref)));

// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L1457
export const array_ref = () =>
  seq(field.name(bare_word), "(", field.index(optional(word)), ")");
export const bracket_sub = () => seq("[", optional(tcl_script), "]");
// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L565, TclIsBareword
/** function name/identifier/bare variable name  */
export const bare_word = () =>
  token(prec(/[a-zA-Z0-9_]+/, Precedence.bare_word));
export const quote_word = () =>
  prec.left(
    seq('"', repeat(choice(_escape, dollar_sub, bracket_sub, /[^\["$]+/)), '"'),
    Precedence.quote,
  );

// TODO: parse backslash escapes; see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L782

// see https://github.com/tcltk/tcl/blob/main/library/word.tcl
// see https://github.com/tcltk/tcl/blob/main/generic/regc_lex.c
export const comment = () => /\s*#[^\n]*/;
export const other_word = () =>
  seq(
    choice(/[^\[\s;$\\{"]/, escaped_char, bracket_sub, bare_word),
    repeat(choice(/[^\[\s;$\\]/, escaped_char, dollar_sub, bracket_sub)),
  );
export const ns_ref = () =>
  seq(
    optional(bare_word),
    repeat1(seq(token(prec("::", Precedence.max)), bare_word)),
  );
export const word = () =>
  prec.right(
    choice(
      quote_word,
      bracket_sub,
      tcl_word,
      array_ref,
      other_word,
      dollar_sub,
      ns_ref,
      bare_word,
      float,
      integer,
    ),
    Precedence.word,
  );

export const brace_word = () => seq("{", /[^\}]*/, "}");
export const tcl_word = () =>
  prec.dynamic(seq("{", optional(tcl_script), "}"), Precedence.tcl_word);
