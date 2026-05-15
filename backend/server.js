import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import pharmacyRoutes from "./routes/pharmacy.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pharmacy", pharmacyRoutes);

const PORT = 1000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});