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
                            docker-compose up -d
                            while (( 1 ))
                            do
                                sleep 5
                                containers_running=$(docker ps -f name=poem-react-tests -f status=running -q)
                                if [ ! -z "$containers_running" ]
                                then
                                    docker exec -i poem-react-tests /home/jenkins/poem-install.sh
                                    break
                                else
                                    echo "not running"
                                fi
                            done
                            exit 0
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
                                    docker exec -i poem-react-tests /home/jenkins/execute-backend-tests.sh
                                    echo "running"
                                    break
                                else
                                    echo "not running"
                                fi
                            done
                            exit 0
                        '''
                        echo 'Gathering results...'
                        cobertura coberturaReportFile: 'poem-react/coverage-backend.xml'
                    }
                    catch (Exception err)
                    {
                        echo 'Failed...'
                        echo err.toString()
                    }
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
                                    docker exec -i poem-react-tests /home/jenkins/execute-frontend-tests.sh
                                    echo "running"
                                    break
                                else
                                    echo "not running"
                                fi
                            done
                            exit 0
                        '''
                        echo 'Gathering results...'
                        cobertura coberturaReportFile: 'poem-react/coverage-frontend/coverage-final.xml'
                    }
                    catch (Exception err)
                    {
                        echo 'Failed...'
                        echo err.toString()
                    }
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
    post {
        always {
            cleanWs()
        }
    }
}
