import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  RiAlertLine,
  RiInformationLine,
  RiLoader4Line,
  RiRobotLine,
  RiSendPlaneLine,
  RiShieldCheckLine,
  RiUserHeartLine,
} from "react-icons/ri";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";

const TEXTS = {
  ru: {
    pageTitle: "ИИ-помощник",
    pageSubtitle:
      "Опишите симптомы или задайте вопрос о безрецептурных средствах.",
    aiAvailable: "AI доступен",

    loadingHistory: "Загрузка истории...",
    emptyTitle: "Чем я могу помочь?",
    emptyText:
      "Опишите самочувствие обычными словами. Например: «У меня болит голова и появилась тошнота».",

    exampleHeadache: "Болит голова и тошнит",
    exampleHeadacheValue:
      "У меня болит голова и тошнит",

    exampleTemperature:
      "Повышенная температура",
    exampleTemperatureValue:
      "Что делать при повышенной температуре?",

    exampleMedicine: "Вопрос о лекарстве",
    exampleMedicineValue:
      "Можно ли принять ибупрофен?",

    formingAnswer: "Формирую ответ...",
    inputPlaceholder:
      "Опишите симптомы или задайте вопрос...",
    sendAria: "Отправить сообщение",
    inputHint:
      "Enter — отправить, Shift + Enter — новая строка",

    disclaimer:
      "Ответ носит информационный характер и не заменяет очную консультацию врача.",

    historyLoadError:
      "Не удалось загрузить историю сообщений.",
    responseLoadError:
      "Не удалось получить ответ.",
    emptyResponse: "Ответ не получен.",
    requestError:
      "Произошла ошибка при обращении к AI.",
    assistantError:
      "Не удалось получить ответ. Проверьте подключение и повторите запрос.",
  },

  kk: {
    pageTitle: "AI көмекші",
    pageSubtitle:
      "Белгілеріңізді сипаттаңыз немесе рецептсіз берілетін дәрілер туралы сұрақ қойыңыз.",
    aiAvailable: "AI қолжетімді",

    loadingHistory: "Хабарламалар тарихы жүктелуде...",
    emptyTitle: "Сізге қалай көмектесе аламын?",
    emptyText:
      "Өзіңізді қалай сезінетініңізді қарапайым сөздермен сипаттаңыз. Мысалы: «Басым ауырып, жүрегім айнып тұр».",

    exampleHeadache: "Бас ауыруы және жүрек айнуы",
    exampleHeadacheValue:
      "Басым ауырып, жүрегім айнып тұр",

    exampleTemperature: "Дене қызуы жоғары",
    exampleTemperatureValue:
      "Дене қызуы көтерілгенде не істеу керек?",

    exampleMedicine: "Дәрі туралы сұрақ",
    exampleMedicineValue:
      "Ибупрофен қабылдауға бола ма?",

    formingAnswer: "Жауап дайындалуда...",
    inputPlaceholder:
      "Белгілеріңізді сипаттаңыз немесе сұрақ қойыңыз...",
    sendAria: "Хабарлама жіберу",
    inputHint:
      "Enter — жіберу, Shift + Enter — жаңа жол",

    disclaimer:
      "Жауап тек ақпараттық сипатта және дәрігердің бетпе-бет кеңесін алмастырмайды.",

    historyLoadError:
      "Хабарламалар тарихын жүктеу мүмкін болмады.",
    responseLoadError:
      "Жауап алу мүмкін болмады.",
    emptyResponse: "Жауап алынбады.",
    requestError:
      "AI қызметіне жүгіну кезінде қате пайда болды.",
    assistantError:
      "Жауап алу мүмкін болмады. Интернет байланысын тексеріп, сұрауды қайталаңыз.",
  },
};

function cleanText(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .trim();
}

