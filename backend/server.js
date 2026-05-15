import express from "express";
import aiRoutes from "./routes/ai.js";
import cors from "cors";
import dotenv from "dotenv";

import pharmacyRoutes from "./routes/pharmacy.js";
app.use("/api/ai", aiRoutes);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pharmacy", pharmacyRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});