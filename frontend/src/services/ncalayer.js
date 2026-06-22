const NCALAYER_URL = "wss://127.0.0.1:13579/";

/**
 * Service to interact with the local NCALayer application via WebSocket
 */
class NCALayerService {
  constructor() {
    this.socket = null;
    this.callbacks = {};
    this.requestId = 1;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        return resolve();
      }

      this.socket = new WebSocket(NCALAYER_URL);

      this.socket.onopen = () => {
        console.log("NCALayer WebSocket connected.");
        resolve();
      };

      this.socket.onerror = (err) => {
        console.error("NCALayer WebSocket error:", err);
        reject(new Error("NCALayer не запущен или недоступен. Пожалуйста, запустите NCALayer."));
      };

      this.socket.onclose = () => {
        console.log("NCALayer WebSocket closed.");
        this.socket = null;
      };

      this.socket.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          // Match response to the request via response id or method callback
          // NCALayer usually returns responses in the format: { status: '...', result: '...' }
          // Let's call all pending resolve callbacks
          const pendingIds = Object.keys(this.callbacks);
          if (pendingIds.length > 0) {
            const nextId = pendingIds[0];
            const { resolve: resCb, reject: rejCb } = this.callbacks[nextId];
            delete this.callbacks[nextId];

            if (response.status === "200" || response.result) {
              resCb(response.result);
            } else {
              rejCb(new Error(response.message || "Ошибка выполнения операции в NCALayer."));
            }
          }
        } catch (err) {
          console.error("Failed to parse NCALayer message:", err);
        }
      };
    });
  }

  sendRequest(method, args) {
    return this.connect().then(() => {
      return new Promise((resolve, reject) => {
        const id = this.requestId++;
        this.callbacks[id] = { resolve, reject };

        const payload = {
          module: "kz.gov.pki.knca.commonUtils",
          method,
          args,
        };

        this.socket.send(JSON.stringify(payload));
      });
    });
  }

  async getActiveKeys() {
    return this.sendRequest("getKeyInfo", ["PKCS12"]);
  }

  async signData(dataBase64) {
    // Basics sign CMS
    return this.sendRequest("createSignature", [
      "PKCS12",
      "SIGN",
      dataBase64,
      "ru"
    ]);
  }
}

export default new NCALayerService();