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
    ["tcl_word", "word"],
    ["integer", "bare_word", "other_word"],
  ],
});
