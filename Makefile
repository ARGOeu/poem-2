container_name = poem-react-r9

wheel-prod: clean
	poetry install --no-root --with devel; \
	poetry run python3 -m build -w


wheel-devel: clean
	@if [ -z "$$BUILD_VER" ]; then \
        export BUILD_VER=$$(grep "VERSION.=" version.py \
			| awk '{print $$3}' \
			| sed 's/\"//g')".dev"$$(date +%Y%m%d); \
		[ -z "$$BUILD_CANDIDATE" ] && \
		export BUILD_VER=$$BUILD_VER"01" || \
		export BUILD_VER=$$BUILD_VER$$BUILD_CANDIDATE; \
  fi; \
	echo "Version $$BUILD_VER"; \
	poetry install --no-root --with devel; \
  poetry run python3 -m build -w
	mv -f dist/*.whl .


clean:
	rm -f MANIFEST
	rm -rf dist build
	rm -rf **/*.pyc
	rm -rf **/*.pyo
	rm -rf **/*.pyo
	rm -rf *.egg-info/
	rm -rf **/*__pycache__*
