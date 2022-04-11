import { grammar } from "ts-dsl-tree-sitter/src/functional";
import * as core_rules from "./core_tcl";

const { tcl_script, ...others } = core_rules;
export default grammar({
  name: "tcl",
  rules: {
    tcl_script, // top-level rule
    ...others,
  },
  conflicts: [
    ["_word", "tcl_word"],
    ["_word", "quote_word"],
  ],
  extras: [/[\t ]+/],
});
