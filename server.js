import "dotenv/config";
import cron from "node-cron";
import fetch from "node-fetch";
import { app } from "./app.js";
import { connectToDB } from "./src/config/dbConnection.js";
import { deleteExpiredFreeUserDocuments } from "./src/utils/deleteExpiredRetentionDocs.js";

const PORT = process.env.PORT || 5000;
const API_URL = process.env.API_URL;

// Ping self every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  try {
    const res = await fetch(`${API_URL}/health`);
    console.log(
      `Pinged self at ${new Date().toISOString()} - Status: ${res.status}`
    );
  } catch (err) {
    console.error("Error pinging self:", err);
  }
});

// Delete expired documents for FREE users once per day at 3:00 AM
cron.schedule("0 3 * * *", async () => {
  try {
    await deleteExpiredFreeUserDocuments();
  } catch (err) {
    console.error("Error deleting expired documents:", err);
  }
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Server Listener
app.listen(PORT, () => {
  connectToDB();
  console.log(
    `Server is running at port *${PORT} in *${process.env.NODE_ENV}Mode`
  );
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", promise, "reason:", reason);
});
