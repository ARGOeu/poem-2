container_name = poem-react-c7

wheel-prod:
	python setup.py bdist_wheel

wheel-devel:
	python setup.py egg_info --tag-date --tag-build=dev bdist_wheel

sdist:
	python setup.py sdist

clean:
	python setup.py clean --all
	rm -rf build/
	rm -rf dist
	rm -rf poem.egg-info/
