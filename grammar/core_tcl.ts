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
  integer,
  dollar_sub,
  array_ref,
  quote,
  tcl_word,
  _opts,
  _patterns,
  proc_call,
  _args,
  named_cmd,
  max,
}

const conditional_test = () => field("test", tcl_word);
const _body = () => field("body", tcl_word);
// https://tcl.tk/about/language.html ----------------------------------------------------
// Tcl scripts are made up of commands separated by newlines or semicolons.
export const _escaped_newline = () => /\\\r?\n/; // these take precedence over newlines
export const _newline = () => /(\r?\n)+/;
export const tcl_script = () =>
  seq(
    repeat(choice(_newline, comment)),
    prec.right(
      precedence.min,
      repeat(
        prec.right(
          precedence.max,
          seq(command, choice(";", seq(optional(comment), _newline))),
        ),
      ),
    ),
    seq(command, choice(";", seq(optional(comment), optional(_newline)))),
  );
export const integer = () => token(/\d+/);
export const float = () =>
  prec(precedence.min, token(choice(/\d+\.\d*/, /\.\d+/)));

export const command = () =>
  prec.right(
    precedence.min,
    repeat1(choice(_word, tcl_word, _escaped_newline)),
  );

export const dollar_sub = () =>
  prec(
    precedence.dollar_sub,
    seq(
      "$",
      prec.right(
        precedence.min,
        choice(
          seq(
            field("variable_ref", token.immediate(_bare_word_pattern)),
            repeat(dollar_sub),
          ),
          seq(token.immediate("{"), field("variable_ref", /[^}]+/), "}"),
          seq(
            token.immediate(_bare_word_pattern),
            token.immediate("("),
            field("index", optional(_word)),
            token.immediate(")"),
          ),
        ),
      ),
    ),
  );

// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L1457
export const array_ref = () =>
  prec(
    precedence.array_ref,
    seq(
      field("array", bare_word),
      token.immediate("("),
      field("index", optional(_word)),
      token.immediate(")"),
    ),
  );
