from pyspark.sql import SparkSession
from pyspark.sql.functions import col, year, avg, min, max, count

def run_aggregation():
    spark_session = SparkSession.builder \
        .appName("DWH-Finance-Aggregation") \
        .config("spark.mongodb.read.connection.uri", "mongodb://mongodb:27017/dwh_finance.exchangerecords") \
        .config("spark.mongodb.write.connection.uri", "mongodb://mongodb:27017/dwh_finance.analytics_results") \
        .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0") \
        .getOrCreate()

    data_frame = spark_session.read.format("mongodb").load()

    # Only records carrying the full OHLC payload can be aggregated; the source
    # collection mixes schemas (some docs only have data.price or data.USD), so
    # drop anything missing data.close/high/low to avoid null aggregates.
    ohlc_data_frame = data_frame.where(
        col("data.close").isNotNull()
        & col("data.high").isNotNull()
        & col("data.low").isNotNull()
    )

    aggregated_data_frame = ohlc_data_frame.groupBy("assetId", "providerId", "year") \
        .agg(
            avg("data.close").alias("avg_close"),
            max("data.high").alias("max_high"),
            min("data.low").alias("min_low"),
            count("*").alias("record_count")
        )

    aggregated_data_frame.write.format("mongodb") \
        .mode("overwrite") \
        .option("collection", "analytics_yearly_summary") \
        .save()

    print("Aggregation job completed successfully.")
    spark_session.stop()

if __name__ == "__main__":
    run_aggregation()
