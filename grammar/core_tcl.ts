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
  RuleOrLiteral,
} from "ts-dsl-tree-sitter/src/functional";

// TODO: enumerate the common allowed field names
const variable_ref = () => field("variable_ref", _word);
const variable_def = () => field("variable_def", _word);
const variable_del = () => field("variable_del", _word);
const conditional_test = () => field("test", tcl_word);
const _body = () => field("body", tcl_word);

export const _opts = () =>
  prec.left(precedence._opts, field("options", repeat1(_word)));
export const _args = () =>
  prec.left(precedence._args, field("args", repeat1(_word)));
export const _patterns = () =>
  prec.left(precedence._patterns, field("patterns", repeat1(_word)));

const enum precedence { // least -> greatest
  min = 1,
  word,
  bare_word,
  integer,
  float,
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

// ranges
export const op = () =>
  choice(
    // TODO: separate into unary, binary
    "!",
    "+",
    "-",
    "~",
    "**",
    "*",
    "/",
    "%",
    "lt",
    "gt",
    "le",
    "ge",
    "eq",
    "ne",
    "in",
    "ni",
    "==",
    "!=",
    "<",
    ">",
    ">=",
    "<=",
    ">>",
    "<<",
    "&",
    "^",
    "|",
    "||",
    "?",
    ":",
  );
// https://tcl.tk/about/language.html ----------------------------------------------------
// Tcl scripts are made up of commands separated by newlines or semicolons.
export const _escaped_newline = () => /\\\r?\n/; // TODO: ensure escaped newlines take precedence over newlines
export const _newline = () => /(\r?\n)+/;
export const _padding = () => repeat1(choice(_newline, comment));
export const tcl_script = () =>
  seq(
    optional(_padding),
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
export const integer = () => token(prec(precedence.integer, /\d+/));
export const float = () =>
  token(prec(precedence.float, choice(/\d+\.\d*/, /\.\d+/)));

export const command = () =>
  // prec(
  // precedence.command,
  choice(
    _escaped_newline,

    after_cmd,
    apply_cmd,
    array_cmd,
    break_cmd,
    catch_cmd,
    concat_cmd,
    dict_cmd, // TODO
    error_cmd,
    expr_cmd,
    for_cmd,
    foreach_cmd,
    global_cmd,
    if_cond_cmd,
    incr_cmd,
    lappend_cmd,
    list_cmd,
    lset_cmd,
    namespace_cmd,

    proc_call_cmd,
    proc_def_cmd,
    rename_cmd,
    return_cmd,
    set_cmd,
    switch_cmd,
    try_cmd,
    unset_cmd,
    while_cmd,
    // temp_test_cmd,
    // ),
  );

// https://tcl.tk/man/tcl8.7/TclCmd/set.html
export const set_cmd = () =>
  prec.right(
    precedence.min,
    seq(
      token(prec(precedence.max, "set")),
      field("variable", _word),
      optional(field("value", _word)),
    ),
  );

// export const dollar_sub_innards = () =>

//  https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L1383
export const dollar_sub = () =>
  // /\$(||)
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
          seq(
            token.immediate("{"),
            field("variable_ref", _brace_word_innards),
            "}",
          ),
          // seq(token.immediate(_bare_word_pattern), repeat1(dollar_sub)),
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
export const brace_word = () => seq("{", repeat(_brace_word_innards), "}");
export const _brace_word_innards = () => choice(brace_word, /[^\{\}]+/);

// TODO: parse backslash escapes; see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L782

// see https://github.com/tcltk/tcl/blob/main/library/word.tcl
// see https://github.com/tcltk/tcl/blob/main/generic/regc_lex.c
export const comment = () => /\s*#[.]*/;
export const other_word = () => prec(precedence.min, /[^\s;\(\)\[\]\{\}\$"]+/);
/** e.g. foo$bar$baz */
// export const implicit_concat = () => prec.right(0, repeat1(dollar_sub));
// prec.right(
//   precedence.max,
//   seq(bare_word, prec.left(precedence.min, repeat1(implicit_concat_innards))),
// );
// export const implicit_concat_innards = () =>
//   seq(token.immediate("$"), dollar_sub_innards);

export const _word = () =>
  prec.right(
    precedence.word,
    choice(
      quote_word,
      brace_word,
      bracket_sub,
      array_ref,

      repeat1(dollar_sub),
      seq(bare_word, repeat(dollar_sub)),
      // bare_word,
      float,
      integer,
      other_word,
    ),
  );
// TODO: indicate that bare_word has precedence over non-whitespace

export const tcl_word = () =>
  prec(
    precedence.tcl_word,
    choice(
      seq("{", optional(choice(tcl_script, command)), "}"),
      seq('"', optional(tcl_script), '"'), // TODO: handle escaped-character trickiness
      dollar_sub, // can't be re-parsed, but still valid here
      bracket_sub, // can't be re-parsed, but still valid here
    ),
  );

// commands --------------------------------------------------------------------
// include here any core language commands which cover iteration, namespacing, or assignment

// export const list_literal = () => choice();
const default_cmd = (cmd: RuleOrLiteral = _word) =>
  prec.left(precedence._args, seq(cmd, optional(_args)));

export const proc_call_cmd = () => prec.right(precedence.min, repeat1(_word));

/**https://tcl.tk/man/tcl8.7/TclCmd/array.html */
export const array_cmd = () =>
  prec.left(
    precedence.min,
    seq(
      "array",
      choice(
        seq("anymore", variable_ref(), field("search_id", _word)),
        seq(
          "default",
          choice(
            seq("exists", variable_ref()),
            seq("get", variable_ref()),
            seq("set", variable_ref(), _word), // TODO: mark the default
            seq("unset", variable_ref()),
          ),
        ),
        seq("donesearch", variable_ref()),
        seq("exists", variable_ref()),
        seq(
          "for",
          "{",
          field("key", bare_word),
          field("value", bare_word),
          "}",
          variable_ref(),
          tcl_word,
        ),
        seq("get", variable_ref(), optional(_word)),
        seq(
          "names",
          variable_ref(),
          optional(_word /*mode*/),
          optional(_word /*pattern*/),
        ),
        seq("nextelement", variable_ref(), _word /* search id */),
        seq("set", variable_def(), _word),
        seq("unset", variable_del(), optional(_word)),

        seq("size", variable_ref()),
        seq("startsearch", variable_ref()),
        seq("statistics", variable_ref()),
      ),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/break.html */
export const break_cmd = () => "break";
export const continue_cmd = () => "continue";

/** https://tcl.tk/man/tcl8.7/TclCmd/for.html */
export const for_cmd = () =>
  seq(
    "for",
    field("start", tcl_word),
    field("test", tcl_word),
    field("next", tcl_word),
    field("body", tcl_word),
  );
/* https://tcl.tk/man/tcl8.7/TclCmd/foreach.html */
export const foreach_cmd = () =>
  seq(
    "foreach",
    repeat(seq(_word, _word, optional(choice(_newline, _escaped_newline)))),
    tcl_word,
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/list.html */
export const list_cmd = () =>
  choice(
    "list",
    prec(precedence._args, prec.left(precedence._args, seq("list", _args))),
  );
/** https://tcl.tk/man/tcl8.7/TclCmd/concat.html */
export const concat_cmd = () =>
  prec.left(precedence.min, default_cmd("concat"));

// TODO: list?
// TODO: proc
/** https://tcl.tk/man/tcl8.7/TclCmd/error.html */
export const error_cmd = () =>
  prec.right(
    precedence.min,
    seq(
      "error",
      field("message", _word),
      optional(seq(field("info", optional(_word)), field("code", _word))),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/catch.html */
export const catch_cmd = () =>
  prec.left(
    precedence._args,
    seq(
      "catch",
      tcl_word,
      optional(
        seq(
          field("result_variable", _word),
          field("options_variable", optional(_word)),
        ),
      ),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/apply.html  */
export const apply_cmd = () =>
  seq("apply", field("func", tcl_word), field("args", _word)); // TODO: specify that args should be a list

/** https://tcl.tk/man/tcl8.7/TclCmd/after.html */
export const after_cmd = () =>
  prec.left(
    precedence.min,
    seq(
      "after",
      choice(
        // in order of precedence
        prec.left(2, seq(field("delay_ms", integer), repeat(tcl_word))),
        seq(
          "cancel",
          prec.left(1, choice(field("id", _word))),
          repeat1(tcl_word),
        ),
        seq("idle", repeat1(tcl_word)),
        seq("info", choice(field("id", optional(_word)))),
      ),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/return.html */
export const return_cmd = () =>
  prec.left(
    precedence.min,
    seq(
      "return",
      repeat(
        // the options
        choice(
          seq(
            "-code",
            choice(
              choice("ok", "error", "return", "break", "continue"),
              choice("0", "1", "2", "3", "4"),
            ),
          ),
          seq(_word, _word), // an option-name, option-value pair, generously
        ),
      ),
      optional(_word), // result
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/rename.html */
export const rename_cmd = () =>
  seq("rename", field("variable_ref", _word), field("variable_def", _word));

// https://tcl.tk/man/tcl8.7/TclCmd/while.html

/** https://tcl.tk/man/tcl8.7/TclCmd/expr.html */
export const expr_cmd = () =>
  prec.left(precedence.min, seq("expr", choice(tcl_word, repeat1(_word))));

/** https://tcl.tk/man/tcl8.7/TclCmd/incr.html */
export const incr_cmd = () =>
  prec.left(
    precedence.min,
    seq("incr", field("variable", _word), optional(field("increment", _word))),
  );

const enum keyword {
  // control flow keywords
  if = "if",
  then = "then",
  elsif = "elsif",
  else = "else",
  while = "while",
  // namespace keywords
  global = "global",
  namespace = "namespace",
  // core language commands
  proc = "proc",
}

const conditional_statement = (cmd: string) =>
  seq(
    cmd,
    conditional_test(), // TODO: use expr construct
    optional(keyword.then),
    _body(),
  );
export const if_cond = () => conditional_statement(keyword.if);
export const elsif_cond = () => conditional_statement(keyword.elsif);
export const else_cond = () => conditional_statement(keyword.else);

/** https://tcl.tk/man/tcl8.7/TclCmd/variable.html */
export const variable_cmd = () =>
  seq("variable", variable_def(), optional(_word));
/** https://tcl.tk/man/tcl8.7/TclCmd/global.html */
export const global_cmd = () => seq(keyword.global, variable_def());
/** https://tcl.tk/man/tcl8.7/TclCmd/if.html */
export const if_cond_cmd = () =>
  seq(if_cond, repeat(elsif_cond), optional(else_cond));

/** https://tcl.tk/man/tcl8.7/TclCmd/while.html */
export const while_cmd = () => seq(keyword.while, conditional_test(), _body());

/** https://tcl.tk/man/tcl8.7/TclCmd/proc.html */
export const proc_def_cmd = () =>
  seq(keyword.proc, field("name", bare_word), field("args", _word), _body());
// TODO: info : https://tcl.tk/man/tcl8.7/TclCmd/info.html
/** https://tcl.tk/man/tcl8.7/TclCmd/namespace.html */
export const namespace_cmd = () =>
  prec.left(
    precedence.min,
    seq(
      keyword.namespace,
      choice(
        seq(
          "children",
          optional(_word /* namespace */),
          optional(_word /* pattern */),
        ),
        seq("code", _body()),
        seq("current"),
        seq("delete", optional(_args)),
        seq("ensemble", optional(_args)), // TODO: handle map, parameter, prefixes, subcommands
        seq("eval", _word /* namespace */, choice(tcl_word, repeat1(_word))),
        seq("exists", _word /*namespace */),
        seq("export", optional("-clear"), optional(_args)), // TODO: mark exports
        seq("forget", optional(_patterns)),
        seq("import", optional("-force"), optional(_patterns)),
        seq("inscope", _word /**namespace */, _body(), optional(_args)),
        seq("origin", _word /**command */),
        seq("parent", optional(_word) /**namespace */),
        seq("path", optional(_word) /**namespacelist */),
        seq("qualifiers", _word /**string */),
        seq("tail", _word /** string */),
        seq(
          "upvar",
          _word /**namespace */,
          repeat(seq(variable_ref(), variable_def())),
        ),
        seq("unknown", _body()),
        seq("which", repeat(choice("-command", "-variable")), variable_ref()),
      ),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/try.html */
export const try_cmd = () =>
  seq(
    "try",
    /* handler */
    repeat(
      seq(
        choice("on", "trap"),
        _word /*code/pattern*/,
        _word /* variable list */,
        tcl_word, // actual handling script
      ),
    ),
    optional(seq("finally", tcl_word)),
  );

export const lset_cmd = () =>
  prec.left(
    precedence.min,
    seq(
      "lset",
      variable_ref(),
      field("indices", optional(choice(repeat1(integer), _word))),
      field("value", _word),
    ),
  );
/* https://tcl.tk/man/tcl8.7/TclCmd/lappend.html */
export const lappend_cmd = () =>
  prec.left(precedence.min, seq("lappend", variable_ref(), optional(_args)));
/** https://tcl.tk/man/tcl8.7/TclCmd/lassign.html */
export const lassign_cmd = () => seq("lassign", _word, optional(_args));
/** https://tcl.tk/man/tcl8.7/TclCmd/dict.html#M30 */
export const dict_cmd = () =>
  prec.left(
    precedence.min,
    seq(
      "dict",
      choice(
        seq("create", repeat(seq(_word, _word))),
        seq(
          choice("for", "map"),
          seq("{", _word, _word, "}"),
          variable_ref(),
          tcl_word,
        ),
        seq("merge", repeat(_word)), // dict merge ?dictionaryValue ...?
        // lowest precedence
        seq(_word, variable_ref(), optional(_args)),
      ),

      // dict append dictionaryVariable key ?string ...?
      // dict exists dictionaryValue key ?key ...?
      // dict filter dictionaryValue filterType arg ?arg ...?
      //     dict filter dictionaryValue key ?globPattern ...?
      //     dict filter dictionaryValue script {keyVariable valueVariable} script
      //     dict filter dictionaryValue value ?globPattern ...?

      // dict get dictionaryValue ?key ...?
      // dict getdef dictionaryValue ?key ...? key default
      // dict getwithdefault dictionaryValue ?key ...? key default
      // dict incr dictionaryVariable key ?increment?
      // dict info dictionaryValue
      // dict keys dictionaryValue ?globPattern?
      // dict lappend dictionaryVariable key ?value ...?

      // dict remove dictionaryValue ?key ...?
      // dict replace dictionaryValue ?key value ...?
      // dict set dictionaryVariable key ?key ...? value
      // dict size dictionaryValue
      // dict unset dictionaryVariable key ?key ...?
      // dict update dictionaryVariable key varName ?key varName ...? body
      // dict values dictionaryValue ?globPattern?
      // dict with dictionaryVariable ?key ...? body
    ),
  );
/** https://tcl.tk/man/tcl8.7/TclCmd/unset.html */
export const unset_cmd = () => seq("unset", _args);
/** https://tcl.tk/man/tcl8.7/TclCmd/uplevel.html */
export const uplevel_cmd = () =>
  seq(
    "uplevel",
    field("levels_up", optional(choice(integer, seq("#", integer)))),
    choice(tcl_word, _args),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/switch.html */
export const switch_cmd = () =>
  seq(
    "switch",
    _opts,
    prec(precedence._opts, optional("--")),
    choice(
      prec(2, seq("{", repeat1(seq(_word, tcl_word)), "}")),
      prec(1, repeat1(seq(_word, tcl_word))),
    ),
  );
/** https://tcl.tk/man/tcl8.7/TclCmd/eval.html */
export const eval_cmd = () => seq("eval", choice(tcl_word, _args));
