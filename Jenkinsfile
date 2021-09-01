pipeline {
    agent any
    options {
        checkoutToSubdirectory('poem-react')
    }
    environment {
        PROJECT_DIR="poem-react"
    }
    stages {
        stage ('Prepare containers') {
            steps {
                script
                {
                    try
                    {
                        echo 'Prepare containers...'
                        sh '''
                            cd $WORKSPACE/$PROJECT_DIR/testenv/
                            docker-compose up -d --no-build
                            while (( 1 ))
                            do
                                sleep 5
                                container_web_running=$(docker ps -f name=poem-react-tests-webapp -f status=running -q)
                                container_db_running=$(docker ps -f name=poem-react-tests-postgres10 -f status=running -q)
                                if [[ ! -z "$container_web_running" && ! -z "$container_db_running" ]]
                                then
                                    docker exec -i poem-react-tests-webapp /home/jenkins/poem-install.sh
                                    exit $?
                                else
                                    echo "not running"
                                fi
                            done
                        '''
                    }
                    catch (Exception err)
                    {
                        echo 'Failed preparation of containers...'
                        echo err.toString()
                    }
                }

            }
        }
        stage ('Execute tests') {
            parallel {
                stage ('Execute backend tests') {
                    steps {
                        script
                        {
                            try
                            {
                                echo 'Executing backend tests...'
                                sh '''
                                    while (( 1 ))
                                    do
                                        sleep 5
                                        containers_running=$(docker ps -f name=poem-react-tests -f status=running -q)
                                        if [ ! -z "$containers_running" ]
                                        then
                                            echo "running"
                                            docker exec -i poem-react-tests-webapp /home/jenkins/execute-backend-tests.sh
                                            exit $?
                                        else
                                            echo "not running"
                                        fi
                                    done
                                '''
                            }
                            catch (Exception err)
                            {
                                echo 'Backend tests failed...'
                                echo err.toString()
                            }
                        }
						junit 'poem-react/junit-backend.xml'
                    }
                }
                stage ('Execute frontend tests') {
                    steps {
                        script
                        {
                            try
                            {
                                echo 'Executing frontend tests...'
                                sh '''
                                    while (( 1 ))
                                    do
                                        sleep 5
                                        containers_running=$(docker ps -f name=poem-react-tests -f status=running -q)
                                        if [ ! -z "$containers_running" ]
                                        then
                                            echo "running"
                                            docker exec -i poem-react-tests-webapp /home/jenkins/execute-frontend-tests.sh
                                            exit $?
                                        else
                                            echo "not running"
                                        fi
                                    done
                                '''
                            }
                            catch (Exception err)
                            {
                                echo 'Frontend tests failed...'
                                echo err.toString()
                            }
                        }
						junit 'poem-react/junit-frontend.xml'
                    }
                }
            }
        }
        stage ('Generating reports') {
            steps {
                publishCoverage adapters: [coberturaAdapter(path: 'poem-react/coverage-backend.xml, poem-react/cobertura-coverage.xml', mergeToOneReport: true)]
            }
        }
        stage ('Teardown containers') {
            steps {
				script
				{
					sh '''
						echo "Stopping containers..."
					'''
				}
            }
            post {
                always {
                    sh '''
                      cd $WORKSPACE/$PROJECT_DIR/testenv/
                      docker-compose down
                    '''
                    cleanWs()
                }
            }
        }
    }
}
