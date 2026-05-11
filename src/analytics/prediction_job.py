from pyspark.sql import SparkSession
from pyspark.ml.regression import LinearRegression
from pyspark.ml.feature import VectorAssembler
from pyspark.sql.functions import col, unix_timestamp

def run_prediction():
    spark_session = SparkSession.builder \
        .appName("DWH-Finance-Prediction") \
        .config("spark.mongodb.read.connection.uri", "mongodb://localhost:27017/dwh_finance.exchangerecords") \
        .config("spark.mongodb.write.connection.uri", "mongodb://localhost:27017/dwh_finance.prediction_results") \
        .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:10.1.1") \
        .getOrCreate()

    data_frame = spark_session.read.format("mongodb").load()

    
    
    
    
    training_data = data_frame.select(
        unix_timestamp(col("timestamp")).alias("label_time"),
        col("data.close").cast("double").alias("label")
    ).dropna()

    vector_assembler = VectorAssembler(inputCols=["label_time"], outputCol="features")
    feature_data_frame = vector_assembler.transform(training_data)

    linear_regression = LinearRegression(featuresCol="features", labelCol="label")
    prediction_model = linear_regression.fit(feature_data_frame)

    
    
    predictions = prediction_model.transform(feature_data_frame)

    predictions.select("label_time", "label", "prediction") \
        .write.format("mongodb") \
        .mode("overwrite") \
        .option("collection", "price_predictions") \
        .save()

    print("Prediction job completed successfully.")
    spark_session.stop()

if __name__ == "__main__":
    run_prediction()
