import { useState } from "react";
import "../styles/organizationApplication.css";

const organizationTypes = [
  {
    value: "gov_polyclinics",
    label: "Государственная поликлиника",
  },
  {
    value: "gov_hospitals",
    label: "Государственная больница",
  },
  {
    value: "private_clinics",
    label: "Частная клиника",
  },
];

const applicationTypes = [
  {
    value: "open_organization",
    label: "Подключение новой организации",
  },
  {
    value: "update_organization",
    label: "Изменение данных организации",
  },
  {
    value: "chief_doctor_access",
    label: "Получение доступа для главного врача",
  },
];

export default function OrganizationApplication() {
  const [form, setForm] = useState({
    applicationType: "open_organization",

    organizationName: "",
    organizationType: "gov_polyclinics",
    bin: "",
    city: "",
    address: "",

    chiefDoctorFullName: "",

    senderFullName: "",
    senderPosition: "",
    senderPhone: "",
    senderEmail: "",

    medicalLicenseInfo: "",
    registrationDocumentInfo: "",
    chiefDoctorOrderInfo: "",
    additionalDocumentsInfo: "",

    comment: "",
  });

  const [success, setSuccess] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const onlyDigits = (value) => {
    return value.replace(/\D/g, "");
  };

  const submitApplication = async (e) => {
  e.preventDefault();

  if (!form.organizationName.trim()) {
    alert("Введите название организации");
    return;
  }

  if (!form.bin.trim() || form.bin.length !== 12) {
    alert("Введите корректный БИН организации. БИН должен состоять из 12 цифр.");
    return;
  }

  if (!form.city.trim()) {
    alert("Введите город");
    return;
  }

  if (!form.address.trim()) {
    alert("Введите адрес организации");
    return;
  }

  if (!form.chiefDoctorFullName.trim()) {
    alert("Введите ФИО главного врача");
    return;
  }

  if (!form.senderFullName.trim()) {
    alert("Введите ФИО отправителя заявки");
    return;
  }

  try {
    const response = await fetch(
      "https://health-card.onrender.com/api/organization-applications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Не удалось отправить заявку.");
    }

    console.log("Заявка создана:", data.application);

    setSuccess(true);
  } catch (error) {
    console.error(error);
    alert(error.message || "Ошибка отправки заявки.");
  }
};

  return (
    <div className="orgApplicationPage">
      <div className="orgApplicationDecor one" />
      <div className="orgApplicationDecor two" />

      <div className="orgApplicationContainer">
        <div className="orgApplicationHeader">
          <div className="orgApplicationBadge">Заявка организации</div>

          <h1>Подать заявку на подключение</h1>

          <p>
            Заполните данные медицинской организации. После отправки заявка
            попадёт в админ-панель, где её проверит ответственный сотрудник.
          </p>
        </div>

        {success ? (
          <div className="orgSuccessCard">
            <div className="orgSuccessIcon">✓</div>

            <h2>Заявка отправлена</h2>

            <p>
              Ваша заявка принята в обработку. После проверки данных
              администратор изменит статус заявки. Если данных будет
              недостаточно, заявка будет возвращена на исправление с
              комментарием.
            </p>

            <button type="button" onClick={() => setSuccess(false)}>
              Отправить ещё одну заявку
            </button>
          </div>
        ) : (
          <form className="orgApplicationForm" onSubmit={submitApplication}>
            <section className="orgFormCard">
              <div className="orgFormTitle">
                <span>1</span>
                <div>
                  <h2>Тип заявки</h2>
                  <p>Выберите, для чего организация отправляет заявление.</p>
                </div>
              </div>

              <div className="orgFormGrid">
                <div className="orgField">
                  <label>Тип заявки</label>
                  <select
                    value={form.applicationType}
                    onChange={(e) =>
                      updateField("applicationType", e.target.value)
                    }
                  >
                    {applicationTypes.map((item) => (
                      <option value={item.value} key={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="orgFormCard">
              <div className="orgFormTitle">
                <span>2</span>
                <div>
                  <h2>Данные организации</h2>
                  <p>
                    Эти данные будут использоваться администраторами для
                    проверки организации.
                  </p>
                </div>
              </div>

              <div className="orgFormGrid">
                <div className="orgField wide">
                  <label>Название организации</label>
                  <input
                    value={form.organizationName}
                    onChange={(e) =>
                      updateField("organizationName", e.target.value)
                    }
                    placeholder="Например: Городская поликлиника №3 акимата города Астаны"
                  />
                </div>

                <div className="orgField">
                  <label>Тип организации</label>
                  <select
                    value={form.organizationType}
                    onChange={(e) =>
                      updateField("organizationType", e.target.value)
                    }
                  >
                    {organizationTypes.map((item) => (
                      <option value={item.value} key={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="orgField">
                  <label>БИН организации</label>
                  <input
                    value={form.bin}
                    onChange={(e) =>
                      updateField("bin", onlyDigits(e.target.value).slice(0, 12))
                    }
                    placeholder="12 цифр"
                    inputMode="numeric"
                  />
                </div>

                <div className="orgField">
                  <label>Город</label>
                  <input
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Например: Астана"
                  />
                </div>

                <div className="orgField wide">
                  <label>Адрес организации</label>
                  <input
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Например: проспект Кабанбай батыра 46"
                  />
                </div>

                <div className="orgField wide">
                  <label>ФИО главного врача</label>
                  <input
                    value={form.chiefDoctorFullName}
                    onChange={(e) =>
                      updateField("chiefDoctorFullName", e.target.value)
                    }
                    placeholder="Например: Иванов Иван Иванович"
                  />
                </div>
              </div>
            </section>

            <section className="orgFormCard">
              <div className="orgFormTitle">
                <span>3</span>
                <div>
                  <h2>Данные отправителя</h2>
                  <p>
                    Эти данные нужны, чтобы администратор понимал, кто отправил
                    заявление от имени организации.
                  </p>
                </div>
              </div>

              <div className="orgFormGrid">
                <div className="orgField">
                  <label>ФИО отправителя</label>
                  <input
                    value={form.senderFullName}
                    onChange={(e) =>
                      updateField("senderFullName", e.target.value)
                    }
                    placeholder="Например: Петров Пётр Петрович"
                  />
                </div>

                <div className="orgField">
                  <label>Должность отправителя</label>
                  <input
                    value={form.senderPosition}
                    onChange={(e) =>
                      updateField("senderPosition", e.target.value)
                    }
                    placeholder="Например: сотрудник администрации"
                  />
                </div>

                <div className="orgField">
                  <label>Телефон для связи</label>
                  <input
                    value={form.senderPhone}
                    onChange={(e) =>
                      updateField("senderPhone", e.target.value)
                    }
                    placeholder="+7..."
                  />
                </div>

                <div className="orgField">
                  <label>Email для ответа</label>
                  <input
                    value={form.senderEmail}
                    onChange={(e) =>
                      updateField("senderEmail", e.target.value)
                    }
                    placeholder="example@mail.kz"
                  />
                </div>
              </div>
            </section>

            <section className="orgFormCard">
              <div className="orgFormTitle">
                <span>4</span>
                <div>
                  <h2>Документы</h2>
                  <p>
                    Пока документы указываются текстом. Позже сюда можно
                    добавить загрузку файлов.
                  </p>
                </div>
              </div>

              <div className="orgFormGrid">
                <div className="orgField wide">
                  <label>Лицензия на медицинскую деятельность</label>
                  <textarea
                    value={form.medicalLicenseInfo}
                    onChange={(e) =>
                      updateField("medicalLicenseInfo", e.target.value)
                    }
                    placeholder="Укажите номер лицензии, дату выдачи или описание документа"
                  />
                </div>

                <div className="orgField wide">
                  <label>Документ о регистрации организации</label>
                  <textarea
                    value={form.registrationDocumentInfo}
                    onChange={(e) =>
                      updateField("registrationDocumentInfo", e.target.value)
                    }
                    placeholder="Укажите данные регистрационного документа"
                  />
                </div>

                <div className="orgField wide">
                  <label>Документ о назначении главного врача</label>
                  <textarea
                    value={form.chiefDoctorOrderInfo}
                    onChange={(e) =>
                      updateField("chiefDoctorOrderInfo", e.target.value)
                    }
                    placeholder="Укажите номер приказа или данные документа"
                  />
                </div>

                <div className="orgField wide">
                  <label>Дополнительные документы</label>
                  <textarea
                    value={form.additionalDocumentsInfo}
                    onChange={(e) =>
                      updateField("additionalDocumentsInfo", e.target.value)
                    }
                    placeholder="Если есть дополнительные документы, укажите их здесь"
                  />
                </div>
              </div>
            </section>

            <section className="orgFormCard">
              <div className="orgFormTitle">
                <span>5</span>
                <div>
                  <h2>Комментарий</h2>
                  <p>
                    Здесь можно указать дополнительную информацию для
                    администратора.
                  </p>
                </div>
              </div>

              <div className="orgFormGrid">
                <div className="orgField wide">
                  <label>Комментарий к заявке</label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => updateField("comment", e.target.value)}
                    placeholder="Например: просим подключить организацию к системе МедКарта"
                  />
                </div>
              </div>
            </section>

            <div className="orgApplicationActions">
              <button type="submit">Отправить заявку</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}