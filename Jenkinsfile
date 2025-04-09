pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Run App') {
            steps {
                bat 'start /b node app\\index.js > output.log 2>&1 && echo !ERRORLEVEL! > app.pid'
                sleep time: 5, unit: 'SECONDS'
            }
        }

        stage('Run Health Test') {
            steps {
                bat 'test\\health-test.bat'
            }
        }

        stage('Stop App') {
            steps {
                bat '''
                for /F %%i in (app.pid) do taskkill /PID %%i /F
                '''
            }
        }

        stage('Docker Build') {
            when {
                expression { currentBuild.resultIsBetterOrEqualTo('SUCCESS') }
            }
            steps {
                echo 'Would build Docker image here'
            }
        }

        stage('Mock Deploy') {
            when {
                expression { currentBuild.resultIsBetterOrEqualTo('SUCCESS') }
            }
            steps {
                echo 'Would deploy to server here'
            }
        }
    }
}
