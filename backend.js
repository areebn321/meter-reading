const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 8000;
const url = "mongodb://localhost:27017";
// const url = `mongodb+srv://areebnadir3:uFnLZXY43pCFLLkd@cluster0.utvvj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const dbName = "MeterReader";

app.use(cors());
app.use(express.json()); // ✅ Allows handling JSON request bodies

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ✅ POST Route: Adds meter data to DB
app.post("/meterDataToDb", async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Invalid meter data" });
    }

    await collection.deleteMany({}); // Clear previous data
    // Initialize both meters and corresponding empty readings arrays
    await collection.insertOne({
      meters: req.body,
      readings: req.body.map(() => []),
    });

    res.json({ message: "Meter data added successfully!" });
  } catch (error) {
    console.error("Error adding data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
});

// ✅ POST Route: Updates meter data in DB
app.post("/updateMeterData", async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    if (typeof req.body.index !== "number" || !req.body.data) {
      return res.status(400).json({ error: "Invalid meter data" });
    }

    const result = await collection.updateOne(
      {},
      { $set: { [`meters.${req.body.index}`]: req.body.data } }
    );

    // Consider the update successful if a document was matched
    if (result.matchedCount === 0) {
      throw new Error("Failed to update meter data");
    }

    res.json({ message: "Meter data updated successfully!" });
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
});

// New POST Route: Appends a meter reading to the corresponding meter
app.post("/updateMeterReading", async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    if (typeof req.body.index !== "number" || !req.body.reading) {
      return res.status(400).json({ error: "Invalid meter reading data" });
    }

    // Ensure the readings array at this index is initialized
    const doc = await collection.findOne({});
    if (!doc.readings || !Array.isArray(doc.readings)) {
      return res.status(500).json({ error: "Invalid readings structure" });
    }
    // If the current meter's readings field is missing or not an array, set it to an empty array
    if (
      !doc.readings[req.body.index] ||
      !Array.isArray(doc.readings[req.body.index])
    ) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { [`readings.${req.body.index}`]: [] } }
      );
    }

    const result = await collection.updateOne(
      {},
      { $push: { [`readings.${req.body.index}`]: req.body.reading } }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Failed to update meter reading");
    }
    res.json({ message: "Meter reading added successfully!" });
  } catch (error) {
    console.error("Error updating meter reading:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
});

// New POST Route: Appends a new meter and its empty readings array to DB
app.post("/appendMeter", async (req, res) => {
  const client = new MongoClient(url);
  try {
    const newMeter = req.body.newMeter;
    if (!newMeter || !Array.isArray(newMeter) || newMeter.length === 0) {
      return res.status(400).json({ error: "Invalid new meter data" });
    }
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    // Fetch existing document to ensure 'readings' is an array
    let doc = await collection.findOne({});
    if (doc && doc.readings && !Array.isArray(doc.readings)) {
      await collection.updateOne({ _id: doc._id }, { $set: { readings: [] } });
    }

    const result = await collection.updateOne(
      {},
      {
        $push: {
          meters: newMeter,
          readings: [], // push an empty array as new meter's readings
        },
      },
      { upsert: true }
    );
    if (result.matchedCount === 0 && !result.upsertedCount) {
      throw new Error("Failed to append new meter");
    }
    res.json({ message: "New meter appended successfully!" });
  } catch (error) {
    console.error("Error appending meter:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
});

// New POST Route: Update a meter's basic information
app.post("/updateMeter", async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const { index, newMeter } = req.body;
    if (
      typeof index !== "number" ||
      !Array.isArray(newMeter) ||
      newMeter.length < 3
    ) {
      return res.status(400).json({ error: "Invalid meter data" });
    }
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    const result = await collection.updateOne(
      {},
      { $set: { [`meters.${index}`]: newMeter } }
    );
    if (result.matchedCount === 0) {
      throw new Error("Failed to update meter");
    }
    res.json({ message: "Meter updated successfully!" });
  } catch (error) {
    console.error("Error updating meter:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
});

// New POST Route: Delete a meter and its readings
app.post("/deleteMeter", async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const { meterIndex } = req.body;
    if (typeof meterIndex !== "number") {
      return res.status(400).json({ error: "Invalid meter index" });
    }
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    // Fetch current document
    const doc = await collection.findOne({});
    if (!doc || !Array.isArray(doc.meters) || !Array.isArray(doc.readings)) {
      return res.status(500).json({ error: "Invalid data structure" });
    }
    // Remove meter at meterIndex
    doc.meters.splice(meterIndex, 1);
    doc.readings.splice(meterIndex, 1);

    const result = await collection.replaceOne({}, doc);
    if (result.modifiedCount === 0) {
      throw new Error("Failed to delete meter");
    }
    res.json({ message: "Meter deleted successfully!" });
  } catch (error) {
    console.error("Error deleting meter:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
});

// ✅ GET Route: Fetches meter data (meters and readings) from DB
app.get("/meterDataToDb", async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    const result = await collection.findOne({});
    // If no data exists, return empty arrays for meters and readings.
    if (!result || !result.meters) {
      return res.json({ meters: [], readings: [] });
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
});

app.post("/deleteMeterReading", async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const { meterIndex, readingIndex } = req.body;
    if (typeof meterIndex !== "number" || typeof readingIndex !== "number") {
      return res.status(400).json({ error: "Invalid parameters" });
    }
    const db = client.db(dbName);
    const collection = db.collection("meterData");

    let doc = await collection.findOne({});
    if (!doc || !doc.readings || !Array.isArray(doc.readings)) {
      return res.status(500).json({ error: "Invalid readings structure" });
    }
    if (!doc.readings[meterIndex] || !Array.isArray(doc.readings[meterIndex])) {
      return res
        .status(400)
        .json({ error: "Specified meter reading not found" });
    }

    // Remove the reading at readingIndex
    const updatedReadings = doc.readings[meterIndex].filter(
      (_, idx) => idx !== readingIndex
    );

    const result = await collection.updateOne(
      {},
      { $set: { [`readings.${meterIndex}`]: updatedReadings } }
    );
    if (result.modifiedCount === 0) {
      throw new Error("Failed to delete meter reading");
    }
    res.json({ message: "Meter reading deleted successfully!" });
  } catch (error) {
    console.error("Error deleting meter reading:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
