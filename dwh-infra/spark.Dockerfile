# Spark image with Python deps needed by the analytics jobs.
# pyspark.ml (used by prediction_job.py) requires numpy at runtime.
FROM apache/spark:3.5.8-python3

USER root
RUN python3 -m pip install --no-cache-dir numpy==1.26.4
USER spark
