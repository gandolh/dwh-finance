import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import mongoose from 'mongoose';

let container: StartedMongoDBContainer | undefined;

export async function startMongo(): Promise<void> {
  container = await new MongoDBContainer('mongo:6.0').start();

  await mongoose.connect(container.getConnectionString(), {
    dbName: 'dwh_finance_test',
    directConnection: true,
  });
}

export async function stopMongo(): Promise<void> {
  await mongoose.disconnect();
  await container?.stop();
  container = undefined;
}

export async function clearDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}
