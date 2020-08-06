pipeline {
    agent any
    options {
        checkoutToSubdirectory('poem-2')
    }
    environment {
        PROJECT_DIR="poem-2"
    }
    stages {
        stage ('Test Centos 7') {
            agent {
                dockerfile {
                    filename "Dockerfile"
                    dir "${PROJECT_DIR}/testenv"
                    args "-u root:root"
                }
            }
            steps {
                sh '''
                    cd ${WORKSPACE}/$PROJECT_DIR/testenv
                    ./setup_test.sh ${WORKSPACE}/$PROJECT_DIR
                    ./execute-tests ${WORKSPACE}/$PROJECT_DIR
                '''
                cobertura coberturaReportFile: '**/coverage.xml'
            }
        }
    }
    post {
        always {
            cleanWs()
        }
    }
} 