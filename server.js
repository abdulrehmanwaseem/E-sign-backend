import "dotenv/config";
import { app } from "./app.js";
import { connectToDB } from "./src/config/dbConnection.js";

const PORT = process.env.PORT || 5000;

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
  console.log("Health check endpoint hit");
});

// Server Listener
app.listen(PORT, async () => {
  try {
    await connectToDB();
    console.log(
      `Server is running at port *${PORT} in *${process.env.NODE_ENV} Mode`
    );
  } catch (error) {
    console.error("Failed to connect to database:", error);
  }
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", promise, "reason:", reason);
});