export const bracket_sub = () => seq("[", tcl_script, "]");
// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L565, TclIsBareword
// function name/identifier/bare variable name
const _bare_word_pattern = /[a-zA-Z0-9_]+/;
export const bare_word = () => token(_bare_word_pattern);
export const quote_word = () =>
  prec.left(
    precedence.max,
    seq('"', repeat(choice('\\"', dollar_sub, bracket_sub, /[^"]+/)), '"'),
  );

// TODO: parse backslash escapes; see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L782

// see https://github.com/tcltk/tcl/blob/main/library/word.tcl
// see https://github.com/tcltk/tcl/blob/main/generic/regc_lex.c
export const comment = () => /\s*#[^\n]*/;
export const other_word = () => /[^\s;\(\)\[\]\{\}\$"]+/;

export const _word = () =>
  prec.right(
    precedence.word,
    choice(
      quote_word,
      bracket_sub,
      tcl_word,
      array_ref,
      repeat1(dollar_sub), // should be immediate
      seq(bare_word, repeat(dollar_sub)), // should be immediate =
      float,
      integer,
      other_word,
    ),
  );

export const tcl_word = () =>
  prec(
    precedence.tcl_word,
    choice(
      seq("{", optional(choice(tcl_script, command)), "}"),
      // seq('"', optional(tcl_script), '"'), // TODO: handle escaped-character trickiness
    ),
  );

// commands --------------------------------------------------------------------
// include here any core language commands which cover iteration, namespacing, or assignment

// /** https://tcl.tk/man/tcl8.7/TclCmd/for.html */
// export const for_cmd = () =>
//   seq(
//     "for",
//     field("start", tcl_word),
//     field("test", tcl_word),
//     field("next", tcl_word),
//     field("body", tcl_word),
//   );

// /* https://tcl.tk/man/tcl8.7/TclCmd/foreach.html */
// export const foreach_cmd = () =>
//   seq(
//     "foreach",
//     repeat(seq(_word, _word, optional(choice(_newline, _escaped_newline)))),
//     tcl_word,
//   );

// /** https://tcl.tk/man/tcl8.7/TclCmd/catch.html */
// export const catch_cmd = () =>
//   prec.left(
//     precedence._args,
//     seq(
//       "catch",
//       tcl_word,
//       optional(
//         seq(
//           field("result_variable", _word),
//           field("options_variable", optional(_word)),
//         ),
//       ),
//     ),
//   );

// /** https://tcl.tk/man/tcl8.7/TclCmd/apply.html  */
// export const apply_cmd = () =>
//   seq("apply", field("func", tcl_word), field("args", _word)); // TODO: specify that args should be a list

// /** https://tcl.tk/man/tcl8.7/TclCmd/after.html */
// export const after_cmd = () =>
//   prec.left(
//     precedence.min,
//     seq(
//       "after",
//       choice(
//         // in order of precedence
//         prec.left(2, seq(field("delay_ms", integer), repeat(tcl_word))),
//         seq(
//           "cancel",
//           prec.left(1, choice(field("id", _word))),
//           repeat1(tcl_word),
//         ),
//         seq("idle", repeat1(tcl_word)),
//         seq("info", choice(field("id", optional(_word)))),
//       ),
//     ),
//   );

// // https://tcl.tk/man/tcl8.7/TclCmd/while.html

// /** https://tcl.tk/man/tcl8.7/TclCmd/expr.html */
// export const expr_cmd = () =>
//   prec.left(precedence.min, seq("expr", choice(tcl_word, repeat1(_word))));

// /** https://tcl.tk/man/tcl8.7/TclCmd/incr.html */
// export const incr_cmd = () =>
//   prec.left(
//     precedence.min,
//     seq("incr", field("variable", _word), optional(field("increment", _word))),
//   );

// const enum keyword {
//   // control flow keywords
//   if = "if",
//   then = "then",
//   elsif = "elsif",
//   else = "else",
//   while = "while",
//   // namespace keywords
//   global = "global",
//   namespace = "namespace",
//   // core language commands
//   proc = "proc",
// }

// const conditional_statement = (cmd: string) =>
//   seq(
//     cmd,
//     conditional_test(), // TODO: use expr construct
//     optional(keyword.then),
//     _body(),
//   );
// export const if_cond = () => conditional_statement(keyword.if);
// export const elsif_cond = () => conditional_statement(keyword.elsif);
// export const else_cond = () => conditional_statement(keyword.else);

// /** https://tcl.tk/man/tcl8.7/TclCmd/if.html */
// export const if_cond_cmd = () =>
//   seq(if_cond, repeat(elsif_cond), optional(else_cond));

// /** https://tcl.tk/man/tcl8.7/TclCmd/while.html */
// export const while_cmd = () => seq(keyword.while, conditional_test(), _body());

// /** https://tcl.tk/man/tcl8.7/TclCmd/proc.html */
// export const proc_def_cmd = () =>
//   seq(keyword.proc, field("name", bare_word), field("args", _word), _body());

// // TODO: info : https://tcl.tk/man/tcl8.7/TclCmd/info.html
// /** https://tcl.tk/man/tcl8.7/TclCmd/namespace.html */

// /** https://tcl.tk/man/tcl8.7/TclCmd/try.html */
// export const try_cmd = () =>
//   seq(
//     "try",
//     /* handler */
//     repeat(
//       seq(
//         choice("on", "trap"),
//         _word /*code/pattern*/,
//         _word /* variable list */,
//         tcl_word, // actual handling script
//       ),
//     ),
//     optional(seq("finally", tcl_word)),
//   );

// /** https://tcl.tk/man/tcl8.7/TclCmd/dict.html#M30 */
// export const dict_cmd = () =>
//   prec.left(
//     precedence.min,
//     seq(
//       "dict",
//       choice(
//         seq("create", repeat(seq(_word, _word))),
//         seq(
//           choice("for", "map"),
//           seq("{", _word, _word, "}"),
//           variable_ref(),
//           tcl_word,
//         ),
//         seq("merge", repeat(_word)), // dict merge ?dictionaryValue ...?
//         // lowest precedence
//         seq(_word, variable_ref(), optional(_args)),
//       ),

//       // dict append dictionaryVariable key ?string ...?
//       // dict exists dictionaryValue key ?key ...?
//       // dict filter dictionaryValue filterType arg ?arg ...?
//       //     dict filter dictionaryValue key ?globPattern ...?
//       //     dict filter dictionaryValue script {keyVariable valueVariable} script
//       //     dict filter dictionaryValue value ?globPattern ...?

//       // dict get dictionaryValue ?key ...?
//       // dict getdef dictionaryValue ?key ...? key default
//       // dict getwithdefault dictionaryValue ?key ...? key default
//       // dict incr dictionaryVariable key ?increment?
//       // dict info dictionaryValue
//       // dict keys dictionaryValue ?globPattern?
//       // dict lappend dictionaryVariable key ?value ...?

//       // dict remove dictionaryValue ?key ...?
//       // dict replace dictionaryValue ?key value ...?
//       // dict set dictionaryVariable key ?key ...? value
//       // dict size dictionaryValue
//       // dict unset dictionaryVariable key ?key ...?
//       // dict update dictionaryVariable key varName ?key varName ...? body
//       // dict values dictionaryValue ?globPattern?
//       // dict with dictionaryVariable ?key ...? body
//     ),
//   );
// /** https://tcl.tk/man/tcl8.7/TclCmd/unset.html */
// export const unset_cmd = () => seq("unset", _args);
// /** https://tcl.tk/man/tcl8.7/TclCmd/uplevel.html */
// export const uplevel_cmd = () =>
//   seq(
//     "uplevel",
//     field("levels_up", optional(choice(integer, seq("#", integer)))),
//     choice(tcl_word, _args),
//   );

// /** https://tcl.tk/man/tcl8.7/TclCmd/switch.html */
// export const switch_cmd = () =>
//   seq(
//     "switch",
//     _opts,
//     prec(precedence._opts, optional("--")),
//     choice(
//       prec(2, seq("{", repeat1(seq(_word, tcl_word)), "}")),
//       prec(1, repeat1(seq(_word, tcl_word))),
//     ),
//   );
// /** https://tcl.tk/man/tcl8.7/TclCmd/eval.html */
// export const eval_cmd = () => seq("eval", choice(tcl_word, _args));
