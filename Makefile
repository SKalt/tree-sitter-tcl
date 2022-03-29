.PHONY: generate test web-ui wasm
generate: src/grammar.json
test:
	./node_modules/.bin/tree-sitter test
playground: ./tree-sitter-GRAMMAR_NAME.wasm
	./node_modules/.bin/tree-sitter playground
wasm: ./tree-sitter-GRAMMAR_NAME.wasm

./tree-sitter-GRAMMAR_NAME.wasm: ./src/grammar.json
	./node_modules/.bin/tree-sitter build-wasm
./src/grammar.json:
	./node_modules/.bin/tree-sitter generate
