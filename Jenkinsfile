pipeline {
  agent any
  environment {
    APP = 'vulnapp'
    NET = 'sec-net'
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build') {
      steps { sh 'docker build --target run -t $APP .' }
    }
    stage('Test') {
      steps { sh 'docker build --target test -t $APP-test .' }
    }
    stage('Dependencias (npm audit)') {
      steps { sh 'docker run --rm $APP npm audit --audit-level=high || true' }
    }
    stage('Deploy') {
      steps {
        sh '''
          docker network create $NET || true
          docker rm -f $APP || true
          docker run -d --name $APP --network $NET -p 3001:3000 $APP
          sleep 5
        '''
      }
    }
    stage('OWASP ZAP') {
      steps {
        sh '''
          docker rm -f zap || true
          docker run --user root --name zap --network $NET zaproxy/zap-stable \
            sh -c "mkdir -p /zap/wrk && zap-baseline.py -t http://$APP:3000 -r zap-report.html -I"
          docker cp zap:/zap/wrk/zap-report.html .
        '''
        archiveArtifacts artifacts: 'zap-report.html', allowEmptyArchive: true
      }
    }
  }
}
