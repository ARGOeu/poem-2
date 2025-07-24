container_name = poem-react-r9

place-new-bundle:
	./keep-latest-bundle.sh
	docker exec -u user -t $(container_name) /home/user/collectstatic.sh
	docker exec -u user -t $(container_name) /home/user/restarthttpd.sh

devel-watch:
	rm -rf frontend/bundles/reactbundle/* ; \
	node_modules/.bin/webpack --config webpack.config.js --progress --mode development --watch

devel-django-server:
	docker exec -ti $(container_name) /home/user/run-django-server.sh

devel-bundle:
	rm -rf frontend/bundles/reactbundle/* ; \
		node_modules/.bin/webpack --config webpack.config.js --progress --mode development

devel-webpack-server:
	docker exec -u user -t $(container_name) /home/user/run-frontdev-server.sh

devel-webpack-server-hmr:
	docker exec -u user -t $(container_name) bash -c '/home/user/run-frontdev-server.sh --hot'

devel-wheel:
	docker exec -u user -t $(container_name) bash -c 'cd /home/user/poem-source && make clean && make wheel-devel'

prod-wheel:
	docker exec -u user -t $(container_name) bash -c 'cd /home/user/poem-source && make clean && make wheel-prod'

npm:
	docker exec -t $(container_name) bash -c 'cd /home/user/frontend && npm $(ARGS)'

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
