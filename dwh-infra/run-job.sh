#!/usr/bin/env bash
# Run a PySpark analytics job on the dockerized Spark cluster.
#
# Usage:
#   ./run-job.sh aggregation_job.py     # run a specific job
#   ./run-job.sh                        # defaults to aggregation_job.py
#
# The job file must live under src/analytics/ (mounted into the
# spark-master container at /opt/dwh/src/analytics).
set -euo pipefail

JOB="${1:-aggregation_job.py}"
MASTER_CONTAINER="dwh_spark_master"
MONGO_CONNECTOR="org.mongodb.spark:mongo-spark-connector_2.12:10.3.0"

if ! docker ps --format '{{.Names}}' | grep -q "^${MASTER_CONTAINER}$"; then
  echo "Error: ${MASTER_CONTAINER} is not running. Start it with: docker compose up -d" >&2
  exit 1
fi

exec docker exec -e HOME=/tmp "${MASTER_CONTAINER}" /opt/spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  --conf spark.jars.ivy=/tmp/.ivy2 \
  --packages "${MONGO_CONNECTOR}" \
  "/opt/dwh/src/analytics/${JOB}"
