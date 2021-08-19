pipeline {
    agent any
    options {
		checkoutToSubdirectory('poem-react')
    }
    environment {
		PROJECT_DIR="poem-react"
    }
    stages {
		stage ('Test Backend') {
			steps {
				script
				{
					testBuildBadge.setStatus('running')
					testBuildBadge.setColor('blue')

					try
					{
						echo 'Create docker containers...'
						sh '''
							cd $WORKSPACE/$PROJECT_DIR/testenv/
							docker-compose up -d
							while (( 1 ))
							do
								containers_running=$(docker ps -f name=poem-react-tests -f status=running -q)
								if [ ! -z "$containers_running" ]
								then
                                    docker exec -t -i poem-react-tests /home/jenkins/poem-install.sh
									docker exec -t -i poem-react-tests /home/jenkins/execute-backend-tests.sh
									echo "running"
									break
								else
									echo "not running"
								fi
								sleep 2
							done

							return 0
						'''
					}
					catch (Exception err)
					{
						echo 'Failed...'
					}
				}
			}
        post {
			always {
				sh '''
				  cd $WORKSPACE/$PROJECT_DIR/testenv
				  docker-compose down
				'''
				cleanWs()
			}
        }
      }
    }
    post {
		always {
			cleanWs()
		}
    }
}
