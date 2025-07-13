import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import pool from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", async (req, res) => {
  let dbStatus = "ok";
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    dbStatus = "error";
  }
  res.json({ status: "ok", db: dbStatus });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
