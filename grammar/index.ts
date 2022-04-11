import { grammar, optional } from "ts-dsl-tree-sitter/src/functional";
import * as core_rules from "./core_tcl";

export default grammar({
  name: "tcl",
  rules: {
    program: () => optional(core_rules.tcl_script), // top-level rule
    ...core_rules,
  },
  word: core_rules.bare_word.name,
  conflicts: [
    ["brace_word", "tcl_word"],
    // ["tcl_script"],
    // ["_word", "quote_word"],
  ],
  extras: [],
});
