export interface TypesBoolean {
  log: boolean;
  info: boolean;
  warn: boolean;
  error: boolean;
  debug: boolean;
  fatal: boolean;
}

export interface TypesString {
  log: string;
  info: string;
  warn: string;
  error: string;
  debug: string;
  fatal: string;
}

export type LogTypeBoolean = keyof TypesBoolean;
// type LogTypeString = keyof TypesString;
export interface LoggerOptions {
  context: string;
  dbName: string;
  storeName: string;
  logEnabled: TypesBoolean;
  saveEnabled: TypesBoolean;
  traceEnabled: TypesBoolean;
  saveTraceInDB: TypesBoolean;
  useWorkerForSave: boolean;
  debugWorker: boolean;
  useStyles: boolean;
  customStyles: TypesString;
  additionalInfo: object;
  callback: (logEntry: object) => void;
  batch: {
    enabled: boolean;
    batchSize: number;
    batchInterval: number;
    batchCallback: (logs: object[]) => void;
  };
}

export const mockLoggerOptions: LoggerOptions = {
  context: 'global',
  dbName: 'LoggerDB',
  storeName: 'logs',
  logEnabled: {
    log: true,
    info: true,
    warn: true,
    error: true,
    debug: true,
    fatal: true
  },
  saveEnabled: {
    log: true,
    info: true,
    warn: true,
    error: true,
    debug: true,
    fatal: true
  },
  traceEnabled: {
    log: false,
    info: false,
    warn: false,
    error: false,
    debug: false,
    fatal: false
  },
  saveTraceInDB: {
    log: false,
    info: false,
    warn: false,
    error: false,
    debug: false,
    fatal: false
  },
  useWorkerForSave: false,
  debugWorker: false,
  useStyles: true,
  customStyles: {
    log: 'color: black',
    info: 'color: blue',
    warn: 'color: orange',
    error: 'color: red',
    debug: 'color: green',
    fatal: 'color: white; font-weight: bold; background: #660000; padding: 5px; border-radius: 3px;'
  },
  additionalInfo: {},
  callback: () => { },
  batch: {
    enabled: false,
    batchSize: 10,
    batchInterval: 5000,
    batchCallback: () => { }
  }
};

export class Logger {
  static instances: Map<string, Logger> = new Map();
  dbInitializedPromise!: Promise<IDBDatabase>;

  static getInstance({
    context,
    ...options
  }: LoggerOptions = mockLoggerOptions): Logger {
    if (!Logger.instances.has(context)) {
      Logger.instances.set(context, new Logger({ context, ...options }));
    }
    return Logger.instances.get(context)!;
  }

  context!: string;
  dbName!: string;
  storeName!: string;
  db!: IDBDatabase | null;
  worker!: Worker | null;
  useWorkerForSave!: boolean;
  debugWorker!: boolean;
  useStyles!: boolean;
  loggerId!: string;
  additionalInfo!: object;
  batch!: {
    enabled: boolean;
    batchSize: number;
    batchInterval: number;
    batchCallback: (logs: object[]) => void;
  };
  logBuffer!: object[];
  batchTimer!: number | null;
  isFlushing!: boolean;
  logEnabled!: TypesBoolean;
  saveEnabled!: TypesBoolean;
  traceEnabled!: TypesBoolean;
  saveTraceInDB!: TypesBoolean;
  customStyles!: TypesString;
  callback!: (logEntry: object) => void;

