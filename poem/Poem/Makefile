container_name = poem-react-c7

place-new-bundle:
	keep-latest-bundle.sh
	docker exec -t $(container_name) ./collectstatic.sh
	docker exec -t $(container_name) ./restarthttpd.sh

devel-watch:
	rm -rf frontend/bundles/reactbundle/* ; \
	node_modules/.bin/webpack --config webpack.config.js --progress --mode development --watch

devel:
	rm -rf frontend/bundles/reactbundle/* ; \
		node_modules/.bin/webpack --config webpack.config.js --progress --mode development

prod:
	rm -rf frontend/bundles/reactbundle/* ; \
		node_modules/.bin/webpack --config webpack.config.js --progress --mode production
