
import {
  useMemo,
  useState,
} from "react";

import {
  RiCapsuleLine,
  RiExternalLinkLine,
  RiInformationLine,
  RiMapPinLine,
  RiPhoneLine,
  RiRefreshLine,
  RiSearchLine,
  RiStore2Line,
} from "react-icons/ri";

import api from "../../api/api";

const CITY_OPTIONS = [
  { value: "astana", label: "Астана" },
  { value: "almaty", label: "Алматы" },
  { value: "shymkent", label: "Шымкент" },
  { value: "karaganda", label: "Караганда" },
  { value: "aktobe", label: "Актобе" },
  { value: "taraz", label: "Тараз" },
  { value: "pavlodar", label: "Павлодар" },
  { value: "semey", label: "Семей" },
  { value: "atyrau", label: "Атырау" },
  { value: "kostanay", label: "Костанай" },
  { value: "kyzylorda", label: "Кызылорда" },
  { value: "aktau", label: "Актау" },
  { value: "kokshetau", label: "Кокшетау" },
  {
    value: "petropavlovsk",
    label: "Петропавловск",
  },
  { value: "uralsk", label: "Уральск" },
  { value: "turkestan", label: "Туркестан" },
  {
    value: "ust-kamenogorsk",
    label: "Усть-Каменогорск",
  },
];

const SEARCH_EXAMPLES = [
  "Парацетамол",
  "Ибупрофен",
  "Цетиризин",
  "Амоксициллин",
];

