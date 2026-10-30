// storageRepository.js - Repositório Durável em IndexedDB para ACKs e Logs CCO (SamaeCCOStorageDB)

const CCO_DB_NAME = "SamaeCCOStorageDB";
const CCO_DB_VERSION = 1;

class StorageRepository {
  async abrirDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CCO_DB_NAME, CCO_DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("reconhecidos") || !db.objectStoreNames.contains("logs")) {
          db.close();
          const deleteReq = indexedDB.deleteDatabase(CCO_DB_NAME);
          deleteReq.onsuccess = () => {
            const retryReq = indexedDB.open(CCO_DB_NAME, CCO_DB_VERSION);
            retryReq.onerror = () => reject(retryReq.error);
            retryReq.onsuccess = (e) => resolve(e.target.result);
            retryReq.onupgradeneeded = (ev) => {
              const newDb = ev.target.result;
              if (!newDb.objectStoreNames.contains("reconhecidos")) {
                newDb.createObjectStore("reconhecidos", { keyPath: "chave" });
              }
              if (!newDb.objectStoreNames.contains("logs")) {
                newDb.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
              }
            };
          };
          deleteReq.onerror = () => reject(deleteReq.error);
          return;
        }
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("reconhecidos")) {
          db.createObjectStore("reconhecidos", { keyPath: "chave" });
        }
        if (!db.objectStoreNames.contains("logs")) {
          db.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
        }
      };
    });
  }

  async carregarReconhecidos() {
    try {
      const db = await this.abrirDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("reconhecidos", "readonly");
        const store = transaction.objectStore("reconhecidos");
        const req = store.getAll();
        req.onsuccess = () => {
          const map = new Map();
          const list = req.result || [];
          for (const item of list) {
            map.set(item.chave, item.severidade);
          }
          resolve(map);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("Erro ao carregar reconhecidos do IndexedDB, fallback para localStorage", e);
      // Fallback para localStorage se IndexedDB falhar
      try {
        const salvos = localStorage.getItem("samae_cco_reconhecidos");
        if (salvos) {
          const obj = JSON.parse(salvos);
          return new Map(Object.entries(obj));
        }
      } catch(err) {}
      return new Map();
    }
  }

  async salvarReconhecido(chave, severidade) {
    try {
      const db = await this.abrirDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("reconhecidos", "readwrite");
        const store = transaction.objectStore("reconhecidos");
        const req = store.put({ chave, severidade, timestamp: Date.now() });
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("Erro ao salvar reconhecido no IndexedDB", e);
    }
    // Backup localStorage
    try {
      if (window.ccoReconhecidos) {
        const obj = Object.fromEntries(window.ccoReconhecidos.entries());
        localStorage.setItem("samae_cco_reconhecidos", JSON.stringify(obj));
      }
    } catch(err) {}
  }

  async removerReconhecido(chave) {
    try {
      const db = await this.abrirDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("reconhecidos", "readwrite");
        const store = transaction.objectStore("reconhecidos");
        const req = store.delete(chave);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("Erro ao remover reconhecido do IndexedDB", e);
    }
    try {
      if (window.ccoReconhecidos) {
        const obj = Object.fromEntries(window.ccoReconhecidos.entries());
        localStorage.setItem("samae_cco_reconhecidos", JSON.stringify(obj));
      }
    } catch(err) {}
  }

  async carregarLogs() {
    try {
      const db = await this.abrirDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("logs", "readonly");
        const store = transaction.objectStore("logs");
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      try {
        const logsSalvos = localStorage.getItem("samae_cco_incidents_log");
        if (logsSalvos) return JSON.parse(logsSalvos);
      } catch(err) {}
      return [];
    }
  }

  async salvarLog(logItem) {
    try {
      const db = await this.abrirDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("logs", "readwrite");
        const store = transaction.objectStore("logs");
        const req = store.add({ ...logItem, timestamp: logItem.timestamp || Date.now() });
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("Erro ao salvar log no IndexedDB", e);
    }
    try {
      if (window.samaeIncidentsLog) {
        localStorage.setItem("samae_cco_incidents_log", JSON.stringify(window.samaeIncidentsLog));
      }
    } catch(err) {}
  }
}

window.StorageRepository = new StorageRepository();
