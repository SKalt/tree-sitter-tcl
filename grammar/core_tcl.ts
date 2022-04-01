// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c
// see https://tcl.tk/about/language.html

import {
  alias,
  choice,
  field,
  optional,
  prec,
  repeat,
  seq,
  sym,
  token,
  pattern,
  repeat1,
  RuleOrLiteral,
} from "ts-dsl-tree-sitter/src/functional";

// TODO: enumerate the common allowed field names
const variable_ref = () => field("variable_ref", word);
const variable_def = () => field("variable_def", word);
const variable_del = () => field("variable_del", word);
const conditional_test = () => field("test", tcl_word);
const _body = () => field("body", tcl_word);

export const _opts = () =>
  prec.left(precedence._opts, field("options", repeat1(word)));
export const _args = () =>
  prec.left(precedence._args, field("args", repeat1(word)));
export const _patterns = () =>
  prec.left(precedence._patterns, field("patterns", repeat1(word)));

const enum precedence { // least -> greatest
  min = 2,
  bump,
  word,
  _opts,
  _args,
  _patterns,
  tcl_word,
  max,
}

// ranges
export const op = () =>
  choice(
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
  seq(optional(_padding), repeat1(command), optional(_padding));
export const integer = () => /\d+/;
export const float = () => seq(integer, ".", integer);

// TODO: all the grammar constructs
export const command = () =>
  seq(
    choice(
      set_cmd,
      array_cmd,
      break_cmd,
      concat_cmd,
      for_cmd,
      foreach_cmd,
      proc_call,
      list_cmd,
      error_cmd,
      catch_cmd,
      return_cmd,
      apply_cmd,
      after_cmd,
      rename_cmd,
      expr_cmd,
      incr_cmd,
      if_cond_cmd,
      global_cmd,
      while_cmd,
      proc_def_cmd,
      namespace_cmd,
      try_cmd,
      lset_cmd,
      lappend_cmd,
      dict_cmd, // TODO
      unset_cmd,
      switch_cmd,
      _escaped_newline,
    ),
    choice(seq(optional(comment), prec(precedence.max, _newline)), ";"),
  );

// https://tcl.tk/man/tcl8.7/TclCmd/set.html
export const set_cmd = () =>
  seq("set", field("variable", word), optional(field("value", word)));

//  https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L1383
export const dollar_sub = () => seq("$", choice(brace_word, bare_word));
// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L1457

export const array_ref = () =>
  seq(field("array", bare_word), "(", field("index", optional(word)), ")");
export const bracket_sub = () => seq("[", tcl_script, "]");
// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L565, TclIsBareword
// function name/identifier/bare variable name
export const bare_word = () => /[a-zA-Z0-9_]+/;
export const quote_word = () =>
  prec.left(
    precedence.max,
    seq('"', repeat(choice('\\"', dollar_sub, bracket_sub, /[^"]+/)), '"'),
  );
export const brace_word = () => seq("{", choice(), "}");

// TODO: parse backslash escapes; see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L782

// see https://github.com/tcltk/tcl/blob/main/library/word.tcl
// see https://github.com/tcltk/tcl/blob/main/generic/regc_lex.c
export const comment = () => /\s*#.*/;
export const word = () =>
  prec(
    precedence.word,
    choice(
      quote_word,
      brace_word,
      bracket_sub,
      dollar_sub,
      bare_word,
      /[^\s]+/,
    ),
  );
// TODO: indicate that bare_word has precedence over non-whitespace

// TODO: recursive parsing
export const tcl_word = () =>
  prec(
    precedence.tcl_word,
    choice(
      seq("{", repeat(command), "}"),
      seq('"', repeat(command), '"'), // TODO: handle escaped-character trickiness
      dollar_sub, // can't be re-parsed, but still valid here
      bracket_sub, // can't be re-parsed, but still valid here
    ),
  );

// commands --------------------------------------------------------------------
// include here any core language commands which cover iteration, namespacing, or assignment

// export const list_literal = () => choice();
const default_cmd = (cmd: RuleOrLiteral = word) => seq(cmd, optional(_args));
export const proc_call = () => default_cmd(field("name", word));
/**https://tcl.tk/man/tcl8.7/TclCmd/array.html */
export const array_cmd = () =>
  seq(
    "array",
    choice(
      seq("anymore", variable_ref(), field("search_id", word)),
      seq(
        "default",
        choice(
          seq("exists", variable_ref()),
          seq("get", variable_ref()),
          seq("set", variable_ref(), word), // TODO: mark the default
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
      seq("get", variable_ref(), optional(word)),
      seq(
        "names",
        variable_ref(),
        optional(word /*mode*/),
        optional(word /*pattern*/),
      ),
      seq("nextelement", variable_ref(), word /* search id */),
      seq("set", variable_def(), word),
      seq("unset", variable_del(), optional(word)),

      seq("size", variable_ref()),
      seq("startsearch", variable_ref()),
      seq("statistics", variable_ref()),
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
  seq("foreach", repeat(seq(word, word)), tcl_word);
/** https://tcl.tk/man/tcl8.7/TclCmd/list.html */
export const list_cmd = () => default_cmd("list");
/** https://tcl.tk/man/tcl8.7/TclCmd/concat.html */
export const concat_cmd = () => default_cmd("concat");

// TODO: list?
// TODO: proc
/** https://tcl.tk/man/tcl8.7/TclCmd/error.html */
export const error_cmd = () =>
  seq(
    "error",
    field("message", word),
    optional(seq(field("info", optional(word)), field("code", word))),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/catch.html */
export const catch_cmd = () =>
  seq(
    "catch",
    tcl_word,
    optional(
      seq(
        field("result_variable", word),
        field("options_variable", optional(word)),
      ),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/apply.html  */
export const apply_cmd = () =>
  seq("apply", field("func", tcl_word), field("args", word)); // TODO: specify that args should be a list

/** https://tcl.tk/man/tcl8.7/TclCmd/after.html */
export const after_cmd = () =>
  seq(
    "after",
    choice(
      // in order of precedence
      prec.right(2, seq(field("delay_ms", integer), repeat(tcl_word))),
      seq("cancel", prec.left(1, choice(field("id", word))), repeat1(tcl_word)),
      seq("idle", repeat1(tcl_word)),
      seq("info", choice(field("id", optional(word)))),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/return.html */
export const return_cmd = () =>
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
        seq(word, word), // an option-name, option-value pair, generously
      ),
    ),
    optional(word), // result
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/rename.html */
export const rename_cmd = () =>
  prec(
    precedence.bump,
    seq(field("variable_ref", word), field("variable_def", word)),
  );

// https://tcl.tk/man/tcl8.7/TclCmd/while.html

/** https://tcl.tk/man/tcl8.7/TclCmd/expr.html */
export const expr_cmd = () => seq("expr", choice(tcl_word, repeat(word)));

/** https://tcl.tk/man/tcl8.7/TclCmd/incr.html */
export const incr_cmd = () =>
  seq("incr", field("variable", word), field("increment", optional(word)));

const kwd_if = "if";
const kwd_then = "then";
const kwd_elsif = "elsif";
const kwd_else = "else";
const conditional_statement = (keyword: string) =>
  seq(
    keyword,
    conditional_test(), // TODO: use expr construct
    optional(kwd_then),
    _body(),
  );
export const if_cond = () => conditional_statement(kwd_if);
export const elsif_cond = () => conditional_statement(kwd_elsif);
export const else_cond = () => conditional_statement(kwd_else);
/** https://tcl.tk/man/tcl8.7/TclCmd/variable.html */
export const variable_cmd = () =>
  seq("variable", variable_def(), optional(word));
/** https://tcl.tk/man/tcl8.7/TclCmd/global.html */
export const global_cmd = () => seq("global", variable_def());
/** https://tcl.tk/man/tcl8.7/TclCmd/if.html */
export const if_cond_cmd = () =>
  seq(if_cond, repeat(elsif_cond), optional(else_cond));

/** https://tcl.tk/man/tcl8.7/TclCmd/while.html */
export const while_cmd = () => seq("while", conditional_test(), _body());

export const proc_def_cmd = () =>
  seq("proc", field("name", bare_word), field("args", word), _body());
// TODO: info : https://tcl.tk/man/tcl8.7/TclCmd/info.html
/** https://tcl.tk/man/tcl8.7/TclCmd/namespace.html */
export const namespace_cmd = () =>
  seq(
    "namespace",
    choice(
      seq(
        "children",
        optional(word /* namespace */),
        optional(word /* pattern */),
      ),
      seq("code", _body()),
      seq("current"),
      seq("delete", optional(_args)),
      seq("ensemble", optional(_args)), // TODO: handle map, parameter, prefixes, subcommands
      seq("eval", word /* namespace */, choice(tcl_word, repeat1(word))),
      seq("exists", word /*namespace */),
      seq("export", optional("-clear"), optional(_args)), // TODO: mark exports
      seq("forget", optional(_patterns)),
      seq("import", optional("-force"), optional(_patterns)),
      seq("inscope", word /**namespace */, _body(), optional(_args)),
      seq("origin", word /**command */),
      seq("parent", optional(word) /**namespace */),
      seq("path", optional(word) /**namespacelist */),
      seq("qualifiers", word /**string */),
      seq("tail", word /** string */),
      seq(
        "upvar",
        word /**namespace */,
        repeat(seq(variable_ref(), variable_def())),
      ),
      seq("unknown", _body()),
      seq("which", repeat(choice("-command", "-variable")), variable_ref()),
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
        word /*code/pattern*/,
        word /* variable list */,
        tcl_word, // actual handling script
      ),
    ),
    optional(seq("finally", tcl_word)),
  );

export const lset_cmd = () =>
  seq(
    "lset",
    variable_ref(),
    field("indices", optional(choice(repeat1(integer), word))),
    field("value", word),
  );
/* https://tcl.tk/man/tcl8.7/TclCmd/lappend.html */
export const lappend_cmd = () =>
  seq("lappend", variable_ref(), optional(_args));
/** https://tcl.tk/man/tcl8.7/TclCmd/lassign.html */
export const lassign_cmd = () => seq("lassign", word, optional(_args));
/** https://tcl.tk/man/tcl8.7/TclCmd/dict.html#M30 */
export const dict_cmd = () =>
  seq(
    "dict",
    choice(
      seq("create", repeat(seq(word, word))),
      seq(
        choice("for", "map"),
        seq("{", word, word, "}"),
        variable_ref(),
        tcl_word,
      ),
      seq("merge", repeat(word)), // dict merge ?dictionaryValue ...?
      // lowest precedence
      seq(word, variable_ref(), optional(_args)),
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
  );
/** https://tcl.tk/man/tcl8.7/TclCmd/unset.html */
export const unset_cmd = () => seq("unset", repeat(word));
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
    prec(precedence.bump, optional("--")),
    choice(
      prec(2, seq("{", repeat1(seq(word, tcl_word)), "}")),
      prec(1, repeat1(seq(word, tcl_word))),
    ),
  );
/** https://tcl.tk/man/tcl8.7/TclCmd/eval.html */
export const eval_cmd = () => seq("eval", choice(tcl_word, _args));
