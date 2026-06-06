from pyspark.sql import SparkSession
from pyspark.ml.regression import LinearRegression
from pyspark.ml.feature import VectorAssembler
from pyspark.sql.functions import col, lit, unix_timestamp
from functools import reduce

def run_prediction():
    spark_session = SparkSession.builder \
        .appName("DWH-Finance-Prediction") \
        .config("spark.mongodb.read.connection.uri", "mongodb://mongodb:27017/dwh_finance.exchangerecords") \
        .config("spark.mongodb.write.connection.uri", "mongodb://mongodb:27017/dwh_finance.prediction_results") \
        .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0") \
        .getOrCreate()

    data_frame = spark_session.read.format("mongodb").load()

    # Keep only rows with a usable close price and timestamp. The source mixes
    # schemas (data.price / data.USD docs have no close), so drop those here.
    # Cache the materialized frame: it is read repeatedly below (distinct asset
    # ids, then one filter per asset). Without caching, the MongoDB connector
    # re-reads and re-infers schema on each action, and the cast assetId values
    # do not round-trip, so per-asset filters silently match zero rows.
    base_data_frame = data_frame.select(
        col("assetId").cast("string").alias("assetId"),
        unix_timestamp(col("timestamp")).alias("label_time"),
        col("data.close").cast("double").alias("label")
    ).dropna().cache()

    vector_assembler = VectorAssembler(inputCols=["label_time"], outputCol="features")

    # Train one regression per asset rather than pooling every asset into a
    # single model, which would fit a meaningless line across unrelated price
    # levels. A separate fit per assetId keeps each model on-scale.
    asset_ids = [row["assetId"] for row in base_data_frame.select("assetId").distinct().collect()]

    per_asset_predictions = []
    for asset_id in asset_ids:
        asset_data_frame = base_data_frame.where(col("assetId") == asset_id)

        # A linear fit needs at least two points; skip assets with fewer.
        if asset_data_frame.count() < 2:
            print(f"Skipping asset {asset_id}: not enough data points to fit a model.")
            continue

        feature_data_frame = vector_assembler.transform(asset_data_frame)

        linear_regression = LinearRegression(featuresCol="features", labelCol="label")
        prediction_model = linear_regression.fit(feature_data_frame)

        predictions = prediction_model.transform(feature_data_frame) \
            .select("assetId", "label_time", "label", "prediction")
        per_asset_predictions.append(predictions)

    if not per_asset_predictions:
        print("No assets had enough data to train on; nothing to write.")
        spark_session.stop()
        return

    all_predictions = reduce(lambda a, b: a.unionByName(b), per_asset_predictions)

    all_predictions.write.format("mongodb") \
        .mode("overwrite") \
        .option("collection", "price_predictions") \
        .save()

    print("Prediction job completed successfully.")
    spark_session.stop()

if __name__ == "__main__":
    run_prediction()
