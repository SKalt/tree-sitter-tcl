import { grammar } from "ts-dsl-tree-sitter/src/functional";
import * as core_rules from "./core_tcl";

export default grammar({
  name: "tcl",
  rules: { ...core_rules },
});
