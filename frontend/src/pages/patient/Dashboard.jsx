import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { RiCalendarCheckLine, RiMentalHealthLine, RiRobotLine, RiCapsuleLine } from "react-icons/ri";

export default function PatientDashboard() {
  const { user } = useAuth();

  return (
    <div style={styles.container}>
      <h2 style={styles.greeting}>Рады видеть вас, {user?.fullName}!</h2>
      <p style={styles.sub}>Ваш персональный медицинский кабинет Clinic OS.</p>

      <div style={styles.grid}>
        <Link to="/patient/booking" style={styles.tile}>
          <RiCalendarCheckLine style={styles.icon} />
          <h3 style={styles.tileTitle}>Запись к врачу</h3>
          <p style={styles.tileText}>Запишитесь на прием к нужному специалисту онлайн.</p>
        </Link>

        <Link to="/patient/metrics" style={styles.tile}>
          <RiMentalHealthLine style={styles.icon} />
          <h3 style={styles.tileTitle}>Показатели здоровья</h3>
          <p style={styles.tileText}>Мониторинг давления, сахара, веса и ИМТ.</p>
        </Link>

        <Link to="/patient/ai" style={styles.tile}>
          <RiRobotLine style={styles.icon} />
          <h3 style={styles.tileTitle}>AI Консультант</h3>
          <p style={styles.tileText}>Задайте вопрос нейросети о ваших симптомах.</p>
        </Link>

        <Link to="/patient/medicines" style={styles.tile}>
          <RiCapsuleLine style={styles.icon} />
          <h3 style={styles.tileTitle}>Поиск лекарств</h3>
          <p style={styles.tileText}>Наличие и цены на лекарства в аптеках Казахстана.</p>
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    color: "#fff",
    fontFamily: "'Outfit', sans-serif",
  },
  greeting: {
    fontSize: "32px",
    fontWeight: 700,
    margin: "0 0 8px 0",
  },
  sub: {
    color: "#94a3b8",
    fontSize: "16px",
    margin: "0 0 40px 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "24px",
  },
  tile: {
    background: "rgba(30, 41, 59, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "20px",
    padding: "24px",
    textDecoration: "none",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
  icon: {
    fontSize: "36px",
    color: "#6366f1",
  },
  tileTitle: {
    fontSize: "20px",
    margin: 0,
    fontWeight: 600,
  },
  tileText: {
    fontSize: "14px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: "1.5",
  },
};
