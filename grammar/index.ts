import { grammar, optional } from "ts-dsl-tree-sitter/src/functional";
import * as core_rules from "./core_tcl";

export default grammar({
  name: "tcl",
  rules: {
    program: () => optional(core_rules.tcl_script), // top-level rule
    ...core_rules,
  },
  word: core_rules.bare_word.name,
  conflicts: [["other_word", "array_ref"]],
  extras: [],
});