function removeMarkdownSymbols(value) {
  return String(value ?? "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function isDangerHeading(text) {
  const normalized = text.toLowerCase();

  return (
    normalized.includes("срочно") ||
    normalized.includes("опасн") ||
    normalized.includes("скорую") ||
    normalized.includes("обратитесь к врачу") ||
    normalized.includes("когда обращаться") ||
    normalized.includes("тревожные симптомы") ||
    normalized.includes("шұғыл") ||
    normalized.includes("қауіп") ||
    normalized.includes("жедел жәрдем") ||
    normalized.includes("дәрігерге жүгін") ||
    normalized.includes("дәрігерге қарал") ||
    normalized.includes("алаңдататын белгілер")
  );
}

function isAdviceHeading(text) {
  const normalized = text.toLowerCase();

  return (
    normalized.includes("что можно сделать") ||
    normalized.includes("рекомендац") ||
    normalized.includes("совет") ||
    normalized.includes("сейчас") ||
    normalized.includes("помощь") ||
    normalized.includes("не істеуге болады") ||
    normalized.includes("ұсыныс") ||
    normalized.includes("кеңес") ||
    normalized.includes("қазір") ||
    normalized.includes("көмек")
  );
}

function isReasonHeading(text) {
  const normalized = text.toLowerCase();

  return (
    normalized.includes("возможные причины") ||
    normalized.includes("причины") ||
    normalized.includes("что это может быть") ||
    normalized.includes("ықтимал себеп") ||
    normalized.includes("себептер") ||
    normalized.includes("бұл не болуы мүмкін")
  );
}

function getSectionType(title) {
  if (isDangerHeading(title)) {
    return "danger";
  }

  if (isAdviceHeading(title)) {
    return "advice";
  }

  if (isReasonHeading(title)) {
    return "reason";
  }

  return "normal";
}

function parseAssistantMessage(text) {
  const cleanedText = cleanText(text);

  if (!cleanedText) {
    return [];
  }

  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim());

  const blocks = [];
  let currentParagraph = [];
  let currentList = [];

  function flushParagraph() {
    if (currentParagraph.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: removeMarkdownSymbols(
        currentParagraph.join(" ")
      ),
    });

    currentParagraph = [];
  }

  function flushList() {
    if (currentList.length === 0) {
      return;
    }

    blocks.push({
      type: "list",
      items: [...currentList],
    });

    currentList = [];
  }

  lines.forEach((line) => {
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = line.match(
      /^(#{1,4}\s+|\*\*.+\*\*:?\s*$)/
    );

    const numberedHeadingMatch = line.match(
      /^\d+[.)]\s+(.{3,60}):?$/
    );

    const plainHeading =
      line.endsWith(":") &&
      line.length <= 70 &&
      !line.includes(".");

    if (
      headingMatch ||
      numberedHeadingMatch ||
      plainHeading
    ) {
      flushParagraph();
      flushList();

      const title = removeMarkdownSymbols(
        line
          .replace(/^#{1,4}\s+/, "")
          .replace(/^\d+[.)]\s+/, "")
          .replace(/:$/, "")
      );

      blocks.push({
        type: "heading",
        text: title,
        sectionType: getSectionType(title),
      });

      return;
    }

    const listMatch = line.match(
      /^([-•*]|\d+[.)])\s+(.+)$/
    );

    if (listMatch) {
      flushParagraph();

      currentList.push(
        removeMarkdownSymbols(listMatch[2])
      );

      return;
    }

    currentParagraph.push(line);
  });

  flushParagraph();
  flushList();

  return blocks;
}

function AssistantMessage({
  text,
  disclaimer,
}) {
  const blocks = parseAssistantMessage(text);
  let currentSectionType = "normal";

  return (
    <div style={styles.formattedAnswer}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          currentSectionType =
            block.sectionType || "normal";

          const headingStyle =
            currentSectionType === "danger"
              ? styles.dangerHeading
              : currentSectionType === "advice"
              ? styles.adviceHeading
              : currentSectionType === "reason"
              ? styles.reasonHeading
              : styles.normalHeading;

          return (
            <div
              key={`heading-${index}`}
              style={{
                ...styles.answerHeading,
                ...headingStyle,
              }}
            >
              <span style={styles.headingIcon}>
                {currentSectionType === "danger" ? (
                  <RiAlertLine />
                ) : currentSectionType ===
                  "advice" ? (
                  <RiShieldCheckLine />
                ) : currentSectionType ===
                  "reason" ? (
                  <RiInformationLine />
                ) : (
                  <RiUserHeartLine />
                )}
              </span>

              <span>{block.text}</span>
            </div>
          );
        }

        if (block.type === "list") {
          const listStyle =
            currentSectionType === "danger"
              ? styles.dangerSection
              : currentSectionType === "advice"
              ? styles.adviceSection
              : currentSectionType === "reason"
              ? styles.reasonSection
              : styles.normalSection;

          return (
            <div
              key={`list-${index}`}
              style={{
                ...styles.answerSection,
                ...listStyle,
              }}
            >
              <ul style={styles.answerList}>
                {block.items.map(
                  (item, itemIndex) => (
                    <li
                      key={`${index}-${itemIndex}`}
                      style={styles.answerListItem}
                    >
                      <span
                        style={{
                          ...styles.listMarker,
                          background:
                            currentSectionType ===
                            "danger"
                              ? "#fb7185"
                              : currentSectionType ===
                                "advice"
                              ? "#34d399"
                              : "#818cf8",
                        }}
                      />

                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          );
        }

        return (
          <p
            key={`paragraph-${index}`}
            style={styles.answerParagraph}
          >
            {block.text}
          </p>
        );
      })}

      <div style={styles.medicalDisclaimer}>
        <RiInformationLine
          style={styles.disclaimerIcon}
        />

        <span>{disclaimer}</span>
      </div>
    </div>
  );
}

