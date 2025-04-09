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
                bat '''
                    start /b cmd /c "node app\\index.js" 
                    timeout /t 2 >nul
                    for /f "tokens=2" %%i in ('wmic process where "name='node.exe'" get ProcessId ^| findstr [0-9]') do (
                        echo %%i > app.pid
                        goto done
                    )
                    :done
                '''
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
