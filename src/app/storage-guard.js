(function installEducircuitStorageGuard(global) {
  global.__educircuitBootErrors = global.__educircuitBootErrors || [];
  if (!global.__educircuitBootErrorCaptureInstalled) {
    global.addEventListener("error", event => {
      global.__educircuitBootErrors.push({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });
    global.addEventListener("unhandledrejection", event => {
      global.__educircuitBootErrors.push({
        message: event.reason?.message || String(event.reason || "Unhandled promise rejection"),
        source: "promise"
      });
    });
    global.__educircuitBootErrorCaptureInstalled = true;
  }

  const blockedWrites = [];
  const storagePrototype = global.Storage?.prototype;

  if (!storagePrototype || storagePrototype.__educircuitGuarded) return;

  function storageName(storage) {
    if (storage === global.localStorage) return "localStorage";
    if (storage === global.sessionStorage) return "sessionStorage";
    return "browserStorage";
  }

  Object.defineProperty(storagePrototype, "__educircuitGuarded", {
    value: true,
    configurable: false
  });

  Object.defineProperty(storagePrototype, "setItem", {
    configurable: true,
    value(key, value) {
      blockedWrites.push({
        storage: storageName(this),
        key: String(key),
        value: String(value),
        at: new Date().toISOString()
      });
    }
  });

  Object.defineProperty(storagePrototype, "removeItem", {
    configurable: true,
    value(key) {
      blockedWrites.push({
        storage: storageName(this),
        key: String(key),
        removed: true,
        at: new Date().toISOString()
      });
    }
  });

  Object.defineProperty(storagePrototype, "clear", {
    configurable: true,
    value() {
      blockedWrites.push({
        storage: storageName(this),
        cleared: true,
        at: new Date().toISOString()
      });
    }
  });

  global.EducircuitStorageGuard = {
    enabled: true,
    blockedWrites
  };
})(window);
