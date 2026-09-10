pipeline {
    agent any

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['staging', 'prod'], description: 'Deployment target')
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag to deploy')
    }

    environment {
        DOCKERHUB_CREDS = 'dockerhub-creds'
        DOCKER_USER = 'mohityadv'
        KUBE_CREDENTIALS = 'k8s-credentials'
        APP_NAME = 'docnest'
        DEPLOY_NAMESPACE = "${params.ENVIRONMENT}"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Mohit-Y-Kumar/DocNest.git'
            }
        }

        stage('Test') {
            steps {
                sh 'cd backend && npm test'
            }
        }

        stage('Build Images') {
            steps {
                script {
                    def backendImage = "${DOCKER_USER}/docnest-backend:${params.IMAGE_TAG}"
                    def frontendImage = "${DOCKER_USER}/docnest-frontend:${params.IMAGE_TAG}"
                    def adminImage = "${DOCKER_USER}/docnest-admin:${params.IMAGE_TAG}"

                    sh "docker build -t ${backendImage} ./backend"

                    sh "docker build --build-arg VITE_BACKEND_URL=https://api.${params.ENVIRONMENT}.docnest.example.com --build-arg VITE_RAZORPAY_KEY_ID=${env.RAZORPAY_KEY_ID ?: 'PLACEHOLDER'} -t ${frontendImage} ./frontend"
                    sh "docker build --build-arg VITE_BACKEND_URL=https://api.${params.ENVIRONMENT}.docnest.example.com -t ${adminImage} ./admin"
                }
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: DOCKERHUB_CREDS, usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh 'echo "$PASS" | docker login -u "$USER" --password-stdin'
                    sh "docker push ${DOCKER_USER}/docnest-backend:${params.IMAGE_TAG}"
                    sh "docker push ${DOCKER_USER}/docnest-frontend:${params.IMAGE_TAG}"
                    sh "docker push ${DOCKER_USER}/docnest-admin:${params.IMAGE_TAG}"
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: KUBE_CREDENTIALS, variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        mkdir -p "$HOME/.kube"
                        cp "$KUBECONFIG_FILE" "$HOME/.kube/config"
                        chmod 600 "$HOME/.kube/config"
                        kubectl apply -f k8s/namespaces.yaml
                        kubectl -n "$DEPLOY_NAMESPACE" apply -f k8s/configmap.yaml
                        kubectl -n "$DEPLOY_NAMESPACE" apply -f k8s/backend-deployment.yaml
                        kubectl -n "$DEPLOY_NAMESPACE" apply -f k8s/backend-service.yaml
                        kubectl -n "$DEPLOY_NAMESPACE" apply -f k8s/frontend-deployment.yaml
                        kubectl -n "$DEPLOY_NAMESPACE" apply -f k8s/frontend-service.yaml
                        kubectl -n "$DEPLOY_NAMESPACE" apply -f k8s/admin-deployment.yaml
                        kubectl -n "$DEPLOY_NAMESPACE" apply -f k8s/admin-service.yaml
                        kubectl -n "$DEPLOY_NAMESPACE" apply -f k8s/ingress.yaml
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "DocNest ${params.ENVIRONMENT} deployment succeeded."
        }
        failure {
            echo "DocNest ${params.ENVIRONMENT} deployment failed."
        }
    }
}