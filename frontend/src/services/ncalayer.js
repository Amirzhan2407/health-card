// src/services/ncalayer.js

export class NCALayerError extends Error {
  constructor(message, canceledByUser = false) {
    super(message);
    this.name = "NCALayerError";
    this.canceledByUser = canceledByUser;
  }
}

const WS_URLS = ["wss://127.0.0.1:13579/", "ws://127.0.0.1:13579/"];

const basicsCMSParamsDetached = {
  encapsulate: false,
  decode: true,
  digested: false,
  tsaProfile: {},
};

const basicsSignerSignAny = {
  extKeyUsageOids: ["1.3.6.1.5.5.7.3.4"],
};

class NCALayerClient {
  constructor() {
    this.socket = null;
    this.pending = new Map();
    this.reqId = 0;
    this.connectingPromise = null;
    this.queue = Promise.resolve();
  }

  enqueue(fn) {
    this.queue = this.queue.then(fn, fn);
    return this.queue;
  }

  async ensureConnected() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    if (this.connectingPromise) return this.connectingPromise;

    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    this.connectingPromise = new Promise((resolve, reject) => {
      const tryUrl = (idx) => {
        const url = WS_URLS[idx];
        const ws = new WebSocket(url);
        this.socket = ws;

        ws.onopen = () => {
          this.connectingPromise = null;
          resolve();
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };

        ws.onclose = () => {
          if (this.connectingPromise) {
            if (idx + 1 < WS_URLS.length) {
              return tryUrl(idx + 1);
            }

            this.connectingPromise = null;
            this.socket = null;
            reject(
              new NCALayerError(
                "Не удалось подключиться к NCALayer. Убедись, что NCALayer запущен."
              )
            );
            return;
          }

          this.socket = null;
          for (const { reject } of this.pending.values()) {
            reject(new NCALayerError("Соединение с NCALayer закрыто."));
          }
          this.pending.clear();
        };

        ws.onmessage = (event) => {
          let res;
          try {
            res = JSON.parse(event.data);
          } catch {
            return;
          }

          const id = typeof res?.id === "number" ? res.id : null;

          const pickPendingIdFallback = () => {
            const ids = Array.from(this.pending.keys());
            if (ids.length === 0) return null;
            if (ids.length === 1) return ids[0];
            return ids[ids.length - 1];
          };

          const targetId =
            id !== null && this.pending.has(id) ? id : pickPendingIdFallback();

          if (targetId === null || !this.pending.has(targetId)) return;

          const { resolve, reject } = this.pending.get(targetId);
          this.pending.delete(targetId);

          if (res?.errorCode !== undefined) {
            if (res.errorCode !== 0) {
              const msg = res.errorMessage || "Ошибка NCALayer";
              const canceled =
                String(msg).toLowerCase().includes("cancel") ||
                String(msg).toLowerCase().includes("отмен");
              reject(new NCALayerError(msg, canceled));
              return;
            }

            resolve(res.responseObject);
            return;
          }

          if (res?.status === true) {
            const r = res?.body?.result;
            if (Array.isArray(r) && r.length) {
              resolve(r[0]);
              return;
            }
            resolve(res);
            return;
          }

          if (res?.status === false) {
            reject(
              new NCALayerError(
                res?.body?.message || "NCALayer вернул status=false"
              )
            );
            return;
          }

          resolve(res);
        };
      };

      tryUrl(0);
    });

    return this.connectingPromise;
  }

  async send(request, timeoutMs = 60000) {
    await this.ensureConnected();

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new NCALayerError("NCALayer не подключен.");
    }

    const id = ++this.reqId;
    const req = { ...request, id };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      try {
        this.socket.send(JSON.stringify(req));
      } catch {
        this.pending.delete(id);
        reject(new NCALayerError("Не удалось отправить запрос в NCALayer."));
        return;
      }

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new NCALayerError("NCALayer не ответил (таймаут)."));
        }
      }, timeoutMs);
    });
  }

  async getVersion() {
    return this.enqueue(async () => {
      return this.send({
        module: "kz.gov.pki.knca.commonUtils",
        method: "getVersion",
        args: {},
      });
    });
  }

  async basicsSignCMS(base64Data, locale = "ru") {
    return this.enqueue(async () => {
      return this.send(
        {
          module: "kz.gov.pki.knca.basics",
          method: "sign",
          args: {
            allowedStorages: "PKCS12",
            format: "cms",
            data: base64Data,
            signingParams: basicsCMSParamsDetached,
            signerParams: basicsSignerSignAny,
            locale,
          },
        },
        120000
      );
    });
  }

  // Надёжное чтение данных сертификата
  async getKeyInfo() {
    return this.enqueue(async () => {
      return this.send(
        {
          module: "kz.gov.pki.knca.commonUtils",
          method: "getKeyInfo",
          args: ["PKCS12"],
        },
        120000
      );
    });
  }
}

export const nca = new NCALayerClient();

export function makeLoginPayload() {
  const text = `LOGIN|health-card|ts=${new Date().toISOString()}|nonce=${Math.random()
    .toString(36)
    .slice(2)}`;
  return btoa(unescape(encodeURIComponent(text)));
}

// ----------------------
// helpers
// ----------------------

function formatUTCTimeToRu(utcTime) {
  const m = String(utcTime || "").match(/^(\d{2})(\d{2})(\d{2})\d{6}Z$/);
  if (!m) return "—";

  const yy = Number(m[1]);
  const mm = m[2];
  const dd = m[3];
  const yyyy = yy >= 50 ? `19${m[1]}` : `20${m[1]}`;

  return `${dd}.${mm}.${yyyy}`;
}

