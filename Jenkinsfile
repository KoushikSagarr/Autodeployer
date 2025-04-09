pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Run App') {
            steps {
                bat '''
                    REM Kill any process using port 3000 (if already running)
                    FOR /F "tokens=5" %%a IN ('netstat -ano ^| findstr :3000') DO taskkill /F /PID %%a

                    REM Start app in background
                    start /b cmd /c "node app\\index.js"

                    REM Wait a few seconds for app to boot up
                    timeout /t 2 >nul

                    REM Get PID of node process and save to app.pid
                    for /f "tokens=2" %%i in ('wmic process where "name=\'node.exe\'" get ProcessId ^| findstr [0-9]') do (
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
                    REM Stop app using PID from app.pid
                    for /F %%i in (app.pid) do taskkill /PID %%i /F
                '''
            }
        }

        stage('Docker Build') {
            steps {
                bat 'docker build -t autodeployer:latest .'
            }
        }

        stage('Mock Deploy') {
            steps {
                echo 'Mock deployment stage - this is where real deployment would happen.'
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed! Check logs above.'
        }
        success {
            echo 'Pipeline completed successfully!'
        }
    }
}
