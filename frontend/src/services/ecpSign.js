const NCALAYER_WS = "wss://127.0.0.1:13579/";

function logJson(prefix, obj) {
  try {
    console.log(prefix + " " + JSON.stringify(obj, null, 2));
  } catch {
    console.log(prefix, obj);
  }
}

function wsCall(payload, timeoutMs = 60000) {
  logJson("NCALayer REQUEST =>", payload);

  return new Promise((resolve, reject) => {
    let ws;
    let finished = false;

    const finish = (ok, data) => {
      if (finished) return;
      finished = true;
      try { ws?.close(); } catch {}
      ok ? resolve(data) : reject(data);
    };

    try {
      ws = new WebSocket(NCALAYER_WS);
    } catch {
      finish(false, new Error("NCALayer недоступен: WebSocket не создаётся"));
      return;
    }

    const timer = setTimeout(() => {
      finish(false, new Error("NCALayer timeout (нет ответа)"));
    }, timeoutMs);

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify(payload));
      } catch {
        clearTimeout(timer);
        finish(false, new Error("Не удалось отправить запрос в NCALayer"));
      }
    };

    ws.onmessage = (event) => {
      clearTimeout(timer);
      try {
        const res = JSON.parse(event.data);
        logJson("NCALayer RESPONSE <=", res);

        if (res?.errorCode) {
          finish(false, new Error(res.errorMessage || "Ошибка NCALayer"));
          return;
        }

        finish(true, res?.responseObject ?? res);
      } catch {
        finish(false, new Error("Некорректный ответ NCALayer (JSON)"));
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      finish(false, new Error("WebSocket error: проверь NCALayer/Firewall"));
    };
  });
}

export async function getVersion() {
  const res = await wsCall({
    module: "kz.gov.pki.knca.commonUtils",
    method: "getVersion",
    args: {}
  }, 2500);

  return typeof res === "string" ? res : JSON.stringify(res);
}

// Получаем доступные хранилища/токены (часто это триггерит UI/готовность)
export async function getActiveTokens() {
  const res = await wsCall({
    module: "kz.gov.pki.knca.commonUtils",
    method: "getActiveTokens",
    args: {}
  }, 5000);

  return res;
}

// Подпись с ЯВНЫМ storageType
export async function signXmlAuth() {
  const ts = new Date().toISOString();
  const nonce = Math.random().toString(36).slice(2);

  const xml = `<login>
  <service>health-card</service>
  <ts>${ts}</ts>
  <nonce>${nonce}</nonce>
</login>`;

  const tokens = await getActiveTokens();
  // Если токенов нет — обычно нужно файловое хранилище PKCS12
  const storageType =
    (Array.isArray(tokens) && tokens[0]) ? tokens[0] : "PKCS12";

  const res = await wsCall({
    module: "kz.gov.pki.knca.commonUtils",
    method: "signXml",
    args: {
      storageType,          // <-- ВАЖНО!
      xml,
      signingType: "AUTH"
    }
  }, 60000);

  if (typeof res === "string") return res;
  if (res?.signedXml) return String(res.signedXml);
  if (res?.xml) return String(res.xml);

  return JSON.stringify(res);
}
