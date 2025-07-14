pipeline {
    agent any
    options {
        checkoutToSubdirectory('poem-react')
        skipStagesAfterUnstable()
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
                            docker-compose up -d --build
                            let i=1
                            while (( $i <= 5 ))
                            do
                                sleep 5
                                container_web_running=$(docker ps -f name=poem-react-tests-webapp -f status=running -q)
                                container_db_running=$(docker ps -f name=poem-react-tests-postgres16 -f status=running -q)
                                if [[ ! -z "$container_web_running" && ! -z "$container_db_running" ]]
                                then
                                    docker exec -i poem-react-tests-webapp /home/jenkins/poem-install.sh
                                    exit $?
                                else
                                    echo "not running"
                                fi
                                (( i++ ))
                            done
                            exit 1
                        '''
                    }
                    catch (Exception err)
                    {
                        echo 'Failed preparation of containers...'
                        echo err.toString()
                        sh 'exit 1'
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
                                    sleep 5
                                    containers_running=$(docker ps -f name=poem-react-tests -f status=running -q)
                                    if [ ! -z "$containers_running" ]
                                    then
                                        echo "Backend container running"
                                        docker exec -i poem-react-tests-webapp /home/jenkins/execute-backend-tests.sh
                                        exit $?
                                    else
                                        echo "not running"
                                        exit 1
                                    fi
                                '''
                            }
                            catch (Exception err)
                            {
                                echo 'Backend tests failed...'
                                echo err.toString()
                                sh 'exit 1'
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
                                    sleep 5
                                    containers_running=$(docker ps -f name=poem-react-tests -f status=running -q)
                                    if [ ! -z "$containers_running" ]
                                    then
                                        echo "Frontend container running"
                                        docker exec -i poem-react-tests-webapp /home/jenkins/execute-frontend-tests.sh
                                        exit $?
                                    else
                                        echo "not running"
                                        exit 1
                                    fi
                                '''
                            }
                            catch (Exception err)
                            {
                                echo 'Frontend tests failed...'
                                echo err.toString()
                                sh 'exit 1'
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
    }
    post {
        always {
            echo 'Teardown containers...'
            sh '''
              cd $WORKSPACE/$PROJECT_DIR/testenv/
              docker-compose down
            '''
            cleanWs()
        }
    }
}
