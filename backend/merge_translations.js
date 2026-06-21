import fs from 'fs';
import path from 'path';

const filePath = 'C:/dev/health-card/frontend/src/i18n/translations.js';
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Let's define the new translation keys to merge
  const newKeys = {
    cabinetTitleAdmin: {
      ru: "Кабинет администратора",
      kz: "Администратор кабинеті",
      en: "Admin Dashboard"
    },
    cabinetTitleDoctor: {
      ru: "Кабинет врача",
      kz: "Дәрігер кабинеті",
      en: "Doctor Dashboard"
    },
    orgTab: {
      ru: "Главная",
      kz: "Басты бет",
      en: "Main"
    },
    doctorsTab: {
      ru: "Врачи",
      kz: "Дәрігерлер",
      en: "Doctors"
    },
    deptsTab: {
      ru: "Отделения и кабинеты",
      kz: "Бөлімшелер мен кабинеттер",
      en: "Departments & Rooms"
    },
    schedulesTab: {
      ru: "Графики врачей",
      kz: "Дәрігерлер кестесі",
      en: "Doctor Schedules"
    },
    absencesTab: {
      ru: "Отсутствия и блокировки",
      kz: "Қатыспау және блоктау",
      en: "Absences & Blocks"
    },
    transfersTab: {
      ru: "Перенос записей",
      kz: "Жазбаларды ауыстыру",
      en: "Transfer Appointments"
    },
    notificationsTab: {
      ru: "Уведомления",
      kz: "Хабарландырулар",
      en: "Notifications"
    },
    supportTab: {
      ru: "Чат с техподдержкой",
      kz: "Техникалық қолдау чаты",
      en: "Support Chat"
    },
    dashboardTab: {
      ru: "Главная",
      kz: "Басты бет",
      en: "Main"
    },
    appointmentsTab: {
      ru: "Записи",
      kz: "Жазылулар",
      en: "Appointments"
    },
    historyTab: {
      ru: "История посещений",
      kz: "Қабылдау тарихы",
      en: "Visit History"
    },
    profileTab: {
      ru: "Мой профиль",
      kz: "Менің профилім",
      en: "My Profile"
    },
    logoutButton: {
      ru: "Выйти",
      kz: "Шығу",
      en: "Logout"
    },
    orgName: {
      ru: "Название организации",
      kz: "Ұйым атауы",
      en: "Organization Name"
    },
    totalDoctors: {
      ru: "Количество врачей",
      kz: "Дәрігерлер саны",
      en: "Total Doctors"
    },
    activeDoctors: {
      ru: "Количество активных врачей",
      kz: "Белсенді дәрігерлер саны",
      en: "Active Doctors"
    },
    absentDoctors: {
      ru: "Временно отсутствующие врачи",
      kz: "Уақытша келмеген дәрігерлер",
      en: "Absent Doctors"
    },
    totalDepts: {
      ru: "Количество отделений",
      kz: "Бөлімшелер саны",
      en: "Total Departments"
    },
    todayAppointments: {
      ru: "Записи на сегодня",
      kz: "Бүгінгі жазылулар",
      en: "Today's Appointments"
    },
    futureAppointments: {
      ru: "Количество будущих записей",
      kz: "Болашақ жазылулар саны",
      en: "Future Appointments"
    },
    transfersNeeded: {
      ru: "Требуют переноса",
      kz: "Ауыстыруды талап етеді",
      en: "Transfers Required"
    },
    recentActions: {
      ru: "Последние действия администратора",
      kz: "Әкімшінің соңғы әрекеттері",
      en: "Recent Admin Actions"
    },
    quickAddDoctor: {
      ru: "Добавить врача",
      kz: "Дәрігерді қосу",
      en: "Add Doctor"
    },
    quickSetSchedule: {
      ru: "Настроить график",
      kz: "Кестені реттеу",
      en: "Set Schedule"
    },
    quickAddDept: {
      ru: "Добавить отделение",
      kz: "Бөлімшені қосу",
      en: "Add Department"
    },
    quickOpenTransfers: {
      ru: "Открыть перенос записей",
      kz: "Ауыстыруларды ашу",
      en: "Open Transfers"
    },
    quickContactSupport: {
      ru: "Написать в техподдержку",
      kz: "Қолдау қызметіне жазу",
      en: "Contact Support"
    },
    fullName: {
      ru: "ФИО",
      kz: "Т.Ә.Ә.",
      en: "Full Name"
    },
    birthDate: {
      ru: "Дата рождения",
      kz: "Туған күні",
      en: "Date of Birth"
    },
    age: {
      ru: "Возраст",
      kz: "Жасы",
      en: "Age"
    },
    specialty: {
      ru: "Специальность",
      kz: "Мамандығы",
      en: "Specialty"
    },
    cabinet: {
      ru: "Кабинет",
      kz: "Кабинет",
      en: "Room"
    },
    rating: {
      ru: "Рейтинг",
      kz: "Рейтинг",
      en: "Rating"
    },
    actions: {
      ru: "Действия",
      kz: "Әрекеттер",
      en: "Actions"
    },
    editData: {
      ru: "Редактировать данные",
      kz: "Деректерді өңдеу",
      en: "Edit Details"
    },
    grantAccess: {
      ru: "Выдать доступ",
      kz: "Рұқсат беру",
      en: "Grant Access"
    },
    resetPassword: {
      ru: "Сбросить пароль",
      kz: "Құпия сөзді қайта орнату",
      en: "Reset Password"
    },
    setPlannedAbsence: {
      ru: "Плановое отсутствие",
      kz: "Жоспарлы келмеу",
      en: "Planned Absence"
    },
    setEmergencyAbsence: {
      ru: "Экстренное отсутствие",
      kz: "Шұғыл келмеу",
      en: "Emergency Absence"
    },
    blockDoctor: {
      ru: "Заблокировать",
      kz: "Блоктау",
      en: "Block"
    },
    unblockDoctor: {
      ru: "Разблокировать",
      kz: "Блоктан шығару",
      en: "Unblock"
    },
    archiveDoctor: {
      ru: "В архив",
      kz: "Архивке салу",
      en: "Archive"
    },
    schedulePeriod: {
      ru: "Период действия графика",
      kz: "Кестенің қолданылу мерзімі",
      en: "Schedule Validity Period"
    },
    scheduleStart: {
      ru: "Дата начала графика",
      kz: "Басталу күні",
      en: "Schedule Start Date"
    },
    scheduleEnd: {
      ru: "Дата окончания графика",
      kz: "Аяқталу күні",
      en: "Schedule End Date"
    },
    workDaysWeek: {
      ru: "Рабочие дни недели",
      kz: "Жұмыс күндері",
      en: "Work Days of the Week"
    },
    selectAllDays: {
      ru: "Выбрать все дни",
      kz: "Барлық күнді таңдау",
      en: "Select All Days"
    },
    applyTimeToAll: {
      ru: "Применить одинаковое время ко всем выбранным дням",
      kz: "Барлық таңдалған күндерге бірдей уақытты қолдану",
      en: "Apply same time to all selected days"
    },
    lunchBreak: {
      ru: "Обед",
      kz: "Түскі үзіліс",
      en: "Lunch Break"
    },
    slotDurationLabel: {
      ru: "Продолжительность одной записи",
      kz: "Бір жазылу ұзақтығы",
      en: "Single Appointment Duration"
    },
    minutes: {
      ru: "минут",
      kz: "минут",
      en: "minutes"
    },
    exceptionsTabLabel: {
      ru: "Исключения из обычного графика",
      kz: "Қалыпты кестеден тыс ерекшеліктер",
      en: "Schedule Exceptions (Specific Dates)"
    },
    addExceptionBtn: {
      ru: "Добавить исключение",
      kz: "Ерекшелік қосу",
      en: "Add Exception"
    },
    absenceReason: {
      ru: "Причина отсутствия",
      kz: "Келмеу себебі",
      en: "Reason for Absence"
    },
    vacation: {
      ru: "Отпуск",
      kz: "Демалыс",
      en: "Vacation"
    },
    businessTrip: {
      ru: "Командировка",
      kz: "Іссапар",
      en: "Business Trip"
    },
    training: {
      ru: "Обучение",
      kz: "Оқу",
      en: "Training"
    },
    sickness: {
      ru: "Болезнь",
      kz: "Ауыру",
      en: "Sickness"
    },
    emergencyBlock: {
      ru: "Экстренная блокировка",
      kz: "Шұғыл блоктау",
      en: "Emergency Block"
    },
    otherAbsence: {
      ru: "Другое",
      kz: "Басқа себеп",
      en: "Other"
    },
    commentLabel: {
      ru: "Комментарий",
      kz: "Түсініктеме",
      en: "Comment"
    },
    startVisit: {
      ru: "Начать приём",
      kz: "Қабылдауды бастау",
      en: "Start Reception"
    },
    patientNotArrived: {
      ru: "Пациент не пришёл",
      kz: "Пациент келмеді",
      en: "Patient Did Not Show"
    },
    scanQrOrCode: {
      ru: "Сканируйте QR-код или введите цифровой код пациента",
      kz: "QR-кодты сканерлеңіз немесе пациенттің сандық кодын енгізіңіз",
      en: "Scan QR code or enter patient code"
    },
    complaints: {
      ru: "Жалобы",
      kz: "Шағымдар",
      en: "Complaints"
    },
    symptomsLabel: {
      ru: "Симптомы",
      kz: "Симптомдар",
      en: "Symptoms"
    },
    diagnosisLabel: {
      ru: "Диагноз",
      kz: "Диагноз",
      en: "Diagnosis"
    },
    treatmentLabel: {
      ru: "Лечение",
      kz: "Емдеу",
      en: "Treatment"
    },
    recommendationsLabel: {
      ru: "Рекомендации",
      kz: "Ұсыныстар",
      en: "Recommendations"
    },
    finishVisit: {
      ru: "Завершить приём",
      kz: "Қабылдауды аяқтау",
      en: "Finish Visit"
    },
    issueCert: {
      ru: "Выписать справку",
      kz: "Анықтама жазып беру",
      en: "Issue Certificate"
    },
    ratingDist: {
      ru: "Распределение оценок",
      kz: "Бағалардың таралуы",
      en: "Rating Distribution"
    },
    reviewsList: {
      ru: "Анонимные отзывы пациентов",
      kz: "Пациенттердің анонимді пікірлері",
      en: "Anonymous Patient Reviews"
    },
    APPOINTMENT_TIME_OCCUPIED: {
      ru: "Выбранное время уже занято другим пациентом.",
      kz: "Таңдалған уақыт басқа пациентпен бос емес.",
      en: "The selected time slot is already booked by another patient."
    },
    INVALID_PASSWORD: {
      ru: "Неверный текущий пароль.",
      kz: "Қазіргі құпия сөз дұрыс емес.",
      en: "Invalid current password."
    },
    DOCTOR_IS_BLOCKED: {
      ru: "Врач заблокирован администратором.",
      kz: "Дәрігер әкімшімен блокталған.",
      en: "The doctor is blocked by the administrator."
    },
    ROOM_IS_OCCUPIED: {
      ru: "Кабинет занят другим врачом в выбранные часы.",
      kz: "Кабинет таңдалған сағаттарда басқа дәрігермен бос емес.",
      en: "The room is occupied by another doctor during the selected hours."
    },
    TEMPORARY_PASSWORD_REQUIRED: {
      ru: "Необходимо изменить временный пароль.",
      kz: "Уақытша құпия сөзді өзгерту қажет.",
      en: "A password change is required for first-time login."
    },
    PASSWORDS_DO_NOT_MATCH: {
      ru: "Пароли не совпадают.",
      kz: "Құпия сөздер сәйкес келмейді.",
      en: "Passwords do not match."
    }
  };

  // We will dynamically import the file content as text, find the end of each language block, and inject the new keys.
  // Alternatively, we can load translations object using a helper, append the keys, and write the file back as a clean export.
  // Let's parse translations by locating:
  // "ru: {"
  // "kz: {"
  // "en: {"
  // We can write a JS script that does import, extends translations, and dumps a new translations.js file.
  // That is the most robust and elegant way to build the translations file.

  import('../frontend/src/i18n/translations.js').then((module) => {
    const original = module.translations;
    
    // Merge new keys
    for (const key of Object.keys(newKeys)) {
      original.ru[key] = newKeys[key].ru;
      original.kz[key] = newKeys[key].kz;
      original.en[key] = newKeys[key].en;
    }

    // Dump back to translations.js
    const outputString = `export const translations = ${JSON.stringify(original, null, 2)};\n`;
    fs.writeFileSync(filePath, outputString, 'utf8');
    console.log('Translations successfully merged into translations.js!');
  }).catch(err => {
    console.error('Failed to load translations module:', err);
  });
} else {
  console.log('translations.js does not exist');
}
