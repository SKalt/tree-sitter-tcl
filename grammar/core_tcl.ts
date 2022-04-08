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

export const _words = () => repeat1(__word);
export const _args = () => prec.left(precedence._args, field("args", _words));
export const _patterns = () =>
  // TODO: refine pattern
  prec.left(precedence._patterns, field("patterns", _words));

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
export const newline = () => /(\r?\n)+/;
export const _padding = () => repeat1(choice(newline, comment, _));
export const tcl_script = () =>
  prec.right(
    precedence.min,
    seq(
      repeat(
        seq(
          optional(_padding),
          command,
          optional(_),
          choice(";", seq(optional(comment), newline)),
        ),
      ),
      seq(
        optional(_padding),
        command,
        optional(_),
        choice(";", seq(optional(comment), optional(newline))),
      ),
      optional(_padding),
    ),
  );
export const integer = () => token(prec(precedence.integer, /\d+/));
export const float = () =>
  token(prec(precedence.float, choice(/\d+\.\d*/, /\.\d+/)));

export const command = () =>
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
  );

// https://tcl.tk/man/tcl8.7/TclCmd/set.html
export const set_cmd = () =>
  prec.right(
    precedence.min,
    seq(
      "set",
      _,
      field("variable", _word),
      optional(seq(_, optional(field("value", _word)))),
    ),
  );

//  https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L1383
export const dollar_sub = () =>
  prec(
    precedence.dollar_sub,
    seq("$", choice(brace_word, bare_word, array_ref)),
    // TODO: ensure no whitespace between $ and next token
  );
// see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L1457

