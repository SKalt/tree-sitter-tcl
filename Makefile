.PHONY: generate test web-ui wasm
generate: ./src/grammar.json
	./node_modules/.bin/tree-sitter generate ./src/grammar.json
test:
	./node_modules/.bin/tree-sitter test
playground: ./tree-sitter-GRAMMAR_NAME.wasm
	./node_modules/.bin/tree-sitter playground
wasm: ./tree-sitter-GRAMMAR_NAME.wasm

./tree-sitter-GRAMMAR_NAME.wasm: ./src/grammar.json
	./node_modules/.bin/tree-sitter build-wasm
./src/grammar.json: ./grammar/grammar.ts ./grammar/index.ts ./grammar/core_tcl.ts
	./node_modules/.bin/esbuild --bundle --format=iife --platform=node --target=node14 ./grammar/grammar.ts > /tmp/bundle.js
	node /tmp/bundle.js > ./src/grammar.json