function normalizeSpaces(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeName(text) {
  return normalizeSpaces(text).toUpperCase();
}

function getDnValue(subjectDn, key) {
  const dn = String(subjectDn || "");
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|,)\\s*${escapedKey}=([^,]+)`, "i");
  const match = dn.match(regex);
  return match ? match[1].trim() : "";
}

function findFirstStringDeep(obj, preferredKeys = []) {
  if (!obj || typeof obj !== "object") return "";

  for (const key of preferredKeys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  for (const value of Object.values(obj)) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (value && typeof value === "object") {
      const nested = findFirstStringDeep(value, preferredKeys);
      if (nested) return nested;
    }
  }

  return "";
}

function findAllStringsDeep(obj, acc = []) {
  if (obj == null) return acc;

  if (typeof obj === "string") {
    const v = obj.trim();
    if (v) acc.push(v);
    return acc;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) findAllStringsDeep(item, acc);
    return acc;
  }

  if (typeof obj === "object") {
    for (const value of Object.values(obj)) {
      findAllStringsDeep(value, acc);
    }
  }

  return acc;
}

function extractIinFromText(text) {
  const match = String(text || "").match(/\b\d{12}\b/);
  return match ? match[0] : "";
}

function parseKeyInfoDate(raw) {
  const text = String(raw || "").trim();
  if (!text) return "—";

  // 2026-09-22T12:10:52
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;

  // 22.09.2026 12:10:52
  m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[1]}.${m[2]}.${m[3]}`;

  // 260922071052Z
  m = text.match(/^(\d{2})(\d{2})(\d{2})\d{6}Z$/);
  if (m) {
    const yy = Number(m[1]);
    const yyyy = yy >= 50 ? `19${m[1]}` : `20${m[1]}`;
    return `${m[3]}.${m[2]}.${yyyy}`;
  }

  return text;
}

export function mapKeyInfo(raw) {
  const allStrings = findAllStringsDeep(raw);

  const subjectDn =
    findFirstStringDeep(raw, ["subjectDn", "subjectDN", "dn", "subject"]) || "";

  const uniqueName =
    findFirstStringDeep(raw, [
      "uniqueName",
      "ownerName",
      "subjectCn",
      "subjectCN",
      "cn",
      "commonName",
    ]) || "";

  const serialNumber = getDnValue(subjectDn, "SERIALNUMBER");

  // 1. ФИО: сначала берем uniqueName, потому что по скрину именно там правильное имя
  let fullName = "—";

  if (uniqueName) {
    fullName = normalizeName(uniqueName);
  } else {
    const cn = getDnValue(subjectDn, "CN");
    if (cn) {
      fullName = normalizeName(cn);
    }
  }

  // 2. ИИН
  let iin = extractIinFromText(serialNumber);

  if (!iin) {
    iin = extractIinFromText(subjectDn);
  }

  if (!iin) {
    for (const s of allStrings) {
      iin = extractIinFromText(s);
      if (iin) break;
    }
  }

  // 3. Срок действия
  const rawNotAfter =
    findFirstStringDeep(raw, [
      "notAfter",
      "validTo",
      "expiredDate",
      "expireDate",
      "endDate",
    ]) || "";

  let certExpire = "—";

  if (rawNotAfter) {
    const num = String(rawNotAfter).trim();

    // если timestamp в миллисекундах, как 1758525052000
    if (/^\d{13}$/.test(num)) {
      const d = new Date(Number(num));
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      certExpire = `${dd}.${mm}.${yyyy}`;
    } else {
      certExpire = parseKeyInfoDate(rawNotAfter);
    }
  }

  return {
    fullName: fullName || "—",
    iin: iin || "—",
    certExpire,
    subjectDn,
    raw,
  };
}

// ----------------------
// CMS fallback для ИИН/срока
// ----------------------

function pemToBase64(text) {
  return String(text || "")
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToUtf8Loose(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function extractIin(decodedText) {
  const match = String(decodedText || "").match(/IIN(\d{12})/);
  if (match) return match[1];

  const fallback = String(decodedText || "").match(/\b\d{12}\b/);
  return fallback ? fallback[0] : "—";
}

function extractDates(decodedText) {
  const allMatches = [...String(decodedText || "").matchAll(/\d{12}Z/g)].map(
    (m) => ({
      value: m[0],
      index: m.index ?? -1,
    })
  );

  if (!allMatches.length) {
    return { notBefore: "", notAfter: "" };
  }

  const iinIndex = String(decodedText || "").indexOf("IIN");

  if (iinIndex !== -1) {
    const nearby = allMatches.filter(
      (item) => item.index >= iinIndex - 1200 && item.index <= iinIndex + 2000
    );

    if (nearby.length >= 2) {
      return {
        notBefore: nearby[0].value,
        notAfter: nearby[1].value,
      };
    }
  }

  if (allMatches.length >= 2) {
    return {
      notBefore: allMatches[0].value,
      notAfter: allMatches[1].value,
    };
  }

  return {
    notBefore: "",
    notAfter: "",
  };
}

export function parseCmsSignature(signatureText) {
  try {
    const cleanBase64 = pemToBase64(signatureText);
    if (!cleanBase64) {
      throw new Error("Пустая CMS подпись");
    }

    const bytes = base64ToBytes(cleanBase64);
    const decodedText = bytesToUtf8Loose(bytes);

    const iin = extractIin(decodedText);
    const { notAfter } = extractDates(decodedText);

    const result = {
      iin: iin || "—",
      certExpire: formatUTCTimeToRu(notAfter),
    };

    console.log("CMS decoded profile:", result);
    return result;
  } catch (e) {
    console.error("Ошибка извлечения данных из CMS:", e);
    console.log("RAW SIGNATURE:", signatureText);

    return {
      iin: "—",
      certExpire: "—",
    };
  }
}