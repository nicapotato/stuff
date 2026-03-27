.PHONY: serve help

help: ## Show targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

serve: ## Local HTTP server; open http://127.0.0.1:8880/index.html
	python3 -m http.server 8880 --bind 127.0.0.1
