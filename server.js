import "dotenv/config";
import cron from "node-cron";
import fetch from "node-fetch";
import { app } from "./app.js";
import { connectToDB } from "./src/config/dbConnection.js";

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL;

cron.schedule("*/10 * * * *", async () => {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    console.log(
      `Pinged self at ${new Date().toISOString()} - Status: ${res.status}`
    );
  } catch (err) {
    console.error("Error pinging self:", err);
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
