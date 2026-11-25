pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_NAME = 'dashboard-licencias-sap'
        APP_URL = 'http://localhost:8081'
    }

    stages {
        stage('1. Obtener codigo') {
            steps {
                checkout scm
                echo 'Codigo descargado desde el repositorio configurado en Jenkins.'
            }
        }

        stage('2. Validar estructura') {
            steps {
                bat '''
                    if not exist index.html exit /b 1
                    if not exist css\\styles.css exit /b 1
                    if not exist js\\app.js exit /b 1
                    if not exist Dockerfile exit /b 1
                    if not exist docker-compose.yml exit /b 1
                '''
                echo 'Estructura principal del Dashboard validada.'
            }
        }

        stage('3. Verificar Docker') {
            steps {
                bat 'docker --version'
                bat 'docker compose version'
                bat 'docker info'
            }
        }

        stage('4. Construir imagen') {
            steps {
                bat 'docker build -t %IMAGE_NAME%:%BUILD_NUMBER% .'
                bat 'docker tag %IMAGE_NAME%:%BUILD_NUMBER% %IMAGE_NAME%:latest'
            }
        }

        stage('5. Desplegar con Docker Compose') {
            steps {
                bat 'docker compose -p dashboard-licencias-sap up -d --build --remove-orphans'
            }
        }

        stage('6. Comprobar aplicacion') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $url = $env:APP_URL
                    $ok = $false

                    for ($i = 1; $i -le 30; $i++) {
                        try {
                            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
                            if ($response.StatusCode -eq 200) {
                                $ok = $true
                                break
                            }
                        }
                        catch {
                            Start-Sleep -Seconds 2
                        }
                    }

                    if (-not $ok) {
                        throw "El Dashboard no respondio correctamente en $url"
                    }

                    Write-Host "Dashboard disponible en $url"
                '''
            }
        }
    }

    post {
        success {
            echo 'CI/CD finalizado correctamente. Dashboard desplegado en http://localhost:8081'
        }
        failure {
            echo 'El pipeline fallo. Revisar Console Output para identificar la etapa con errores.'
        }
        always {
            bat 'docker ps'
        }
    }
}
