pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timestamps()
  }

  environment {
    IMAGE_NAME = 'humans-of-ev'
    CONTAINER_NAME = 'humans-of-ev'
    DATA_VOLUME = 'humans-of-ev-data'
  }

  stages {
    stage('Build') {
      steps {
        sh 'npm ci'
        sh 'npm run build'
        sh 'docker build --pull --tag "$IMAGE_NAME:$BUILD_NUMBER" .'
      }
    }

    stage('Deploy to production') {
      steps {
        withCredentials([file(credentialsId: 'hev-production-env', variable: 'PRODUCTION_ENV_FILE')]) {
          sh '''
              set -eu
              if ! grep -Eq '^SESSION_SECRET=.{32,}$' "$PRODUCTION_ENV_FILE"; then
                echo 'Production environment credential must include a SESSION_SECRET of at least 32 characters.'
                exit 1
              fi
              if ! grep -Eq '^ADMIN_EMAIL=.+$' "$PRODUCTION_ENV_FILE" || ! grep -Eq '^ADMIN_PASSWORD=.{12,}$' "$PRODUCTION_ENV_FILE"; then
                echo 'Production environment credential must include ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.'
                exit 1
              fi
              previous_image="$(docker inspect --format='{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)"
              docker volume create "$DATA_VOLUME" >/dev/null
              docker rm --force "$CONTAINER_NAME" >/dev/null 2>&1 || true
              docker run --detach \\
                --name "$CONTAINER_NAME" \\
                --restart unless-stopped \\
                --env-file "$PRODUCTION_ENV_FILE" \\
                --publish 3001:3001 \\
                --mount "source=$DATA_VOLUME,target=/app/data" \\
                "$IMAGE_NAME:$BUILD_NUMBER" >/dev/null
              for attempt in $(seq 1 30); do
                health="$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)"
                if [ "$health" = healthy ]; then
                  echo 'Production is healthy at http://103.192.198.254:3001.'
                  exit 0
                fi
                sleep 2
              done
              docker logs "$CONTAINER_NAME" || true
              docker rm --force "$CONTAINER_NAME" >/dev/null 2>&1 || true
              if [ -n "$previous_image" ]; then
                docker run --detach --name "$CONTAINER_NAME" --restart unless-stopped \\
                  --env-file "$PRODUCTION_ENV_FILE" --publish 3001:3001 \\
                  --mount "source=$DATA_VOLUME,target=/app/data" "$previous_image" >/dev/null || true
              fi
              echo 'New container did not become healthy; previous image rollback was attempted.'
              exit 1
          '''
        }
      }
    }
  }

  post {
    success {
      echo 'Deployment completed at http://103.192.198.254:3001.'
    }
  }
}