  constructor({
    context = mockLoggerOptions.context,
    dbName = mockLoggerOptions.dbName,
    storeName = mockLoggerOptions.storeName,
    logEnabled = mockLoggerOptions.logEnabled,
    saveEnabled = mockLoggerOptions.saveEnabled,
    traceEnabled = mockLoggerOptions.traceEnabled,
    saveTraceInDB = mockLoggerOptions.saveTraceInDB,
    useWorkerForSave = mockLoggerOptions.useWorkerForSave,
    debugWorker = mockLoggerOptions.debugWorker,
    useStyles = mockLoggerOptions.useStyles,
    customStyles = mockLoggerOptions.customStyles,
    additionalInfo = mockLoggerOptions.additionalInfo,
    callback = mockLoggerOptions.callback,
    batch = mockLoggerOptions.batch
  }: LoggerOptions = mockLoggerOptions) {
    if (Logger.instances.has(context)) {
      return Logger.instances.get(context)!;
    }

    this.context = context;
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.worker = null;
    this.useWorkerForSave = useWorkerForSave;
    this.debugWorker = debugWorker;
    this.useStyles = useStyles;
    this.loggerId = this.generateUniqueId();
    this.additionalInfo = additionalInfo;

    this.batch = {
      enabled: batch.enabled || false,
      batchSize: batch.batchSize || 10,
      batchInterval: batch.batchInterval || 5000,
      batchCallback: batch.batchCallback || (() => { })
    };

    this.logBuffer = [];
    this.batchTimer = null;
    this.isFlushing = false;

    this.logEnabled = {
      log: logEnabled.log !== undefined ? logEnabled.log : true,
      info: logEnabled.info !== undefined ? logEnabled.info : true,
      warn: logEnabled.warn !== undefined ? logEnabled.warn : true,
      error: logEnabled.error !== undefined ? logEnabled.error : true,
      debug: logEnabled.debug !== undefined ? logEnabled.debug : true,
      fatal: logEnabled.fatal !== undefined ? logEnabled.fatal : true
    };

    this.saveEnabled = {
      log: saveEnabled.log !== undefined ? saveEnabled.log : true,
      info: saveEnabled.info !== undefined ? saveEnabled.info : true,
      warn: saveEnabled.warn !== undefined ? saveEnabled.warn : true,
      error: saveEnabled.error !== undefined ? saveEnabled.error : true,
      debug: saveEnabled.debug !== undefined ? saveEnabled.debug : true,
      fatal: saveEnabled.fatal !== undefined ? saveEnabled.fatal : true
    };

    this.traceEnabled = {
      log: traceEnabled.log !== undefined ? traceEnabled.log : false,
      info: traceEnabled.info !== undefined ? traceEnabled.info : false,
      warn: traceEnabled.warn !== undefined ? traceEnabled.warn : false,
      error: traceEnabled.error !== undefined ? traceEnabled.error : false,
      debug: traceEnabled.debug !== undefined ? traceEnabled.debug : false,
      fatal: traceEnabled.fatal !== undefined ? traceEnabled.fatal : false
    };

    this.saveTraceInDB = {
      log: saveTraceInDB.log !== undefined ? saveTraceInDB.log : false,
      info: saveTraceInDB.info !== undefined ? saveTraceInDB.info : false,
      warn: saveTraceInDB.warn !== undefined ? saveTraceInDB.warn : false,
      error: saveTraceInDB.error !== undefined ? saveTraceInDB.error : false,
      debug: saveTraceInDB.debug !== undefined ? saveTraceInDB.debug : false,
      fatal: saveTraceInDB.fatal !== undefined ? saveTraceInDB.fatal : false
    };

    this.customStyles = {
      log: customStyles.log || 'color: black',
      info: customStyles.info || 'color: blue',
      warn: customStyles.warn || 'color: orange',
      error: customStyles.error || 'color: red',
      debug: customStyles.debug || 'color: green',
      fatal: customStyles.fatal || 'color: white; font-weight: bold; background: #660000; padding: 5px; border-radius: 3px;'
    };

    this.callback = callback || (() => { });
    if (typeof Worker !== 'undefined' && this.useWorkerForSave) {
      this.worker = this.createWorker();
      this.worker.onmessage = this.handleWorkerResponse.bind(this);
      this.worker.postMessage({
        type: 'config',
        config: {
          dbName: this.dbName,
          storeName: this.storeName,
          debugWorker: this.debugWorker
        }
      });
    } else {
      this.dbInitializedPromise = this.initDB();
    }

    Logger.instances.set(context, this);
  }

