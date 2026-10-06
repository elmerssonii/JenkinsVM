pipeline {
    agent any
    stages {
	stage('Unit Tests') {
		steps {
		sh '''
		docker run --rm \
		-v "$WORKSPACE":/app \
		-w /app \
		node:20-bookworm \
		sh -c "npm install && npm test"
		'''
		}
	}

        stage('Checkout') {
            steps {
                sh 'git pull origin main'
            }
        }
        stage('Build') {
            steps {
                sh 'docker build --pull --rm -f "Dockerfile" -t blog:latest "."'
            }
        }
        stage('Run') {
            steps {
                sh 'docker stop blog || true'
                sh 'docker rm blog || true'
                sh 'docker run -d -p 3000:3000 --name blog blog'
            }
        }

	stage('Update Trivy DB') {
		steps {
		sh '''
		trivy image \
		--cache-dir /var/lib/jenkins/.cache/trivy \
		--timeout 200m \
		--download-db-only
		'''
		}
	}
	stage('Trivy Scan') {
		steps {
		sh'''
		trivy image \
		--cache-dir /var/lib/jenkins/.cache/trivy \
		--skip-db-update \
		--format table \
		--output "$WORKSPACE/trivy-report.txt" \
		blog:latest
		'''
		}
	}
	stage('OWASP Dependency Check') {
	steps {
	dependencyCheck(
	odcInstallation: 'OWASP-DC',
	additionalArguments: '--scan .'
	)

	dependencyCheckPublisher(
	pattern:'**/dependency-check-report.xml'
	)
	}
	}

	stage('Nikto Scan') {
	steps {
	sh '''
	docker run --rm --network host \
	hackllc/nikto \
	-h http://127.0.0.1:3000
	'''
	}
	}
    }
}

