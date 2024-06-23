container_name = poem-react-c7

wheel-prod:
	python setup.py bdist_wheel

wheel-devel:
	python setup.py egg_info --tag-date --tag-build=dev bdist_wheel

sdist:
	python setup.py sdist

clean:
	rm -f MANIFEST
	rm -rf dist build
	rm -rf **/*.pyc
	rm -rf **/*.pyo
	rm -rf **/*.pyo
	rm -rf *.egg-info/
	rm -rf **/*__pycache__*
