
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RiAddLine,
  RiBuilding2Line,
  RiCloseLine,
  RiDeleteBinLine,
  RiDoorOpenLine,
  RiEditLine,
  RiRefreshLine,
  RiSaveLine,
} from "react-icons/ri";

import api from "../../api/api";

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function extractArray(response) {
  const body = response?.data;

  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  return [];
}

function getRoomDepartmentName(room) {
  if (Array.isArray(room?.departments)) {
    return room.departments[0]?.name || "";
  }

  return room?.departments?.name || "";
}

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [departmentName, setDepartmentName] =
    useState("");

  const [
    departmentDescription,
    setDepartmentDescription,
  ] = useState("");

  const [roomDepartmentId, setRoomDepartmentId] =
    useState("");

  const [roomNumber, setRoomNumber] = useState("");
  const [roomName, setRoomName] = useState("");

  const [
    editingDepartmentId,
    setEditingDepartmentId,
  ] = useState("");

  const [
    editingDepartmentName,
    setEditingDepartmentName,
  ] = useState("");

  const [
    editingDepartmentDescription,
    setEditingDepartmentDescription,
  ] = useState("");

  const [editingRoomId, setEditingRoomId] =
    useState("");

  const [
    editingRoomDepartmentId,
    setEditingRoomDepartmentId,
  ] = useState("");

  const [
    editingRoomNumber,
    setEditingRoomNumber,
  ] = useState("");

  const [editingRoomName, setEditingRoomName] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [
    creatingDepartment,
    setCreatingDepartment,
  ] = useState(false);

  const [creatingRoom, setCreatingRoom] =
    useState(false);

  const [actionId, setActionId] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const results = await Promise.allSettled([
      api.get("/departments"),
      api.get("/rooms"),
    ]);

    const departmentsResult = results[0];
    const roomsResult = results[1];

    if (departmentsResult.status === "fulfilled") {
      const departmentItems = extractArray(
        departmentsResult.value
      );

      setDepartments(departmentItems);

      setRoomDepartmentId((currentId) => {
        if (
          currentId &&
          departmentItems.some(
            (department) =>
              department.id === currentId
          )
        ) {
          return currentId;
        }

        return departmentItems[0]?.id || "";
      });
    } else {
      setDepartments([]);
    }

    if (roomsResult.status === "fulfilled") {
      setRooms(extractArray(roomsResult.value));
    } else {
      setRooms([]);
    }

    if (
      departmentsResult.status === "rejected" &&
      roomsResult.status === "rejected"
    ) {
      setErrorMessage(
        getErrorMessage(
          departmentsResult.reason,
          "Не удалось загрузить отделения и кабинеты."
        )
      );
    } else if (
      departmentsResult.status === "rejected"
    ) {
      setErrorMessage(
        "Кабинеты загружены, но отделения временно недоступны."
      );
    } else if (roomsResult.status === "rejected") {
      setErrorMessage(
        "Отделения загружены, но кабинеты временно недоступны."
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roomsByDepartment = useMemo(() => {
    const result = {};

    for (const department of departments) {
      result[department.id] = [];
    }

    for (const room of rooms) {
      const departmentId = room?.department_id;

      if (!departmentId) {
        continue;
      }

      if (!result[departmentId]) {
        result[departmentId] = [];
      }

      result[departmentId].push(room);
    }

    return result;
  }, [departments, rooms]);

  const unassignedRooms = useMemo(
    () =>
      rooms.filter(
        (room) => !room?.department_id
      ),
    [rooms]
  );

  async function createDepartment(event) {
    event.preventDefault();

    const name = departmentName.trim();
    const description =
      departmentDescription.trim();

    if (!name) {
      setErrorMessage(
        "Введите название отделения."
      );
      return;
    }

    setCreatingDepartment(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await api.post(
        "/departments",
        {
          name,
          description: description || null,
        }
      );

      setDepartmentName("");
      setDepartmentDescription("");

      setSuccessMessage(
        response?.data?.message ||
          "Отделение успешно создано."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось создать отделение."
        )
      );
    } finally {
      setCreatingDepartment(false);
    }
  }

  function startDepartmentEditing(department) {
    setEditingDepartmentId(department.id);

    setEditingDepartmentName(
      department?.name || ""
    );

    setEditingDepartmentDescription(
      department?.description || ""
    );

    setEditingRoomId("");
    setSuccessMessage("");
    setErrorMessage("");
  }

  function cancelDepartmentEditing() {
    setEditingDepartmentId("");
    setEditingDepartmentName("");
    setEditingDepartmentDescription("");
  }

  async function saveDepartment(departmentId) {
    const name =
      editingDepartmentName.trim();

    const description =
      editingDepartmentDescription.trim();

    if (!name) {
      setErrorMessage(
        "Название отделения обязательно."
      );
      return;
    }

    setActionId(`department-${departmentId}`);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await api.put(
        `/departments/${departmentId}`,
        {
          name,
          description: description || null,
        }
      );

      cancelDepartmentEditing();

      setSuccessMessage(
        response?.data?.message ||
          "Отделение успешно обновлено."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось обновить отделение."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function deleteDepartment(department) {
    const departmentRooms =
      roomsByDepartment[department.id] || [];

    const confirmed = window.confirm(
      `Удалить отделение «${department.name}»?\n\nКабинетов внутри: ${departmentRooms.length}.\nКабинеты останутся в системе, но будут отвязаны от отделения.`
    );

    if (!confirmed) {
      return;
    }

    setActionId(`department-${department.id}`);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await api.delete(
        `/departments/${department.id}`
      );

      if (
        editingDepartmentId === department.id
      ) {
        cancelDepartmentEditing();
      }

      setSuccessMessage(
        response?.data?.message ||
          "Отделение успешно удалено."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось удалить отделение."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function createRoom(event) {
    event.preventDefault();

    const departmentId =
      roomDepartmentId.trim();

    const number = roomNumber.trim();
    const name = roomName.trim();

    if (!departmentId) {
      setErrorMessage(
        "Сначала выберите отделение."
      );
      return;
    }

    if (!number) {
      setErrorMessage(
        "Введите номер кабинета."
      );
      return;
    }

    setCreatingRoom(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await api.post(
        "/rooms",
        {
          departmentId,
          number,
          name: name || null,
        }
      );

      setRoomNumber("");
      setRoomName("");

      setSuccessMessage(
        response?.data?.message ||
          "Кабинет успешно создан."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось создать кабинет."
        )
      );
    } finally {
      setCreatingRoom(false);
    }
  }

  function startRoomEditing(room) {
    setEditingRoomId(room.id);

    setEditingRoomDepartmentId(
      room?.department_id || ""
    );

    setEditingRoomNumber(
      room?.number || ""
    );

    setEditingRoomName(room?.name || "");

    setEditingDepartmentId("");
    setSuccessMessage("");
    setErrorMessage("");
  }

  function cancelRoomEditing() {
    setEditingRoomId("");
    setEditingRoomDepartmentId("");
    setEditingRoomNumber("");
    setEditingRoomName("");
  }

  async function saveRoom(roomId) {
    const departmentId =
      editingRoomDepartmentId.trim();

    const number =
      editingRoomNumber.trim();

    const name = editingRoomName.trim();

    if (!departmentId) {
      setErrorMessage(
        "Выберите отделение."
      );
      return;
    }

    if (!number) {
      setErrorMessage(
        "Номер кабинета обязателен."
      );
      return;
    }

    setActionId(`room-${roomId}`);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await api.put(
        `/rooms/${roomId}`,
        {
          departmentId,
          number,
          name: name || null,
        }
      );

      cancelRoomEditing();

      setSuccessMessage(
        response?.data?.message ||
          "Кабинет успешно обновлён."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось обновить кабинет."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function deleteRoom(room) {
    const confirmed = window.confirm(
      `Удалить кабинет №${room.number}${
        room.name ? ` — ${room.name}` : ""
      }?\n\nЕсли кабинет назначен врачу, он будет отвязан от врача.`
    );

    if (!confirmed) {
      return;
    }

    setActionId(`room-${room.id}`);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await api.delete(
        `/rooms/${room.id}`
      );

      if (editingRoomId === room.id) {
        cancelRoomEditing();
      }

      setSuccessMessage(
        response?.data?.message ||
          "Кабинет успешно удалён."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось удалить кабинет."
        )
      );
    } finally {
      setActionId("");
    }
  }

  function renderRoom(room) {
    const isEditing =
      editingRoomId === room.id;

    const isProcessing =
      actionId === `room-${room.id}`;

    return (
      <div key={room.id} style={styles.roomItem}>
        <div style={styles.roomIcon}>
          <RiDoorOpenLine />
        </div>

        <div style={styles.roomContent}>
          {isEditing ? (
            <>
              <div style={styles.editGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Отделение
                  </label>

                  <select
                    value={
                      editingRoomDepartmentId
                    }
                    onChange={(event) =>
                      setEditingRoomDepartmentId(
                        event.target.value
                      )
                    }
                    disabled={isProcessing}
                    style={styles.select}
                  >
                    <option value="">
                      Выберите отделение
                    </option>

                    {departments.map(
                      (department) => (
                        <option
                          key={department.id}
                          value={department.id}
                        >
                          {department.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Номер кабинета
                  </label>

                  <input
                    type="text"
                    value={editingRoomNumber}
                    onChange={(event) =>
                      setEditingRoomNumber(
                        event.target.value
                      )
                    }
                    disabled={isProcessing}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Название кабинета
                </label>

                <input
                  type="text"
                  value={editingRoomName}
                  onChange={(event) =>
                    setEditingRoomName(
                      event.target.value
                    )
                  }
                  placeholder="Например: Процедурный"
                  disabled={isProcessing}
                  style={styles.input}
                />
              </div>

              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={() =>
                    saveRoom(room.id)
                  }
                  disabled={isProcessing}
                  style={{
                    ...styles.saveButton,
                    ...(isProcessing
                      ? styles.disabledButton
                      : {}),
                  }}
                >
                  <RiSaveLine />

                  {isProcessing
                    ? "Сохранение..."
                    : "Сохранить"}
                </button>

                <button
                  type="button"
                  onClick={cancelRoomEditing}
                  disabled={isProcessing}
                  style={styles.cancelButton}
                >
                  <RiCloseLine />
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <div style={styles.roomTopRow}>
              <div>
                <h4 style={styles.roomNumber}>
                  Кабинет №{room.number}
                </h4>

                <p style={styles.roomName}>
                  {room.name ||
                    "Название кабинета не указано"}
                </p>

                {!room.department_id && (
                  <span
                    style={
                      styles.unassignedBadge
                    }
                  >
                    Без отделения
                  </span>
                )}
              </div>

              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={() =>
                    startRoomEditing(room)
                  }
                  disabled={isProcessing}
                  style={styles.editButton}
                >
                  <RiEditLine />
                  Изменить
                </button>

                <button
                  type="button"
                  onClick={() =>
                    deleteRoom(room)
                  }
                  disabled={isProcessing}
                  style={{
                    ...styles.deleteButton,
                    ...(isProcessing
                      ? styles.disabledButton
                      : {}),
                  }}
                >
                  <RiDeleteBinLine />

                  {isProcessing
                    ? "Удаление..."
                    : "Удалить"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Отделения и кабинеты
          </h1>

          <p style={styles.subtitle}>
            Настройте структуру медицинской
            организации перед назначением врачей
            и созданием расписания.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          style={{
            ...styles.refreshButton,
            ...(loading
              ? styles.disabledButton
              : {}),
          }}
        >
          <RiRefreshLine />

          {loading
            ? "Обновление..."
            : "Обновить"}
        </button>
      </header>

      {successMessage && (
        <div style={styles.successAlert}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={styles.errorAlert}>
          {errorMessage}
        </div>
      )}

      <div style={styles.formsGrid}>
        <form
          onSubmit={createDepartment}
          style={styles.formCard}
        >
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              <RiBuilding2Line />
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Новое отделение
              </h2>

              <p style={styles.cardSubtitle}>
                Создайте медицинское отделение.
              </p>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Название отделения *
            </label>

            <input
              type="text"
              value={departmentName}
              onChange={(event) =>
                setDepartmentName(
                  event.target.value
                )
              }
              placeholder="Например: Терапевтическое отделение"
              maxLength={120}
              disabled={creatingDepartment}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Описание
            </label>

            <textarea
              value={departmentDescription}
              onChange={(event) =>
                setDepartmentDescription(
                  event.target.value
                )
              }
              placeholder="Краткое описание отделения"
              rows={4}
              maxLength={500}
              disabled={creatingDepartment}
              style={styles.textarea}
            />

            <span style={styles.counterText}>
              {departmentDescription.length}
              /500
            </span>
          </div>

          <button
            type="submit"
            disabled={creatingDepartment}
            style={{
              ...styles.createButton,
              ...(creatingDepartment
                ? styles.disabledButton
                : {}),
            }}
          >
            <RiAddLine />

            {creatingDepartment
              ? "Создание..."
              : "Создать отделение"}
          </button>
        </form>

        <form
          onSubmit={createRoom}
          style={styles.formCard}
        >
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              <RiDoorOpenLine />
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Новый кабинет
              </h2>

              <p style={styles.cardSubtitle}>
                Добавьте кабинет в выбранное
                отделение.
              </p>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Отделение *
            </label>

            <select
              value={roomDepartmentId}
              onChange={(event) =>
                setRoomDepartmentId(
                  event.target.value
                )
              }
              disabled={
                creatingRoom ||
                departments.length === 0
              }
              style={styles.select}
              required
            >
              <option value="">
                Выберите отделение
              </option>

              {departments.map(
                (department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Номер кабинета *
            </label>

            <input
              type="text"
              value={roomNumber}
              onChange={(event) =>
                setRoomNumber(
                  event.target.value
                )
              }
              placeholder="Например: 105"
              maxLength={30}
              disabled={creatingRoom}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Название кабинета
            </label>

            <input
              type="text"
              value={roomName}
              onChange={(event) =>
                setRoomName(event.target.value)
              }
              placeholder="Например: Кабинет терапевта"
              maxLength={120}
              disabled={creatingRoom}
              style={styles.input}
            />
          </div>

          {departments.length === 0 && (
            <p style={styles.formHint}>
              Сначала создайте хотя бы одно
              отделение.
            </p>
          )}

          <button
            type="submit"
            disabled={
              creatingRoom ||
              departments.length === 0
            }
            style={{
              ...styles.createButton,
              ...(creatingRoom ||
              departments.length === 0
                ? styles.disabledButton
                : {}),
            }}
          >
            <RiAddLine />

            {creatingRoom
              ? "Создание..."
              : "Создать кабинет"}
          </button>
        </form>
      </div>

      <section style={styles.structureCard}>
        <div style={styles.structureHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              Структура организации
            </h2>

            <p style={styles.cardSubtitle}>
              Отделений: {departments.length}
              {" · "}
              кабинетов: {rooms.length}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            Загрузка структуры организации...
          </div>
        ) : departments.length === 0 ? (
          <div style={styles.emptyState}>
            <RiBuilding2Line
              style={styles.emptyIcon}
            />

            <strong>
              Отделения ещё не созданы
            </strong>

            <span>
              Создайте первое отделение, после
              чего добавьте в него кабинеты.
            </span>
          </div>
        ) : (
          <div style={styles.departmentList}>
            {departments.map((department) => {
              const departmentRooms =
                roomsByDepartment[
                  department.id
                ] || [];

              const isEditing =
                editingDepartmentId ===
                department.id;

              const isProcessing =
                actionId ===
                `department-${department.id}`;

              return (
                <article
                  key={department.id}
                  style={styles.departmentCard}
                >
                  <div
                    style={
                      styles.departmentHeader
                    }
                  >
                    <div
                      style={
                        styles.departmentTitleArea
                      }
                    >
                      <div
                        style={
                          styles.departmentIcon
                        }
                      >
                        <RiBuilding2Line />
                      </div>

                      <div>
                        <h3
                          style={
                            styles.departmentName
                          }
                        >
                          {department.name}
                        </h3>

                        <span
                          style={
                            styles.roomsCountBadge
                          }
                        >
                          Кабинетов:{" "}
                          {departmentRooms.length}
                        </span>
                      </div>
                    </div>

                    {!isEditing && (
                      <div style={styles.actions}>
                        <button
                          type="button"
                          onClick={() =>
                            startDepartmentEditing(
                              department
                            )
                          }
                          disabled={isProcessing}
                          style={styles.editButton}
                        >
                          <RiEditLine />
                          Изменить
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteDepartment(
                              department
                            )
                          }
                          disabled={isProcessing}
                          style={{
                            ...styles.deleteButton,
                            ...(isProcessing
                              ? styles.disabledButton
                              : {}),
                          }}
                        >
                          <RiDeleteBinLine />

                          {isProcessing
                            ? "Удаление..."
                            : "Удалить"}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div
                      style={
                        styles.departmentEditBox
                      }
                    >
                      <div
                        style={styles.inputGroup}
                      >
                        <label style={styles.label}>
                          Название отделения
                        </label>

                        <input
                          type="text"
                          value={
                            editingDepartmentName
                          }
                          onChange={(event) =>
                            setEditingDepartmentName(
                              event.target.value
                            )
                          }
                          disabled={isProcessing}
                          style={styles.input}
                        />
                      </div>

                      <div
                        style={styles.inputGroup}
                      >
                        <label style={styles.label}>
                          Описание
                        </label>

                        <textarea
                          value={
                            editingDepartmentDescription
                          }
                          onChange={(event) =>
                            setEditingDepartmentDescription(
                              event.target.value
                            )
                          }
                          rows={3}
                          disabled={isProcessing}
                          style={styles.textarea}
                        />
                      </div>

                      <div style={styles.actions}>
                        <button
                          type="button"
                          onClick={() =>
                            saveDepartment(
                              department.id
                            )
                          }
                          disabled={isProcessing}
                          style={{
                            ...styles.saveButton,
                            ...(isProcessing
                              ? styles.disabledButton
                              : {}),
                          }}
                        >
                          <RiSaveLine />

                          {isProcessing
                            ? "Сохранение..."
                            : "Сохранить"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            cancelDepartmentEditing
                          }
                          disabled={isProcessing}
                          style={
                            styles.cancelButton
                          }
                        >
                          <RiCloseLine />
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      style={
                        styles.departmentDescription
                      }
                    >
                      {department.description ||
                        "Описание отделения не указано."}
                    </p>
                  )}

                  <div style={styles.roomsSection}>
                    <div
                      style={
                        styles.roomsSectionTitle
                      }
                    >
                      <RiDoorOpenLine />
                      Кабинеты отделения
                    </div>

                    {departmentRooms.length ===
                    0 ? (
                      <div
                        style={
                          styles.noRoomsMessage
                        }
                      >
                        В этом отделении пока нет
                        кабинетов.
                      </div>
                    ) : (
                      <div style={styles.roomList}>
                        {departmentRooms.map(
                          renderRoom
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {unassignedRooms.length > 0 && (
              <article
                style={styles.departmentCard}
              >
                <div
                  style={
                    styles.departmentHeader
                  }
                >
                  <div
                    style={
                      styles.departmentTitleArea
                    }
                  >
                    <div
                      style={
                        styles.unassignedIcon
                      }
                    >
                      <RiDoorOpenLine />
                    </div>

                    <div>
                      <h3
                        style={
                          styles.departmentName
                        }
                      >
                        Кабинеты без отделения
                      </h3>

                      <span
                        style={
                          styles.unassignedBadge
                        }
                      >
                        Требуется назначение
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.roomList}>
                  {unassignedRooms.map(
                    renderRoom
                  )}
                </div>
              </article>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  container: {
    padding: "36px",
    color: "#ffffff",
    fontFamily:
      "'Outfit', 'Inter', sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "26px",
  },

  title: {
    margin: "0 0 7px",
    fontSize: "32px",
    fontWeight: 800,
  },

  subtitle: {
    maxWidth: "720px",
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "11px 16px",
    borderRadius: "11px",
    border:
      "1px solid rgba(99,102,241,0.4)",
    background:
      "rgba(99,102,241,0.15)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  successAlert: {
    marginBottom: "20px",
    padding: "13px 16px",
    borderRadius: "12px",
    border:
      "1px solid rgba(16,185,129,0.35)",
    background:
      "rgba(16,185,129,0.12)",
    color: "#6ee7b7",
  },

  errorAlert: {
    marginBottom: "20px",
    padding: "13px 16px",
    borderRadius: "12px",
    border:
      "1px solid rgba(239,68,68,0.35)",
    background:
      "rgba(239,68,68,0.12)",
    color: "#fca5a5",
  },

  formsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "22px",
    marginBottom: "24px",
  },

  formCard: {
    padding: "24px",
    borderRadius: "18px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    background:
      "rgba(30,41,59,0.45)",
  },

  structureCard: {
    padding: "24px",
    borderRadius: "18px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    background:
      "rgba(30,41,59,0.45)",
  },

  structureHeader: {
    marginBottom: "20px",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
  },

  cardIcon: {
    width: "42px",
    height: "42px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "12px",
    background:
      "rgba(99,102,241,0.18)",
    color: "#a5b4fc",
    fontSize: "22px",
  },

  cardTitle: {
    margin: "0 0 4px",
    fontSize: "20px",
    fontWeight: 750,
  },

  cardSubtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "17px",
  },

  editGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "12px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "11px",
    border:
      "1px solid rgba(255,255,255,0.11)",
    background: "rgba(0,0,0,0.2)",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "11px",
    border:
      "1px solid rgba(255,255,255,0.11)",
    background: "#111827",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "11px",
    border:
      "1px solid rgba(255,255,255,0.11)",
    background: "rgba(0,0,0,0.2)",
    color: "#ffffff",
    fontSize: "14px",
    lineHeight: 1.5,
    resize: "vertical",
    outline: "none",
  },

  counterText: {
    textAlign: "right",
    color: "#64748b",
    fontSize: "11px",
  },

  formHint: {
    margin: "0 0 16px",
    color: "#fbbf24",
    fontSize: "13px",
  },

  createButton: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "7px",
    width: "100%",
    padding: "12px 18px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  departmentList: {
    display: "flex",
    flexDirection: "column",
    gap: "17px",
  },

  departmentCard: {
    padding: "20px",
    borderRadius: "16px",
    border:
      "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.16)",
  },

  departmentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    flexWrap: "wrap",
  },

  departmentTitleArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  departmentIcon: {
    width: "43px",
    height: "43px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "12px",
    background:
      "rgba(99,102,241,0.16)",
    color: "#a5b4fc",
    fontSize: "22px",
  },

  unassignedIcon: {
    width: "43px",
    height: "43px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "12px",
    background:
      "rgba(245,158,11,0.14)",
    color: "#fbbf24",
    fontSize: "22px",
  },

  departmentName: {
    margin: "0 0 7px",
    fontSize: "18px",
    fontWeight: 750,
  },

  roomsCountBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "999px",
    background:
      "rgba(16,185,129,0.12)",
    color: "#6ee7b7",
    fontSize: "11px",
    fontWeight: 700,
  },

  unassignedBadge: {
    display: "inline-block",
    marginTop: "5px",
    padding: "4px 8px",
    borderRadius: "999px",
    background:
      "rgba(245,158,11,0.13)",
    color: "#fbbf24",
    fontSize: "11px",
    fontWeight: 700,
  },

  departmentDescription: {
    margin: "14px 0 0",
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },

  departmentEditBox: {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "13px",
    background: "rgba(15,23,42,0.55)",
  },

  roomsSection: {
    marginTop: "20px",
    paddingTop: "17px",
    borderTop:
      "1px solid rgba(255,255,255,0.06)",
  },

  roomsSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginBottom: "13px",
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: 700,
  },

  noRoomsMessage: {
    padding: "15px",
    borderRadius: "11px",
    background: "rgba(15,23,42,0.4)",
    color: "#64748b",
    fontSize: "13px",
    textAlign: "center",
  },

  roomList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  roomItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px",
    borderRadius: "12px",
    border:
      "1px solid rgba(255,255,255,0.05)",
    background: "rgba(15,23,42,0.52)",
  },

  roomIcon: {
    minWidth: "38px",
    height: "38px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "10px",
    background:
      "rgba(14,165,233,0.13)",
    color: "#7dd3fc",
    fontSize: "19px",
  },

  roomContent: {
    flex: 1,
    minWidth: 0,
  },

  roomTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },

  roomNumber: {
    margin: "0 0 4px",
    fontSize: "15px",
    fontWeight: 750,
  },

  roomName: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
  },

  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  editButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 11px",
    borderRadius: "9px",
    border:
      "1px solid rgba(99,102,241,0.35)",
    background:
      "rgba(99,102,241,0.14)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  saveButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 12px",
    borderRadius: "9px",
    border: "none",
    background: "#059669",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  cancelButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 12px",
    borderRadius: "9px",
    border:
      "1px solid rgba(148,163,184,0.25)",
    background:
      "rgba(148,163,184,0.1)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontWeight: 700,
  },

  deleteButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 11px",
    borderRadius: "9px",
    border:
      "1px solid rgba(239,68,68,0.35)",
    background:
      "rgba(239,68,68,0.13)",
    color: "#fca5a5",
    cursor: "pointer",
    fontWeight: 700,
  },

  emptyState: {
    minHeight: "220px",
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "9px",
    borderRadius: "14px",
    background: "rgba(0,0,0,0.13)",
    color: "#64748b",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "38px",
    color: "#475569",
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};
