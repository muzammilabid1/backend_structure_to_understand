#!/bin/bash
# Creates and starts a minio instance, then sets up the public bucket if it doesn't already exist
set -e

# MinIO no longer publishes the minio/minio and minio/mc images (Docker Hub and quay.io both refuse the
# pull), so we use the pgsty community rebuild of the same binaries. Pinned so an upstream change can't
# break CI without a commit here.
MINIO_IMAGE=pgsty/minio:RELEASE.2026-08-04T00-00-00Z
MC_IMAGE=pgsty/mc:RELEASE.2026-09-16T00-00-00Z

# set -e would otherwise fail on the name clash when a developer already has minio running
if [ -z "$(docker ps -q -f name=^lwp-minio$)" ]; then
  docker run --rm -d --name lwp-minio -p 9000:9000 -v $PWD/seed-data/minio-base:/data -e MINIO_ROOT_USER=$ULTIMA_BUCKET_ACCESS_KEY_ID -e MINIO_ROOT_PASSWORD=$ULTIMA_BUCKET_ACCESS_KEY_SECRET -e MINIO_BROWSER=off $MINIO_IMAGE server /data
fi
# adapted from https://github.com/minio/minio/issues/4769
docker run --rm --link lwp-minio:minio --entrypoint sh $MC_IMAGE -c "\
  echo 'Waiting for minio to startup...' && \
  (until (mc alias set local http://minio:9000 $ULTIMA_BUCKET_ACCESS_KEY_ID $ULTIMA_BUCKET_ACCESS_KEY_SECRET) do echo '.' && sleep 1; done;) && \
  mc ping -x local && \
  mc mb local/public --ignore-existing
  mc mb local/usermedia --ignore-existing && \
  mc anonymous set download local/public"