export const _ = () => /[\t ]/;

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
export const bare_word = () => token(/[a-zA-Z0-9_]+/);
export const quote_word = () =>
  prec.left(
    precedence.max,
    seq('"', repeat(choice('\\"', dollar_sub, bracket_sub, /[^"]+/)), '"'),
  );
export const brace_word = () =>
  seq("{", optional(choice(brace_word, /[^\{\}]+/)), "}");

// TODO: parse backslash escapes; see https://github.com/tcltk/tcl/blob/main/generic/tclParse.c#L782

// see https://github.com/tcltk/tcl/blob/main/library/word.tcl
// see https://github.com/tcltk/tcl/blob/main/generic/regc_lex.c
export const comment = () => /#.*/;
export const other_word = () => prec(precedence.min, /[^\s;\(\)\[\]\{\}\$"]+/);
export const _word = () =>
  prec.right(
    precedence.word,
    choice(
      quote_word,
      brace_word,
      bracket_sub,
      dollar_sub,
      array_ref,
      // seq(_word, token.immediate(float, integer, bare_word))),
      // seq(choice(bare_word, float, integer)), // compound word

      float,
      integer,
      bare_word,
      other_word,
    ),
  );
const __word = seq(_, _word);
const _opt_word = optional(__word);

const _pair = seq(__word, __word);
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
const __tcl_word = seq(_, tcl_word);

// commands --------------------------------------------------------------------
// include here any core language commands which cover iteration, namespacing, or assignment

// export const list_literal = () => choice();
const default_cmd = (cmd: RuleOrLiteral = _word) =>
  prec.left(precedence._args, seq(cmd, optional(_args)));

export const proc_call_cmd = () => default_cmd();
// prec.right(precedence.min, seq(_word, _words));

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
          _,
          choice(
            seq(choice("get", "unset", "exists"), _, variable_ref()),
            seq("set", _, variable_ref(), __word), // TODO: mark the default
          ),
        ),
        seq("donesearch", _, variable_ref()),
        seq("exists", _, variable_ref()),
        seq(
          "for",
          _,
          "{",
          field("key", bare_word),
          _,
          field("value", bare_word),
          _,
          "}",
          _,
          variable_ref(),
          _,
          tcl_word,
        ),
        seq("get", _, variable_ref(), _opt_word),
        seq(
          "names",
          _,
          variable_ref(),
          _,
          _opt_word /*mode*/,
          _opt_word /*pattern*/,
        ),
        seq("nextelement", _, variable_ref(), __word /* search id */),
        seq("set", _, variable_def(), __word),
        seq("unset", _, variable_del(), _opt_word),
      ),

      seq("size", _, variable_ref()),
      seq("startsearch", _, variable_ref()),
      seq("statistics", _, variable_ref()),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/break.html */
export const break_cmd = () => "break";
export const continue_cmd = () => "continue";

/** https://tcl.tk/man/tcl8.7/TclCmd/for.html */
export const for_cmd = () =>
  seq(
    "for",
    _,
    field("start", tcl_word),
    _,
    field("test", tcl_word),
    _,
    field("next", tcl_word),
    _,
    field("body", tcl_word),
  );
/* https://tcl.tk/man/tcl8.7/TclCmd/foreach.html */
export const foreach_cmd = () => seq("foreach", repeat(_pair), __tcl_word);
/** https://tcl.tk/man/tcl8.7/TclCmd/list.html */
export const list_cmd = () =>
  choice("list", prec.left(precedence._args, seq("list", _args)));
/** https://tcl.tk/man/tcl8.7/TclCmd/concat.html */
export const concat_cmd = () =>
  prec.left(precedence.min, default_cmd("concat"));

/** https://tcl.tk/man/tcl8.7/TclCmd/error.html */
export const error_cmd = () =>
  prec.right(
    precedence.min,
    seq(
      "error",
      _,
      field("message", _word),
      optional(
        seq(_, field("info", _word), optional(seq(_, field("code", _word)))),
      ),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/catch.html */
export const catch_cmd = () =>
  prec.left(
    precedence._args,
    seq(
      "catch",
      __tcl_word,
      optional(
        seq(
          _,
          field("result_variable", _word),
          field("options_variable", optional(seq(__word))),
        ),
      ),
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/apply.html  */
export const apply_cmd = () =>
  seq("apply", _, field("func", tcl_word), _, field("args", _word)); // TODO: specify that args should be a list

/** https://tcl.tk/man/tcl8.7/TclCmd/after.html */
export const after_cmd = () =>
  prec.left(
    precedence.min,
    seq(
      "after",
      _,
      choice(
        // in order of precedence
        prec.left(2, seq(field("delay_ms", integer), repeat(__tcl_word))),
        seq(
          "cancel",
          _,
          prec.left(1, choice(field("id", _word))),
          repeat1(__tcl_word),
        ),
        seq("idle", repeat1(__tcl_word)),
        seq("info", _, field("id", optional(_word))),
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
        seq(
          _,
          choice(
            seq(
              "-code",
              _,
              choice(
                choice("ok", "error", "return", "break", "continue"),
                choice("0", "1", "2", "3", "4"),
              ),
            ),
            seq(_pair), // an option `-name value` pair, generously
          ),
        ),
      ),
      optional(__word), // result
    ),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/rename.html */
export const rename_cmd = () =>
  seq("rename", _, variable_ref(), _, variable_def());

// https://tcl.tk/man/tcl8.7/TclCmd/while.html

/** https://tcl.tk/man/tcl8.7/TclCmd/expr.html */
export const expr_cmd = () =>
  prec.left(precedence.min, seq("expr", _, choice(tcl_word, repeat1(_word))));

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
    _,
    conditional_test(),
    _, // TODO: use expr construct
    optional(seq(keyword.then, _)),
    _body(),
  );
export const if_cond = () => conditional_statement(keyword.if);
export const elsif_cond = () => conditional_statement(keyword.elsif);
export const else_cond = () => conditional_statement(keyword.else);

/** https://tcl.tk/man/tcl8.7/TclCmd/variable.html */
export const variable_cmd = () =>
  seq("variable", _, variable_def(), optional(seq(__word)));
/** https://tcl.tk/man/tcl8.7/TclCmd/global.html */
export const global_cmd = () => seq(keyword.global, _, variable_def());
/** https://tcl.tk/man/tcl8.7/TclCmd/if.html */
export const if_cond_cmd = () =>
  seq(if_cond, _, repeat(seq(elsif_cond, _)), optional(else_cond));

/** https://tcl.tk/man/tcl8.7/TclCmd/while.html */
export const while_cmd = () =>
  seq(keyword.while, _, conditional_test(), _, _body());

/** https://tcl.tk/man/tcl8.7/TclCmd/proc.html */
export const proc_def_cmd = () =>
  seq(
    keyword.proc,
    _,
    field("name", bare_word),
    _,
    field("args", _word),
    _,
    _body(),
  );
// TODO: info : https://tcl.tk/man/tcl8.7/TclCmd/info.html
/** https://tcl.tk/man/tcl8.7/TclCmd/namespace.html */
export const namespace_cmd = () =>
  prec.left(
    precedence.min,
    seq(
      keyword.namespace,
      choice(
        "current",
        seq(
          "children",
          optional(_opt_word /* namespace */),
          optional(_opt_word /* pattern */),
        ),
        seq("code", _body()),
        seq("delete", optional(_args)),
        seq("ensemble", optional(_args)), // TODO: handle map, parameter, prefixes, subcommands
        seq("eval", _word /* namespace */, choice(tcl_word, repeat1(_word))),
        seq("exists", _word /*namespace */),
        seq("export", optional("-clear"), optional(_args)), // TODO: mark exports
        seq("forget", optional(_patterns)),
        seq("import", optional("-force"), optional(_patterns)),
        seq("inscope", __word /**namespace */, _body(), optional(_args)),
        seq("origin", __word /**command */),
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
      _,
      choice(
        seq("create", repeat(seq(_word, _word))),
        seq(
          choice("for", "map"),
          seq("{", optional(_), _word, _, _word, optional(_), "}"),
          variable_ref(),
          _,
          tcl_word,
        ),
        seq("merge", _, repeat(_word)), // dict merge ?dictionaryValue ...?
        // lowest precedence
        seq(_word, _, variable_ref(), optional(_args)),
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
    _,
    field("levels_up", optional(choice(integer, seq("#", integer)))),
    choice(tcl_word, _args),
  );

/** https://tcl.tk/man/tcl8.7/TclCmd/switch.html */
export const switch_cmd = () =>
  seq(
    "switch",
    field("options", repeat(__word)),
    optional("--"),
    choice(
      prec(
        2,
        seq(
          "{",
          repeat(seq(_word, __tcl_word, _)),
          seq(_word, __tcl_word),
          "}",
        ),
      ),
      prec(1, seq(repeat(seq(_word, __tcl_word, _)), seq(_word, __tcl_word))),
    ),
  );
/** https://tcl.tk/man/tcl8.7/TclCmd/eval.html */
export const eval_cmd = () => seq("eval", choice(tcl_word, _args));