function clean(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function getErrorMessage(
  error,
  fallback
) {
  if (
    error?.response?.status === 401
  ) {
    return "Сессия завершена. Войдите в систему повторно.";
  }

  if (
    error?.response?.status === 403
  ) {
    return "У вас нет доступа к поиску лекарств.";
  }

  if (
    error?.response?.status === 429
  ) {
    return "Слишком много запросов. Повторите попытку позже.";
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatPrice(
  value,
  currency = "KZT"
) {
  const price = Number(value);

  if (!Number.isFinite(price)) {
    return "Цена не указана";
  }

  try {
    return new Intl.NumberFormat(
      "ru-KZ",
      {
        style: "currency",
        currency:
          clean(currency) || "KZT",
        maximumFractionDigits: 0,
      }
    ).format(price);
  } catch {
    return `${price.toLocaleString(
      "ru-KZ"
    )} ₸`;
  }
}

function normalizePhone(phone) {
  return clean(phone).replace(
    /[^\d+]/g,
    ""
  );
}

function getAvailabilityStyle(
  availability,
  pharmacyStatus
) {
  const value = clean(
    `${availability || ""} ${
      pharmacyStatus || ""
    }`
  ).toLowerCase();

  if (
    value.includes("закрыто") ||
    value.includes("нет в наличии")
  ) {
    return {
      color: "#fca5a5",
      background:
        "rgba(239,68,68,0.12)",
      borderColor:
        "rgba(239,68,68,0.28)",
    };
  }

  if (
    value.includes("налич") ||
    value.includes("открыто") ||
    value.includes("круглосуточно")
  ) {
    return {
      color: "#6ee7b7",
      background:
        "rgba(16,185,129,0.12)",
      borderColor:
        "rgba(16,185,129,0.28)",
    };
  }

  return {
    color: "#fcd34d",
    background:
      "rgba(245,158,11,0.1)",
    borderColor:
      "rgba(245,158,11,0.25)",
  };
}

function normalizeSearchResult(data) {
  const offers = Array.isArray(
    data?.offers
  )
    ? data.offers
    : [];

  const products = Array.isArray(
    data?.products
  )
    ? data.products
    : [];

  return {
    mode: clean(data?.mode),
    query: clean(data?.query),
    city: clean(data?.city),
    citySlug: clean(data?.citySlug),

    title: clean(data?.title),

    sourceName:
      clean(data?.sourceName) ||
      "I-teka",

    sourceUrl:
      clean(data?.sourceUrl),

    message: clean(data?.message),

    disclaimer:
      clean(data?.disclaimer),

    offers,
    products,

    totalOffers:
      Number(data?.totalOffers) ||
      offers.length,

    summary:
      data?.summary &&
      typeof data.summary === "object"
        ? data.summary
        : null,

    selectedProduct:
      data?.selectedProduct || null,

    parserCode:
      clean(data?.parserCode),
  };
}

function getOfferKey(
  offer,
  index
) {
  return String(
    offer?.id ||
      [
        offer?.pharmacyName,
        offer?.address,
        offer?.price,
        index,
      ].join("-")
  );
}

export default function Medicines() {
  const [query, setQuery] =
    useState("");

  const [city, setCity] =
    useState("astana");

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const sortedOffers = useMemo(() => {
    const offers = Array.isArray(
      result?.offers
    )
      ? [...result.offers]
      : [];

    return offers.sort(
      (first, second) => {
        const firstPrice = Number(
          first?.price
        );

        const secondPrice = Number(
          second?.price
        );

        const firstHasPrice =
          Number.isFinite(firstPrice);

        const secondHasPrice =
          Number.isFinite(secondPrice);

        if (
          firstHasPrice &&
          secondHasPrice
        ) {
          return (
            firstPrice -
            secondPrice
          );
        }

        if (firstHasPrice) {
          return -1;
        }

        if (secondHasPrice) {
          return 1;
        }

        return 0;
      }
    );
  }, [result]);

  async function performSearch(
    searchValue
  ) {
    const normalizedQuery =
      clean(searchValue);

    if (!normalizedQuery) {
      setErrorMessage(
        "Введите название лекарства."
      );

      setResult(null);
      return;
    }

    if (
      normalizedQuery.length < 2
    ) {
      setErrorMessage(
        "Название лекарства должно содержать минимум два символа."
      );

      setResult(null);
      return;
    }

    if (
      normalizedQuery.length > 100
    ) {
      setErrorMessage(
        "Название лекарства не должно превышать 100 символов."
      );

      setResult(null);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setResult(null);

    try {
      const response = await api.get(
        "/medicine/search",
        {
          params: {
            q: normalizedQuery,
            city,
            priority: "price",
          },
        }
      );

      if (
        response?.data?.success !==
        true
      ) {
        throw new Error(
          response?.data?.message ||
            "Не удалось выполнить поиск лекарства."
        );
      }

      const data =
        response?.data?.data;

      if (
        !data ||
        typeof data !== "object"
      ) {
        throw new Error(
          "Сервер не вернул результат поиска."
        );
      }

      const normalizedResult =
        normalizeSearchResult(data);

      if (
        !normalizedResult.query
      ) {
        normalizedResult.query =
          normalizedQuery;
      }

      setResult(
        normalizedResult
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось получить список аптек."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    await performSearch(query);
  }

  async function handleExampleClick(
    example
  ) {
    setQuery(example);

    await performSearch(example);
  }

  function handleCityChange(
    event
  ) {
    setCity(event.target.value);
    setResult(null);
    setErrorMessage("");
  }

  function handleClear() {
    setQuery("");
    setResult(null);
    setErrorMessage("");
  }

  function handleRetry() {
    performSearch(query);
  }

  const hasOffers =
    sortedOffers.length > 0;

  const hasSummary =
    result?.summary &&
    Object.values(
      result.summary
    ).some(Boolean);

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes medicine-spinner {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 800px) {
            .medicine-page {
              padding: 22px 14px !important;
            }

            .medicine-search-form {
              grid-template-columns: 1fr !important;
            }

            .medicine-search-button {
              width: 100% !important;
            }

            .medicine-offers {
              grid-template-columns: 1fr !important;
            }

            .medicine-summary {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 480px) {
            .medicine-summary {
              grid-template-columns: 1fr !important;
            }

            .medicine-result-header {
              align-items: flex-start !important;
            }
          }
        `}
      </style>

      <main
        className="medicine-page"
        style={styles.page}
      >
        <header style={styles.header}>
          <div style={styles.titleIcon}>
            <RiCapsuleLine />
          </div>

          <div>
            <h1 style={styles.title}>
              Поиск лекарств
            </h1>

            <p style={styles.subtitle}>
              Найдите аптеки, цены,
              адреса и наличие лекарств
              в выбранном городе.
            </p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="medicine-search-form"
          style={styles.searchForm}
        >
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Город
            </label>

            <select
              value={city}
              onChange={
                handleCityChange
              }
              disabled={loading}
              style={styles.select}
            >
              {CITY_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Название лекарства
            </label>

            <div
              style={styles.inputWrapper}
            >
              <RiSearchLine
                style={styles.inputIcon}
              />

              <input
                type="search"
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Например: Парацетамол"
                autoComplete="off"
                maxLength={100}
                disabled={loading}
                style={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="medicine-search-button"
            style={{
              ...styles.searchButton,

              ...(loading
                ? styles.disabled
                : {}),
            }}
          >
            <RiSearchLine />

            {loading
              ? "Поиск..."
              : "Найти"}
          </button>
        </form>

        <div style={styles.examples}>
          <span
            style={styles.examplesLabel}
          >
            Быстрый поиск:
          </span>

          {SEARCH_EXAMPLES.map(
            (example) => (
              <button
                key={example}
                type="button"
                disabled={loading}
                onClick={() =>
                  handleExampleClick(
                    example
                  )
                }
                style={{
                  ...styles.exampleButton,

                  ...(loading
                    ? styles.disabled
                    : {}),
                }}
              >
                {example}
              </button>
            )
          )}
        </div>

        {errorMessage && (
          <section
            style={styles.errorCard}
            role="alert"
          >
            <RiInformationLine
              style={styles.errorIcon}
            />

            <div style={styles.errorContent}>
              <strong
                style={styles.errorTitle}
              >
                Ошибка поиска
              </strong>

              <p style={styles.errorText}>
                {errorMessage}
              </p>

              {query && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={loading}
                  style={styles.retryButton}
                >
                  <RiRefreshLine />

                  Повторить поиск
                </button>
              )}
            </div>
          </section>
        )}

        {loading && (
          <section
            style={styles.loadingCard}
          >
            <div
              style={styles.spinner}
            />

            <div>
              <strong
                style={styles.loadingTitle}
              >
                Получаем данные аптек
              </strong>

              <p
                style={styles.loadingText}
              >
                Поиск цен и адресов
                может занять несколько
                секунд.
              </p>
            </div>
          </section>
        )}

        {!loading && result && (
          <section
            style={styles.resultSection}
          >
            <div
              className="medicine-result-header"
              style={styles.resultHeader}
            >
              <div
                style={styles.resultIcon}
              >
                <RiCapsuleLine />
              </div>

              <div>
                <span
                  style={
                    styles.resultLabel
                  }
                >
                  Результат поиска
                </span>

                <h2
                  style={
                    styles.resultTitle
                  }
                >
                  {result.title ||
                    `Поиск «${result.query}»`}
                </h2>

                <p
                  style={
                    styles.resultDescription
                  }
                >
                  Город:{" "}
                  <strong>
                    {result.city}
                  </strong>
                </p>
              </div>
            </div>

            {hasSummary && (
              <div
                className="medicine-summary"
                style={styles.summaryGrid}
              >
                <div
                  style={styles.summaryItem}
                >
                  <span
                    style={
                      styles.summaryLabel
                    }
                  >
                    Минимальная цена
                  </span>

                  <strong
                    style={
                      styles.summaryValue
                    }
                  >
                    {result.summary
                      ?.minPrice ||
                      "Не указана"}
                  </strong>
                </div>

                <div
                  style={styles.summaryItem}
                >
                  <span
                    style={
                      styles.summaryLabel
                    }
                  >
                    Средняя цена
                  </span>

                  <strong
                    style={
                      styles.summaryValue
                    }
                  >
                    {result.summary
                      ?.avgPrice ||
                      "Не указана"}
                  </strong>
                </div>

                <div
                  style={styles.summaryItem}
                >
                  <span
                    style={
                      styles.summaryLabel
                    }
                  >
                    Максимальная цена
                  </span>

                  <strong
                    style={
                      styles.summaryValue
                    }
                  >
                    {result.summary
                      ?.maxPrice ||
                      "Не указана"}
                  </strong>
                </div>

                <div
                  style={styles.summaryItem}
                >
                  <span
                    style={
                      styles.summaryLabel
                    }
                  >
                    Количество аптек
                  </span>

                  <strong
                    style={
                      styles.summaryValue
                    }
                  >
                    {result.summary
                      ?.pharmaciesCount ||
                      result.totalOffers ||
                      0}
                  </strong>
                </div>
              </div>
            )}

            {result.message && (
              <div
                style={styles.messageBox}
              >
                {result.message}
              </div>
            )}

            {hasOffers ? (
              <>
                <div
                  style={
                    styles.offersHeader
                  }
                >
                  <div>
                    <h3
                      style={
                        styles.offersTitle
                      }
                    >
                      Аптеки и цены
                    </h3>

                    <p
                      style={
                        styles.offersSubtitle
                      }
                    >
                      Найдено предложений:{" "}
                      {sortedOffers.length}
                    </p>
                  </div>

                  <span
                    style={
                      styles.sortBadge
                    }
                  >
                    Сначала дешевле
                  </span>
                </div>

                <div
                  className="medicine-offers"
                  style={styles.offersGrid}
                >
                  {sortedOffers.map(
                    (
                      offer,
                      index
                    ) => {
                      const phone =
                        clean(
                          offer?.phone
                        );

                      const phoneHref =
                        phone
                          ? `tel:${normalizePhone(
                              phone
                            )}`
                          : "";

                      const availabilityStyle =
                        getAvailabilityStyle(
                          offer?.availability,
                          offer?.pharmacyStatus
                        );

                      return (
                        <article
                          key={getOfferKey(
                            offer,
                            index
                          )}
                          style={
                            styles.offerCard
                          }
                        >
                          <div
                            style={
                              styles.offerHeader
                            }
                          >
                            <div
                              style={
                                styles.offerIcon
                              }
                            >
                              <RiStore2Line />
                            </div>

                            <div
                              style={
                                styles.offerHeading
                              }
                            >
                              <span
                                style={
                                  styles.offerNumber
                                }
                              >
                                Аптека{" "}
                                {index + 1}
                              </span>

                              <h4
                                style={
                                  styles.pharmacyName
                                }
                              >
                                {clean(
                                  offer?.pharmacyName
                                ) ||
                                  "Аптека"}
                              </h4>
                            </div>
                          </div>

                          <div
                            style={
                              styles.productBox
                            }
                          >
                            <span
                              style={
                                styles.productLabel
                              }
                            >
                              Препарат
                            </span>

                            <strong
                              style={
                                styles.productName
                              }
                            >
                              {clean(
                                offer?.productName
                              ) ||
                                result.query}
                            </strong>
                          </div>

                          <div
                            style={
                              styles.price
                            }
                          >
                            {formatPrice(
                              offer?.price,
                              offer?.currency
                            )}
                          </div>

                          <span
                            style={{
                              ...styles.availabilityBadge,
                              ...availabilityStyle,
                            }}
                          >
                            {clean(
                              offer?.availability
                            ) ||
                              "Уточняйте наличие"}
                          </span>

                          <div
                            style={
                              styles.details
                            }
                          >
                            <div
                              style={
                                styles.detailItem
                              }
                            >
                              <RiMapPinLine
                                style={
                                  styles.detailIcon
                                }
                              />

                              <div>
                                <span
                                  style={
                                    styles.detailLabel
                                  }
                                >
                                  Адрес
                                </span>

                                <p
                                  style={
                                    styles.detailValue
                                  }
                                >
                                  {clean(
                                    offer?.address
                                  ) ||
                                    "Адрес не указан"}
                                </p>
                              </div>
                            </div>

                            <div
                              style={
                                styles.detailItem
                              }
                            >
                              <RiPhoneLine
                                style={
                                  styles.detailIcon
                                }
                              />

                              <div>
                                <span
                                  style={
                                    styles.detailLabel
                                  }
                                >
                                  Телефон
                                </span>

                                {phoneHref ? (
                                  <a
                                    href={
                                      phoneHref
                                    }
                                    style={
                                      styles.phoneLink
                                    }
                                  >
                                    {phone}
                                  </a>
                                ) : (
                                  <p
                                    style={
                                      styles.detailValue
                                    }
                                  >
                                    Не указан
                                  </p>
                                )}
                              </div>
                            </div>

                            {offer?.pharmacyStatus && (
                              <div
                                style={
                                  styles.detailItem
                                }
                              >
                                <RiInformationLine
                                  style={
                                    styles.detailIcon
                                  }
                                />

                                <div>
                                  <span
                                    style={
                                      styles.detailLabel
                                    }
                                  >
                                    Статус аптеки
                                  </span>

                                  <p
                                    style={
                                      styles.detailValue
                                    }
                                  >
                                    {
                                      offer.pharmacyStatus
                                    }
                                  </p>
                                </div>
                              </div>
                            )}

                            {offer?.updatedAt && (
                              <div
                                style={
                                  styles.detailItem
                                }
                              >
                                <RiRefreshLine
                                  style={
                                    styles.detailIcon
                                  }
                                />

                                <div>
                                  <span
                                    style={
                                      styles.detailLabel
                                    }
                                  >
                                    Обновлено
                                  </span>

                                  <p
                                    style={
                                      styles.detailValue
                                    }
                                  >
                                    {
                                      offer.updatedAt
                                    }
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {offer?.sourceUrl && (
                            <a
                              href={
                                offer.sourceUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              style={
                                styles.sourceLink
                              }
                            >
                              <RiExternalLinkLine />

                              Подробнее о предложении
                            </a>
                          )}
                        </article>
                      );
                    }
                  )}
                </div>
              </>
            ) : (
              <div
                style={styles.emptyResult}
              >
                <RiStore2Line
                  style={
                    styles.emptyResultIcon
                  }
                />

                <h3
                  style={
                    styles.emptyResultTitle
                  }
                >
                  Аптеки не найдены
                </h3>

                <p
                  style={
                    styles.emptyResultText
                  }
                >
                  {result.message ||
                    "Уточните название препарата, дозировку или форму выпуска."}
                </p>

                <button
                  type="button"
                  onClick={handleRetry}
                  style={styles.retryButton}
                >
                  <RiRefreshLine />

                  Повторить поиск
                </button>
              </div>
            )}

            <div
              style={styles.disclaimer}
            >
              <RiInformationLine
                style={
                  styles.disclaimerIcon
                }
              />

              <p
                style={
                  styles.disclaimerText
                }
              >
                {result.disclaimer ||
                  "Наличие и стоимость могут изменяться. Перед поездкой свяжитесь с аптекой."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClear}
              style={styles.clearButton}
            >
              Выполнить другой поиск
            </button>
          </section>
        )}

        {!loading &&
          !result &&
          !errorMessage && (
            <section
              style={styles.initialState}
            >
              <RiSearchLine
                style={
                  styles.initialIcon
                }
              />

              <h2
                style={
                  styles.initialTitle
                }
              >
                Найдите необходимое
                лекарство
              </h2>

              <p
                style={
                  styles.initialText
                }
              >
                Выберите город,
                введите название
                препарата и нажмите
                кнопку «Найти».
              </p>
            </section>
          )}

        <section
          style={styles.noticeCard}
        >
          <RiInformationLine
            style={styles.noticeIcon}
          />

          <div>
            <h3
              style={styles.noticeTitle}
            >
              Важная информация
            </h3>

            <p
              style={styles.noticeText}
            >
              Clinic OS не продаёт
              лекарства. Перед покупкой
              обязательно уточняйте цену,
              наличие и режим работы
              выбранной аптеки.
              Рецептурные препараты
              принимайте только по
              назначению врача.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100%",
  },

  page: {
    padding: "40px",
    color: "#ffffff",
    fontFamily:
      "'Outfit', 'Inter', sans-serif",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "28px",
  },

  titleIcon: {
    width: "52px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "15px",
    background:
      "rgba(16,185,129,0.14)",
    color: "#34d399",
    fontSize: "27px",
  },

  title: {
    margin: "0 0 7px",
    fontSize: "32px",
    fontWeight: 800,
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  searchForm: {
    display: "grid",
    gridTemplateColumns:
      "190px minmax(260px, 1fr) auto",
    alignItems: "end",
    gap: "13px",
    padding: "20px",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    background:
      "rgba(30,41,59,0.45)",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  },

  select: {
    width: "100%",
    minHeight: "46px",
    boxSizing: "border-box",
    padding: "11px 13px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "11px",
    outline: "none",
    background: "#11182e",
    color: "#ffffff",
    colorScheme: "dark",
  },

  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },

  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "#64748b",
    fontSize: "18px",
    pointerEvents: "none",
  },

  input: {
    width: "100%",
    minHeight: "46px",
    boxSizing: "border-box",
    padding: "11px 15px 11px 43px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "11px",
    outline: "none",
    background: "#11182e",
    color: "#ffffff",
  },

  searchButton: {
    minHeight: "46px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "11px 25px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(90deg, #059669, #10b981)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 750,
    whiteSpace: "nowrap",
  },

  examples: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    margin: "15px 0 25px",
  },

  examplesLabel: {
    marginRight: "3px",
    color: "#64748b",
    fontSize: "12px",
  },

  exampleButton: {
    padding: "7px 11px",
    border:
      "1px solid rgba(99,102,241,0.2)",
    borderRadius: "999px",
    background:
      "rgba(99,102,241,0.08)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontSize: "11px",
  },

  errorCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
    marginBottom: "22px",
    padding: "17px",
    border:
      "1px solid rgba(239,68,68,0.35)",
    borderRadius: "14px",
    background:
      "rgba(239,68,68,0.1)",
  },

  errorIcon: {
    flexShrink: 0,
    color: "#fca5a5",
    fontSize: "22px",
  },

  errorContent: {
    minWidth: 0,
  },

  errorTitle: {
    color: "#fecaca",
  },

  errorText: {
    margin: "5px 0 12px",
    color: "#fca5a5",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  retryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    padding: "9px 13px",
    border:
      "1px solid rgba(99,102,241,0.3)",
    borderRadius: "9px",
    background:
      "rgba(99,102,241,0.13)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  loadingCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "24px",
    border:
      "1px solid rgba(99,102,241,0.2)",
    borderRadius: "16px",
    background:
      "rgba(30,41,59,0.4)",
  },

  spinner: {
    width: "34px",
    height: "34px",
    flexShrink: 0,
    border:
      "3px solid rgba(255,255,255,0.1)",
    borderTopColor: "#818cf8",
    borderRadius: "50%",
    animation:
      "medicine-spinner 0.8s linear infinite",
  },

  loadingTitle: {
    color: "#e2e8f0",
  },

  loadingText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  resultSection: {
    padding: "26px",
    border:
      "1px solid rgba(16,185,129,0.2)",
    borderRadius: "20px",
    background:
      "rgba(30,41,59,0.46)",
  },

  resultHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "20px",
  },

  resultIcon: {
    width: "49px",
    height: "49px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "14px",
    background:
      "rgba(16,185,129,0.13)",
    color: "#34d399",
    fontSize: "25px",
  },

  resultLabel: {
    color: "#6ee7b7",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
  },

  resultTitle: {
    margin: "4px 0",
    fontSize: "22px",
  },

  resultDescription: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: "18px",
  },

  summaryItem: {
    padding: "14px",
    borderRadius: "12px",
    background:
      "rgba(2,6,23,0.26)",
  },

  summaryLabel: {
    display: "block",
    marginBottom: "5px",
    color: "#64748b",
    fontSize: "10px",
  },

  summaryValue: {
    color: "#e2e8f0",
    fontSize: "14px",
  },

  messageBox: {
    marginBottom: "18px",
    padding: "13px 15px",
    borderRadius: "11px",
    background:
      "rgba(59,130,246,0.08)",
    color: "#bfdbfe",
    fontSize: "12px",
  },

  offersHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },

  offersTitle: {
    margin: "0 0 4px",
    fontSize: "19px",
  },

  offersSubtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
  },

  sortBadge: {
    padding: "7px 11px",
    borderRadius: "999px",
    background:
      "rgba(99,102,241,0.12)",
    color: "#c7d2fe",
    fontSize: "10px",
  },

  offersGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(290px, 1fr))",
    gap: "15px",
  },

  offerCard: {
    display: "flex",
    flexDirection: "column",
    padding: "18px",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: "15px",
    background:
      "rgba(2,6,23,0.27)",
  },

  offerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  offerIcon: {
    width: "39px",
    height: "39px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "11px",
    background:
      "rgba(99,102,241,0.13)",
    color: "#a5b4fc",
    fontSize: "20px",
  },

  offerHeading: {
    minWidth: 0,
  },

  offerNumber: {
    color: "#64748b",
    fontSize: "9px",
    textTransform: "uppercase",
  },

  pharmacyName: {
    margin: "4px 0 0",
    fontSize: "15px",
    overflowWrap: "anywhere",
  },

  productBox: {
    marginTop: "15px",
    padding: "11px",
    borderRadius: "10px",
    background:
      "rgba(15,23,42,0.65)",
  },

  productLabel: {
    display: "block",
    marginBottom: "4px",
    color: "#64748b",
    fontSize: "9px",
  },

  productName: {
    color: "#cbd5e1",
    fontSize: "12px",
  },

  price: {
    margin: "17px 0 11px",
    color: "#6ee7b7",
    fontSize: "25px",
    fontWeight: 800,
  },

  availabilityBadge: {
    alignSelf: "flex-start",
    padding: "5px 9px",
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: 700,
  },

  details: {
    display: "flex",
    flexDirection: "column",
    gap: "11px",
    marginTop: "17px",
    flex: 1,
  },

  detailItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "9px",
  },

  detailIcon: {
    flexShrink: 0,
    marginTop: "2px",
    color: "#818cf8",
    fontSize: "17px",
  },

  detailLabel: {
    display: "block",
    marginBottom: "2px",
    color: "#64748b",
    fontSize: "9px",
  },

  detailValue: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "11px",
    lineHeight: 1.45,
  },

  phoneLink: {
    color: "#93c5fd",
    fontSize: "11px",
    textDecoration: "none",
  },

  sourceLink: {
    minHeight: "39px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    marginTop: "16px",
    padding: "9px 12px",
    border:
      "1px solid rgba(99,102,241,0.25)",
    borderRadius: "9px",
    background:
      "rgba(99,102,241,0.1)",
    color: "#c7d2fe",
    fontSize: "10px",
    fontWeight: 700,
    textDecoration: "none",
  },

  emptyResult: {
    padding: "38px 20px",
    border:
      "1px dashed rgba(255,255,255,0.1)",
    borderRadius: "14px",
    textAlign: "center",
  },

  emptyResultIcon: {
    color: "#64748b",
    fontSize: "34px",
  },

  emptyResultTitle: {
    margin: "10px 0 6px",
    fontSize: "17px",
  },

  emptyResultText: {
    maxWidth: "520px",
    margin: "0 auto 15px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  disclaimer: {
    display: "flex",
    alignItems: "flex-start",
    gap: "9px",
    marginTop: "18px",
    padding: "13px",
    border:
      "1px solid rgba(245,158,11,0.2)",
    borderRadius: "10px",
    background:
      "rgba(245,158,11,0.07)",
  },

  disclaimerIcon: {
    flexShrink: 0,
    marginTop: "2px",
    color: "#fbbf24",
    fontSize: "18px",
  },

  disclaimerText: {
    margin: 0,
    color: "#d6b76e",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  clearButton: {
    width: "100%",
    marginTop: "13px",
    padding: "10px 14px",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
  },

  initialState: {
    padding: "55px 25px",
    border:
      "1px dashed rgba(255,255,255,0.1)",
    borderRadius: "18px",
    background:
      "rgba(30,41,59,0.25)",
    textAlign: "center",
  },

  initialIcon: {
    marginBottom: "12px",
    color: "#6366f1",
    fontSize: "38px",
  },

  initialTitle: {
    margin: "0 0 8px",
    fontSize: "19px",
  },

  initialText: {
    maxWidth: "480px",
    margin: "0 auto",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  noticeCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginTop: "24px",
    padding: "17px",
    border:
      "1px solid rgba(59,130,246,0.15)",
    borderRadius: "14px",
    background:
      "rgba(59,130,246,0.06)",
  },

  noticeIcon: {
    flexShrink: 0,
    color: "#60a5fa",
    fontSize: "22px",
  },

  noticeTitle: {
    margin: "0 0 5px",
    color: "#bfdbfe",
    fontSize: "14px",
  },

  noticeText: {
    margin: 0,
    color: "#8295b5",
    fontSize: "11px",
    lineHeight: 1.55,
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};
