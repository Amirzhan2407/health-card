import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import pharmacyRoutes from "./routes/pharmacy.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});