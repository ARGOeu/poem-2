container_name = poem-react-c7

place-new-bundle:
	./keep-latest-bundle.sh
	docker exec -u user -t $(container_name) /home/user/collectstatic.sh
	docker exec -u user -t $(container_name) /home/user/restarthttpd.sh

devel-watch:
	rm -rf frontend/bundles/reactbundle/* ; \
	node_modules/.bin/webpack --config webpack.config.js --progress --mode development --watch

devel-django-server:
	docker exec -ti $(container_name) /home/user/run-django-server.sh

devel-webpack-server:
	node_modules/.bin/webpack-dev-server --config webpack.devserver.config.js --progress

devel-webpack-server-hmr:
	node_modules/.bin/webpack-dev-server --config webpack.devserver.config.js --progress --hot

devel-bundle:
	rm -rf frontend/bundles/reactbundle/* ; \
		node_modules/.bin/webpack --config webpack.config.js --progress --mode development

prod-bundle:
	rm -rf frontend/bundles/reactbundle/* ; \
		node_modules/.bin/webpack --config webpack.config.js --progress --mode production

py-audit-view:
	docker exec -t $(container_name) ./safety.sh

test-front:
	rm -rf coverage
	npm test

js-audit-view:
	npm audit

js-audit-fix:
	npm audit fix
