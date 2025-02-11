const { MongoClient } = require("mongodb");
const url = "mongodb://localhost:27017";
const dbName = "MeterReader";

async function seedData() {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    const sampleData = [
      ["Meter1", 100, 10],
      ["Meter2", 200, 15],
    ];

    await collection.deleteMany({});
    await collection.insertOne({ meters: sampleData });
    console.log("Sample data inserted successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await client.close();
  }
}

seedData();
