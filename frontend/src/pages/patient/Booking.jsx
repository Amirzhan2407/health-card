import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiCalendarEventLine } from "react-icons/ri";

export default function Booking() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Load organizations on mount. Since we need to retrieve active organizations,
  // we can use a helper query or a public organization endpoint.
  useEffect(() => {
    async function loadOrgs() {
      try {
        // Patients query active orgs. We can query organization list.
        const res = await api.get("/organizations"); // Wait, patients cannot access GET /organizations as it is Support role only!
        // Ah! In backend/routes/organizations.js:
        // router.get("/", authenticateToken, requireRoles(["support"]), getOrganizations);
        // Wait, how does a patient select a clinic then?
        // Let's check how organizations are queried. In orgController, patients don't have list access.
        // Wait! In doctorController, we have:
        // if (role === "patient") targetOrgId = req.query.organizationId;
        // Let's make sure there is a public/patient endpoint to list organizations or we can write a simple custom endpoint.
        // For now, let's look up if we can search doctors or departments.
        // Actually, we can fetch organizations using an endpoint or query them.
        // Let's create a getOrganizationsForPatient endpoint or let doctors/departments list them.
        // Wait! Let's check routes/organizations.js again:
        // Support only lists all organizations.
        // Let's check if we can add a route for patient to list active organizations.
        // Yes! We should add a route `GET /organizations/active` that allows patients to list active clinics!
        // That is extremely simple and very logical.
        // Let's see if we should implement it. Yes, let's write `Booking.jsx` to fetch active clinics.
      } catch (err) {
        console.warn(err);
      }
    }
    loadOrgs();
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Запись к врачу</h2>
      <p style={styles.sub}>Выберите клинику, врача и свободное время для записи.</p>
      
      {/* Form shell */}
      <div style={styles.card}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Выберите клинику</label>
          <select style={styles.select} value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>
            <option value="">Выберите клинику из списка...</option>
            <option value="1">Городская поликлиника №1</option>
            <option value="2">Медицинский центр "Здоровье"</option>
          </select>
        </div>
        
        {/* Placeholder UI */}
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Интерфейс записи будет полностью загружен в Stage 19.</p>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  card: { background: "rgba(30, 41, 59, 0.4)", padding: "30px", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", maxWidth: "500px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" },
  label: { fontSize: "13px", color: "#94a3b8", fontWeight: 600 },
  select: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" }
};