  generateUniqueId(): string {
    return `logger-${this.context}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  createWorker(): Worker {
    const workerCode = `
      let db = null;
      let dbName = 'LoggerDB';
      let storeName = 'logs';
      let debugWorker = false;

      function initDB() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(dbName, 1);

          request.onerror = (event) => {
            if (debugWorker) {
              console.error('Error al abrir IndexedDB en Worker', event);
            }
            reject(event);
          };

          request.onsuccess = (event) => {
            db = event.target.result;
            if (debugWorker) {
              console.log('IndexedDB inicializada en Worker.');
            }
            resolve(db);
          };

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
              const objectStore = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
              objectStore.createIndex('timestamp', 'timestamp', { unique: false });
              objectStore.createIndex('type', 'type', { unique: false });
              objectStore.createIndex('context', 'context', { unique: false });
              objectStore.createIndex('context_type', ['context', 'type'], { unique: false });
            }
          };
        });
      }

      async function saveLog(logEntries) {
        if (!db) {
          await initDB();
        }

        const logsArray = Array.isArray(logEntries) ? logEntries : [logEntries];

        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const objectStore = transaction.objectStore(storeName);

          let errorOccurred = false;

          logsArray.forEach(logEntry => {
            const request = objectStore.add(logEntry);

            request.onerror = (event) => {
              if (debugWorker) {
                console.error('Error al guardar log en Worker:', event);
              }
              errorOccurred = true;
            };
          });

          transaction.oncomplete = () => {
            if (errorOccurred) {
              reject('Uno o más logs no pudieron ser agregados en el Worker');
            } else {
              resolve('Todos los logs fueron agregados correctamente en el Worker');
            }
          };

          transaction.onerror = (event) => {
            console.error('Error en la transacción en Worker:', event);
            reject(event);
          };
        });
      }

      async function exportLogs(all, context, logType) {
        if (!db) {
          await initDB();
        }

        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readonly');
          const objectStore = transaction.objectStore(storeName);

          let request;

          if (all) {
            if (logType === 'all') {
              request = objectStore.getAll();
            } else {
              const index = objectStore.index('type');
              request = index.openCursor(IDBKeyRange.only(logType));
            }
          } else {
            if (logType === 'all') {
              const index = objectStore.index('context');
              request = index.openCursor(IDBKeyRange.only(context));
            } else {
              const index = objectStore.index('context_type');
              request = IDBKeyRange.bound([context, logType], [context, logType]);
              request = index.openCursor(request);
            }
          }

          const logs = [];

          request.onsuccess = (event) => {
            const result = event.target.result;

            if (all) {
              if (logType === 'all') {
                logs.push(...result);
                postMessage({ type: 'export', logs });
                resolve();
              } else {
                const cursor = result;
                if (cursor) {
                  logs.push(cursor.value);
                  cursor.continue();
                } else {
                  postMessage({ type: 'export', logs });
                  resolve();
                }
              }
            } else {
              const cursor = result;
              if (cursor) {
                logs.push(cursor.value);
                cursor.continue();
              } else {
                postMessage({ type: 'export', logs });
                resolve();
              }
            }
          };

          request.onerror = (event) => {
            if (debugWorker) {
              console.error('Error al exportar logs en Worker', event);
            }
            reject(event);
          };
        });
      }

      async function deleteOldLogs(thresholdDate) {
        if (!db) {
          await initDB();
        }

        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const objectStore = transaction.objectStore(storeName);
          const index = objectStore.index('timestamp');
          const request = index.openCursor(IDBKeyRange.upperBound(thresholdDate));

          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              objectStore.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              postMessage({ type: 'deleteOldLogs' });
              resolve();
            }
          };

          request.onerror = (event) => {
            if (debugWorker) {
              console.error('Error al eliminar logs antiguos en Worker', event);
            }
            reject(event);
          };
        });
      }

      onmessage = function (event) {
        const { type, logEntry, config, context, all, thresholdDate, logType } = event.data;

        if (type === 'config') {
          dbName = config.dbName || dbName;
          storeName = config.storeName || storeName;
          debugWorker = config.debugWorker || debugWorker;
        } else if (type === 'save') {
          saveLog(logEntry)
            .then(() => postMessage({ status: 'success', logEntry }))
            .catch((err) => postMessage({ status: 'error', error: err }));
        } else if (type === 'export') {
          exportLogs(all, context, logType);
        } else if (type === 'deleteOldLogs') {
          deleteOldLogs(thresholdDate);
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    return new Worker(workerUrl);
  }

  handleWorkerResponse(event: MessageEvent): void {
    const { status, logEntry, error } = event.data;
    if (!this.debugWorker) { return; }
    if (status === 'success') {
      console.log('Log guardado correctamente en Worker:', logEntry);
    } else {
      console.error('Error en Worker al guardar log:', error);
    }
  }

  initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = (event) => {
        if (this.useWorkerForSave) {
          console.error('Error al abrir IndexedDB en Worker', event);
        }
        reject(event);
      };

      request.onsuccess = (event) => {
        // @ts-ignore
        this.db = event.target?.result;
        if (this.useWorkerForSave) {
          console.log('IndexedDB inicializada en Worker.');
        }
        if (!this.db) {
          console.error('Error al abrir IndexedDB:', event);
          reject(event);
          return;
        }
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        // @ts-ignore
        const db = event.target?.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('type', 'type', { unique: false });
          objectStore.createIndex('context', 'context', { unique: false });
          objectStore.createIndex('context_type', ['context', 'type'], { unique: false });
        }
      };
    });
  }

  async waitForDBInitialization(): Promise<IDBDatabase> {
    return this.dbInitializedPromise!;
  }

  getTrace(): string {
    const error = new Error();
    return error.stack!.split('\n').slice(2).join('\n');
  }

  async addLog(logs: object | object[]): Promise<string> {
    await this.waitForDBInitialization();

    const logsArray = Array.isArray(logs) ? logs : [logs];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);

      let errorOccurred = false;

      logsArray.forEach(log => {
        const request = objectStore.add(log);

        request.onerror = (event) => {
          console.error('Error al agregar log:', event);
          errorOccurred = true;
        };
      });

      transaction.oncomplete = () => {
        if (errorOccurred) {
          reject('Uno o más logs no pudieron ser agregados');
        } else {
          resolve('Todos los logs fueron agregados con éxito');
        }
      };

      transaction.onerror = (event) => {
        console.error('Error en la transacción:', event);
        reject('Error general en la transacción');
      };
    });
  }

  getCallerFunctionName(): string {
    const error = new Error();
    const stack = error.stack!.split('\n');
    if (stack.length >= 4) {
      const callerLine = stack[3];
      const match = callerLine.match(/at (\w+) \(/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return 'anonymous';
  }

  async logInternal(type: LogTypeBoolean, ...messages: any[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const functionName = this.getCallerFunctionName();
    let trace = this.getTrace();

    const logEntry = {
      loggerId: this.loggerId,
      timestamp,
      type,
      context: this.context,
      functionName,
      message: messages.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '),
      additionalInfo: this.additionalInfo,
      trace: this.saveTraceInDB[type] ? trace : undefined
    };

    if (this.logEnabled[type]) {
      if (this.useStyles && this.customStyles[type]) {
        console[type === 'fatal' ? 'error' : type](`%c${timestamp} [${type.toUpperCase()}] [${this.context}] (${functionName}):`, this.customStyles[type], ...messages);
      } else {
        console[type === 'fatal' ? 'error' : type](`${timestamp} [${type.toUpperCase()}] [${this.context}] (${functionName}):`, ...messages);
      }
    }

    if (this.traceEnabled[type]) {
      console.groupCollapsed('Trace Details');
      console.trace();
      console.groupEnd();
    }

    if (this.batch.enabled) {
      this.logBuffer.push(logEntry);

      if (this.logBuffer.length >= this.batch.batchSize) {
        this.flushLogs();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.flushLogs(), this.batch.batchInterval);
      }
    } else {
      if (this.saveEnabled[type]) {
        if (this.useWorkerForSave && this.worker) {
          this.worker.postMessage({ type: 'save', logEntry });
        } else {
          this.addLog(logEntry).catch(err => console.error('Error al guardar log:', err));
        }
      }

      Promise.resolve().then(() => {
        this.callback(logEntry);
      });
    }
  }

  async flushLogs(): Promise<void> {
    try {
      if (this.isFlushing || this.logBuffer.length === 0) return;

      this.isFlushing = true;

      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }

      const logsToSave = [...this.logBuffer];

      if (this.useWorkerForSave && this.worker) {
        this.worker.postMessage({ type: 'save', logEntry: logsToSave });
      } else {
        await this.addLog(logsToSave);
      }

      this.logBuffer = [];

      Promise.resolve().then(() => {
        this.batch.batchCallback(logsToSave);
      });

    } catch (error) {
      console.error('Error al guardar logs en batch:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  log(...messages: any[]): void {
    this.logInternal('log', ...messages);
  }

  info(...messages: any[]): void {
    this.logInternal('info', ...messages);
  }

  warn(...messages: any[]): void {
    this.logInternal('warn', ...messages);
  }

  error(...messages: any[]): void {
    this.logInternal('error', ...messages);
  }

  debug(...messages: any[]): void {
    this.logInternal('debug', ...messages);
  }

  fatal(...messages: any[]): void {
    this.logInternal('fatal', ...messages);
  }

  setTraceEnabled({ type, enabled }: { type: LogTypeBoolean; enabled: boolean }): void {
    if (this.traceEnabled.hasOwnProperty(type)) {
      this.traceEnabled[type] = enabled;
    }
  }

  setLogEnabled({ type, enabled }: { type: LogTypeBoolean; enabled: boolean }): void {
    if (this.logEnabled.hasOwnProperty(type)) {
      this.logEnabled[type] = enabled;
    }
  }

  setSaveEnabled({ type, enabled }: { type: LogTypeBoolean; enabled: boolean }): void {
    if (this.saveEnabled.hasOwnProperty(type)) {
      this.saveEnabled[type] = enabled;
    }
  }

  setSaveTraceInDB({ type, enabled }: { type: LogTypeBoolean; enabled: boolean }): void {
    if (this.saveTraceInDB.hasOwnProperty(type)) {
      this.saveTraceInDB[type] = enabled;
    }
  }

  setCallback({ callback }: { callback: (logEntry: object) => void }): void {
    this.callback = callback;
  }

  setCustomStyles({ type, style }: { type: LogTypeBoolean; style: string }): void {
    if (this.customStyles.hasOwnProperty(type)) {
      this.customStyles[type] = style;
    }
  }

  async exportLogs({ all = false, logType = "all" }: { all?: boolean; logType?: string } = {}): Promise<void> {
    if (this.useWorkerForSave && this.worker) {
      return new Promise((resolve, reject) => {
        if (!this.worker) {
          reject('No se pudo exportar logs');
          return;
        }
        this.worker.onmessage = (event) => {
          if (event.data.type === 'export') {
            const logs = event.data.logs;
            this.generateJson(logs);
            resolve();
          }
        };

        this.worker.postMessage({ type: 'export', all, context: this.context, logType });
      });
    } else {
      await this.waitForDBInitialization();

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const objectStore = transaction.objectStore(this.storeName);

        let request;
        if (all) {
          if (logType === 'all') {
            request = objectStore.getAll();
          } else {
            const index = objectStore.index('type');
            request = index.openCursor(IDBKeyRange.only(logType));
          }
        } else {
          if (logType === 'all') {
            const index = objectStore.index('context');
            request = index.openCursor(IDBKeyRange.only(this.context));
          } else {
            const index = objectStore.index('context_type');
            const keyRange = IDBKeyRange.bound([this.context, logType], [this.context, logType]);
            request = index.openCursor(keyRange);
          }
        }

        const logs: object[] = [];
        request.onsuccess = (event) => {
          //@ts-ignore
          const result = event.target.result;
          if (all) {
            if (logType === 'all') {
              logs.push(...result);
              this.generateJson(logs);
              resolve();
            } else {
              const cursor = result;
              if (cursor) {
                logs.push(cursor.value);
                cursor.continue();
              } else {
                this.generateJson(logs);
                resolve();
              }
            }
          } else {
            const cursor = result;
            if (cursor) {
              logs.push(cursor.value);
              cursor.continue();
            } else {
              this.generateJson(logs);
              resolve();
            }
          }
        };

        request.onerror = (event) => {
          console.error('Error al exportar logs', event);
          reject(event);
        };
      });
    }
  }

  generateJson(logs: object[]): void {
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  async deleteOldLogs({ days = 30 }: { days?: number }): Promise<void> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    if (this.useWorkerForSave && this.worker) {
      return new Promise((resolve, reject) => {
        if (!this.worker) {
          reject('No se pudo eliminar logs antiguos');
          return;
        }
        this.worker.onmessage = (event) => {
          if (event.data.type === 'deleteOldLogs') {
            console.log('Logs antiguos eliminados correctamente desde Worker');
            resolve();
          }
        };

        this.worker.postMessage({ type: 'deleteOldLogs', thresholdDate: thresholdDate.toISOString() });
      });
    } else {
      await this.waitForDBInitialization();

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const objectStore = transaction.objectStore(this.storeName);
        const index = objectStore.index('timestamp');
        const request = index.openCursor(IDBKeyRange.upperBound(thresholdDate.toISOString()));

        request.onsuccess = (event) => {
          // @ts-ignore
          const cursor = event.target?.result;
          if (cursor) {
            objectStore.delete(cursor.primaryKey);
            cursor.continue();
          } else {
            console.log(`Eliminación de logs más antiguos que ${days} días completada.`);
            resolve();
          }
        };

        request.onerror = (event) => {
          console.error('Error al eliminar logs antiguos:', event);
          reject(event);
        };
      });
    }
  }

  async logPerformance({ func, label = 'Performance' }: { func: () => any; label?: string }): Promise<any> {
    const start = performance.now();
    let result;

    try {
      result = func();
      if (result instanceof Promise) {
        result = await result;
      }
    } catch (error) {
      this.error(`Error en la ejecución de ${label}:`, error);
      return;
    }

    const end = performance.now();
    this.info(`${label} - Execution time: ${end - start} ms`);

    return result;
  }
}

// @ts-ignore
// window.Logger = Logger;

// export { Logger };