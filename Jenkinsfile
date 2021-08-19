pipeline {
    agent any
    options {
        checkoutToSubdirectory('poem-react')
    }
    environment {
        PROJECT_DIR="poem-react"
    }
    stages {
        stage ('Test Centos 7') {
            agent {
                docker {
                    image 'poem-react-tests'
                    args '-u jenkins:jenkins'
                }
            }
            steps {
                sh '''
                    cd ${WORKSPACE}/$PROJECT_DIR
                    echo foobar
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
