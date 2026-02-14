// src/services/ncalayer.js

export class NCALayerError extends Error {
  constructor(message, canceledByUser = false) {
    super(message);
    this.name = "NCALayerError";
    this.canceledByUser = canceledByUser;
  }
}

const WS_URL = "wss://127.0.0.1:13579/";

const basicsCMSParamsDetached = {
  encapsulate: false,
  decode: true,
  digested: false,
  tsaProfile: {},
};

const basicsSignerSignAny = { extKeyUsageOids: ["1.3.6.1.5.5.7.3.4"] };

class NCALayerClient {
  constructor() {
    this.socket = null;
    this.pending = new Map();
    this.reqId = 0;
  }

  async connect() {
    if (this.socket && this.socket.readyState === 1) return;

    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      this.socket = ws;

      ws.onopen = () => resolve();

      ws.onerror = () => {
        this.socket = null;
        reject(
          new NCALayerError(
            "Не удалось подключиться к NCALayer. Убедись, что NCALayer запущен (иконка в трее)."
          )
        );
      };

      ws.onclose = () => {
        this.socket = null;
        // Завалим все ожидающие промисы
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

        // Вариант ответа №1 (часто так):
        // { id, errorCode, responseObject, errorMessage }
        if (typeof res?.id === "number" && this.pending.has(res.id)) {
          const { resolve, reject } = this.pending.get(res.id);
          this.pending.delete(res.id);

          if (res.errorCode !== undefined && res.errorCode !== 0) {
            // иногда код 1000/1001 используют как "отмена"
            const canceled = String(res.errorMessage || "").toLowerCase().includes("cancel");
            reject(new NCALayerError(res.errorMessage || "Ошибка NCALayer", canceled));
            return;
          }

          if (res.responseObject !== undefined) {
            resolve(res.responseObject);
            return;
          }

          // если пришло без responseObject
          reject(new NCALayerError("NCALayer вернул пустой ответ (нет responseObject)."));
          return;
        }

        // Вариант ответа №2 (встречается):
        // { status: true/false, body: { result: [...] }, id? }
        // Иногда id может не совпасть/отсутствовать => пытаемся привязать к первому ожидающему
        if (res?.status === true && res?.body?.result) {
          const firstPendingId = this.pending.keys().next().value;
          if (firstPendingId !== undefined) {
            const { resolve } = this.pending.get(firstPendingId);
            this.pending.delete(firstPendingId);

            // обычно result[0] и есть подпись
            resolve(res.body.result[0]);
          }
          return;
        }

        if (res?.status === false) {
          const firstPendingId = this.pending.keys().next().value;
          if (firstPendingId !== undefined) {
            const { reject } = this.pending.get(firstPendingId);
            this.pending.delete(firstPendingId);
            reject(new NCALayerError(res?.body?.message || "NCALayer вернул status=false"));
          }
        }
      };
    });
  }

  send(request) {
    if (!this.socket || this.socket.readyState !== 1) {
      return Promise.reject(new NCALayerError("NCALayer не подключен."));
    }

    const id = ++this.reqId;
    request.id = id;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(request));
    });
  }

  // Проверка доступности
  async getVersion() {
    await this.connect();
    return this.send({
      module: "kz.gov.pki.knca.commonUtils",
      method: "getVersion",
      args: {},
    });
  }

  // ✅ Реальное подписание через basics.sign (CMS)
  async basicsSignCMS(base64Data, locale = "ru") {
    await this.connect();

    const request = {
      module: "kz.gov.pki.knca.basics",
      method: "sign",
      args: {
        allowedStorages: "PKCS12", // файловый ключ (.p12)
        format: "cms",
        data: base64Data,
        signingParams: basicsCMSParamsDetached,
        signerParams: basicsSignerSignAny,
        locale,
      },
    };

    return this.send(request);
  }
}

export const nca = new NCALayerClient();

// Текст, который подписываем (можно заменить на JSON с nonce от сервера)
export function makeLoginPayload() {
  const text = `LOGIN|health-card|ts=${new Date().toISOString()}|nonce=${Math.random()
    .toString(36)
    .slice(2)}`;
  return btoa(unescape(encodeURIComponent(text)));
}
