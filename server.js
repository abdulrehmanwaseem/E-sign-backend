import "dotenv/config";
import { app } from "./app.js";
import { connectToDB } from "./src/config/dbConnection.js";

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Hello World");
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