export default function AIAdvisor() {
  const { language } = useLanguage();

  const isKazakh =
    language === "kk" ||
    language === "kz";

  const text =
    isKazakh
      ? TEXTS.kk
      : TEXTS.ru;

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const bottomRef = useRef(null);

  async function loadHistory() {
    setHistoryLoading(true);
    setError("");

    try {
      const response =
        await api.get(
          "/ai/history"
        );

      if (response.data?.success) {
        const history =
          Array.isArray(
            response.data.data
          )
            ? response.data.data
            : [];

        setMessages(
          history.map((message) => ({
            role: message.role,
            text: message.message_text,
          }))
        );
      }
    } catch (requestError) {
      console.warn(
        "Не удалось загрузить историю AI:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          text.historyLoadError
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  async function handleSend(event) {
    event.preventDefault();

    const userText = input.trim();

    if (!userText || loading) {
      return;
    }

    setInput("");
    setError("");

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        role: "user",
        text: userText,
      },
    ]);

    setLoading(true);

    try {
      const response =
        await api.post(
          "/ai/consult",
          {
            message: userText,
          }
        );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            text.responseLoadError
        );
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          text:
            response.data.reply ||
            text.emptyResponse,
        },
      ]);
    } catch (requestError) {
      console.error(
        "Ошибка AI-консультанта:",
        requestError
      );

      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        text.requestError;

      setError(message);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          text: text.assistantError,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!loading && input.trim()) {
        handleSend(event);
      }
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {text.pageTitle}
          </h1>

          <p style={styles.subtitle}>
            {text.pageSubtitle}
          </p>
        </div>

        <div style={styles.statusBadge}>
          <span style={styles.statusDot} />
          {text.aiAvailable}
        </div>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          <RiAlertLine />
          <span>{error}</span>
        </div>
      )}

      <div style={styles.chatCard}>
        <div style={styles.messageBox}>
          {historyLoading ? (
            <div style={styles.empty}>
              <RiLoader4Line
                style={styles.loadingIcon}
              />

              <p style={styles.emptyText}>
                {text.loadingHistory}
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.robotCircle}>
                <RiRobotLine />
              </div>

              <h3 style={styles.emptyTitle}>
                {text.emptyTitle}
              </h3>

              <p style={styles.emptyText}>
                {text.emptyText}
              </p>

              <div style={styles.examples}>
                <button
                  type="button"
                  style={styles.exampleButton}
                  onClick={() =>
                    setInput(
                      text.exampleHeadacheValue
                    )
                  }
                >
                  {text.exampleHeadache}
                </button>

                <button
                  type="button"
                  style={styles.exampleButton}
                  onClick={() =>
                    setInput(
                      text.exampleTemperatureValue
                    )
                  }
                >
                  {text.exampleTemperature}
                </button>

                <button
                  type="button"
                  style={styles.exampleButton}
                  onClick={() =>
                    setInput(
                      text.exampleMedicineValue
                    )
                  }
                >
                  {text.exampleMedicine}
                </button>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isUser =
                message.role === "user";

              return (
                <div
                  key={`${message.role}-${index}`}
                  style={
                    isUser
                      ? styles.userRow
                      : styles.aiRow
                  }
                >
                  {!isUser && (
                    <div style={styles.aiAvatar}>
                      <RiRobotLine />
                    </div>
                  )}

                  <div
                    style={
                      isUser
                        ? styles.userBubble
                        : {
                            ...styles.aiBubble,
                            ...(message.isError
                              ? styles.errorBubble
                              : {}),
                          }
                    }
                  >
                    {isUser ? (
                      <p style={styles.userText}>
                        {message.text}
                      </p>
                    ) : (
                      <AssistantMessage
                        text={message.text}
                        disclaimer={
                          text.disclaimer
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div style={styles.aiRow}>
              <div style={styles.aiAvatar}>
                <RiRobotLine />
              </div>

              <div style={styles.typingBubble}>
                <span style={styles.typingDot} />
                <span style={styles.typingDot} />
                <span style={styles.typingDot} />

                <span style={styles.typingText}>
                  {text.formingAnswer}
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          style={styles.inputArea}
        >
          <textarea
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={
              text.inputPlaceholder
            }
            style={styles.chatInput}
            disabled={loading}
            maxLength={2000}
            rows={2}
          />

          <button
            type="submit"
            style={{
              ...styles.sendButton,
              ...(!input.trim() || loading
                ? styles.disabledButton
                : {}),
            }}
            disabled={
              !input.trim() ||
              loading
            }
            aria-label={text.sendAria}
          >
            {loading ? (
              <RiLoader4Line
                style={styles.sendLoadingIcon}
              />
            ) : (
              <RiSendPlaneLine />
            )}
          </button>
        </form>

        <div style={styles.inputFooter}>
          <span>{text.inputHint}</span>
          <span>{input.length}/2000</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 80px)",
    minHeight: "650px",
    padding: "32px",
    color: "#ffffff",
    fontFamily: "'Outfit', sans-serif",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    fontWeight: 700,
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
  },

  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 13px",
    borderRadius: "999px",
    border:
      "1px solid rgba(52, 211, 153, 0.25)",
    background:
      "rgba(5, 150, 105, 0.1)",
    color: "#a7f3d0",
    fontSize: "12px",
    fontWeight: 700,
  },

  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#34d399",
    boxShadow:
      "0 0 10px rgba(52, 211, 153, 0.8)",
  },

  errorMessage: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "15px",
    padding: "12px 15px",
    borderRadius: "12px",
    border:
      "1px solid rgba(251, 113, 133, 0.3)",
    background:
      "rgba(190, 18, 60, 0.12)",
    color: "#fecdd3",
    fontSize: "13px",
  },

  chatCard: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    borderRadius: "22px",
    border:
      "1px solid rgba(148, 163, 184, 0.1)",
    background:
      "rgba(30, 41, 59, 0.42)",
    backdropFilter: "blur(14px)",
    boxShadow:
      "0 20px 45px rgba(0, 0, 0, 0.15)",
  },

  messageBox: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: "18px",
    minHeight: 0,
    padding: "24px",
    overflowY: "auto",
  },

  empty: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    minHeight: "350px",
    padding: "30px",
    textAlign: "center",
  },

  robotCircle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "76px",
    height: "76px",
    marginBottom: "18px",
    borderRadius: "22px",
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#ffffff",
    fontSize: "38px",
    boxShadow:
      "0 15px 35px rgba(99, 102, 241, 0.28)",
  },

  emptyTitle: {
    margin: "0 0 10px",
    fontSize: "22px",
    color: "#f8fafc",
  },

  emptyText: {
    maxWidth: "560px",
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  examples: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "22px",
  },

  exampleButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border:
      "1px solid rgba(129, 140, 248, 0.25)",
    background:
      "rgba(99, 102, 241, 0.1)",
    color: "#c7d2fe",
    fontSize: "12px",
    cursor: "pointer",
  },

  userRow: {
    display: "flex",
    justifyContent: "flex-end",
  },

  aiRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: "10px",
  },

  aiAvatar: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "11px",
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#ffffff",
    fontSize: "19px",
  },

  userBubble: {
    maxWidth: "72%",
    padding: "13px 17px",
    borderRadius: "17px 17px 4px 17px",
    background:
      "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#ffffff",
    boxShadow:
      "0 9px 20px rgba(79, 70, 229, 0.2)",
  },

  userText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },

  aiBubble: {
    width: "min(760px, 82%)",
    padding: "17px",
    borderRadius: "4px 17px 17px 17px",
    border:
      "1px solid rgba(148, 163, 184, 0.1)",
    background:
      "rgba(15, 23, 42, 0.58)",
    color: "#e2e8f0",
  },

  errorBubble: {
    borderColor:
      "rgba(251, 113, 133, 0.25)",
    background:
      "rgba(190, 18, 60, 0.1)",
  },

  formattedAnswer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  answerHeading: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginTop: "7px",
    padding: "10px 12px",
    borderRadius: "11px",
    fontSize: "14px",
    fontWeight: 800,
  },

  headingIcon: {
    display: "flex",
    fontSize: "18px",
  },

  normalHeading: {
    color: "#c7d2fe",
    background:
      "rgba(99, 102, 241, 0.11)",
  },

  reasonHeading: {
    color: "#bae6fd",
    background:
      "rgba(14, 165, 233, 0.1)",
  },

  adviceHeading: {
    color: "#a7f3d0",
    background:
      "rgba(5, 150, 105, 0.1)",
  },

  dangerHeading: {
    color: "#fecdd3",
    background:
      "rgba(190, 18, 60, 0.14)",
  },

  answerSection: {
    padding: "11px 13px",
    borderRadius: "11px",
    border: "1px solid transparent",
  },

  normalSection: {
    background:
      "rgba(99, 102, 241, 0.06)",
    borderColor:
      "rgba(99, 102, 241, 0.1)",
  },

  reasonSection: {
    background:
      "rgba(14, 165, 233, 0.06)",
    borderColor:
      "rgba(14, 165, 233, 0.12)",
  },

  adviceSection: {
    background:
      "rgba(5, 150, 105, 0.06)",
    borderColor:
      "rgba(52, 211, 153, 0.12)",
  },

  dangerSection: {
    background:
      "rgba(190, 18, 60, 0.08)",
    borderColor:
      "rgba(251, 113, 133, 0.18)",
  },

  answerParagraph: {
    margin: 0,
    color: "#dbeafe",
    fontSize: "14px",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },

  answerList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },

  answerListItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    color: "#e2e8f0",
    fontSize: "14px",
    lineHeight: 1.55,
  },

  listMarker: {
    flexShrink: 0,
    width: "7px",
    height: "7px",
    marginTop: "7px",
    borderRadius: "50%",
  },

  medicalDisclaimer: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    marginTop: "6px",
    paddingTop: "12px",
    borderTop:
      "1px solid rgba(148, 163, 184, 0.1)",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  disclaimerIcon: {
    flexShrink: 0,
    marginTop: "1px",
    fontSize: "15px",
  },

  typingBubble: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "13px 16px",
    borderRadius: "4px 15px 15px 15px",
    background:
      "rgba(15, 23, 42, 0.58)",
    border:
      "1px solid rgba(148, 163, 184, 0.1)",
  },

  typingDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#818cf8",
  },

  typingText: {
    marginLeft: "5px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  inputArea: {
    display: "flex",
    alignItems: "flex-end",
    gap: "12px",
    padding: "16px 16px 8px",
    borderTop:
      "1px solid rgba(148, 163, 184, 0.08)",
    background:
      "rgba(15, 23, 42, 0.4)",
  },

  chatInput: {
    flex: 1,
    minHeight: "52px",
    maxHeight: "130px",
    resize: "vertical",
    padding: "14px 16px",
    borderRadius: "13px",
    border:
      "1px solid rgba(148, 163, 184, 0.14)",
    background:
      "rgba(30, 41, 59, 0.7)",
    color: "#ffffff",
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: 1.5,
    outline: "none",
  },

  sendButton: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: "52px",
    height: "52px",
    border: "none",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#ffffff",
    fontSize: "21px",
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.45,
    cursor: "not-allowed",
  },

  inputFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "0 18px 13px",
    background:
      "rgba(15, 23, 42, 0.4)",
    color: "#64748b",
    fontSize: "10px",
  },

  loadingIcon: {
    marginBottom: "14px",
    color: "#818cf8",
    fontSize: "42px",
  },

  sendLoadingIcon: {
    fontSize: "20px",
  },
};
