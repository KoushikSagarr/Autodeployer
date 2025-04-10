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
                    REM Kill any process using port 3001 (if already running)
                    FOR /F "tokens=5" %%a IN ('netstat -ano ^| findstr :3001') DO taskkill /F /PID %%a

                    REM Start the app on port 3001 in the background
                    start /b cmd /c "set PORT=3001 && node app\\index.js"

                    REM Wait a few seconds for the app to boot up
                    ping 127.0.0.1 -n 5 >nul

                    REM Get the PID of the node process and save it
                    for /f "tokens=2" %%i in ('wmic process where "name=\'node.exe\'" get ProcessId ^| findstr [0-9]') do (
                        echo %%i > app.pid
                        goto done
                    )
                    :done
                '''
            }
        }

        stage('Run Health Test') {
            steps {
                bat 'curl --fail http://localhost:3001/health || exit /b 1'
            }
        }

        stage('Stop App') {
            steps {
                bat '''
                    if exist app.pid (
                        set /p PID=<app.pid
                        taskkill /F /PID %PID%
                        del app.pid
                    )
                '''
            }
        }

        stage('Docker Build') {
            steps {
                bat 'docker build -t autodeployer-app .'
            }
        }

        stage('Mock Deploy') {
            steps {
                echo 'Simulating deployment...'
                bat 'echo "Deploying to mock environment..."'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed! Check logs above.'
        }
        always {
            echo 'Cleaning up...'
        }
    }
}
