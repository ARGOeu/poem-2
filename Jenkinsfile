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
          script
          {
              testBuildBadge.setStatus('running')
              testBuildBadge.setColor('blue')

              try
              {
                  echo 'Create docker containers...'
                  sh '''
                      cd $WORKSPACE/$PROJECT_DIR/testenv/
                      docker-compose up -d --build
                      return 0
                  '''

                  testBuildBadge.setStatus('passing')
                  testBuildBadge.setColor('brightgreen')
              }
              catch (Exception err)
              {
                  testBuildBadge.setStatus('failing')
                  testBuildBadge.setColor('red')
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
