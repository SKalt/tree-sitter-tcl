.PHONY: generate test web-ui wasm
generate: ./src/grammar.json
	if test -e /tmp/generate.err; then mv /tmp/generate.err /tmp/generate.err.old; fi
	./node_modules/.bin/tree-sitter generate ./src/grammar.json 2>&1 | tee /tmp/generate.err
	if diff -u /tmp/generate.err.old /tmp/generate.err; then exit 1; else exit 0; fi
	# TODO: don't clobber generation return code
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