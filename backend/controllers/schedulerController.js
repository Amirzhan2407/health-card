import { supabase } from "../config/supabaseClient.js";
import { sendEmail } from "../services/emailService.js";

export async function runReminderJob(req, res, next) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const clientSecret = req.headers["x-cron-secret"] || req.query.cron_secret;

    if (!cronSecret || clientSecret !== cronSecret) {
      return res.status(401).json({
        success: false,
        message: "Неавторизованный запрос планировщика. Неверный секретный ключ.",
      });
    }

    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch active appointments (scheduled, confirmed) that haven't sent reminder
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patient:profiles (id, full_name, email, preferred_language),
        doctor:doctors (
          organization_members (
            profiles (full_name)
          )
        ),
        organization:organizations (name)
      `)
      .in("status", ["scheduled", "confirmed"])
      .eq("reminder_sent", false)
      .or(`date.eq.${todayStr},date.eq.${tomorrowStr}`);

    if (error) throw new Error(error.message);

    let sentCount = 0;

    for (const appt of appointments) {
      const [hours, minutes] = appt.time.split(":").map(Number);
      const apptTime = new Date(appt.date);
      apptTime.setHours(hours, minutes, 0, 0);

      // Check if within 24 hours and not in the past
      if (apptTime > now && apptTime <= twentyFourHoursLater) {
        const patient = appt.patient;
        const doctorName = appt.doctor?.organization_members?.profiles?.full_name || "врач";
        const clinicName = appt.organization?.name || "клиника";

        if (patient && patient.email) {
          const lang = patient.preferred_language || "ru";
          
          let subject = "Напоминание о приеме к врачу";
          let text = `Здравствуйте, ${patient.full_name}! Напоминаем, что вы записаны на прием в клинику "${clinicName}" к врачу ${doctorName} на ${appt.date} в ${appt.time}.`;

          if (lang === "kk") {
            subject = "Дәрігер қабылдауы туралы ескерту";
            text = `Сәлеметсіз бе, ${patient.full_name}! "${clinicName}" клиникасындағы дәрігер ${doctorName} қабылдауына ${appt.date} күні сағат ${appt.time}-де жазылғаныңызды есіңізге саламыз.`;
          }

          // Send email
          await sendEmail({
            to: patient.email,
            subject,
            text,
          });

          // Mark reminder_sent = true
          await supabase
            .from("appointments")
            .update({ reminder_sent: true })
            .eq("id", appt.id);

          sentCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Планировщик напоминаний успешно выполнен. Отправлено напоминаний: ${sentCount}`,
      sentCount,
    });
  } catch (error) {
    next(error);
  }
}
