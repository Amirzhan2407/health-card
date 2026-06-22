import express from "express";
import multer from "multer";
import {
  requestSignedUrl,
  uploadVisitDocument,
} from "../controllers/medicalDocumentsController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";
import { authorizeFileAccess, validateUpload } from "../middleware/storagePolicy.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

// Request a temporary signed URL for a private file
// authorizeFileAccess verifies that support/org admin cannot access,
// and patients/doctors can only read files within their boundaries.
router.get("/signed-url", authorizeFileAccess, requestSignedUrl);

// Upload a medical document for a visit (doctor only)
router.post(
  "/upload",
  requireRoles(["doctor"]),
  upload.single("file"),
  validateUpload,
  uploadVisitDocument
);

export default router;
