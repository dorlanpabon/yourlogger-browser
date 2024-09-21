
# Logger Library

A highly customizable logging library for web applications. It provides options to control log levels, save logs to IndexedDB, style logs in the console, and more. Designed to work in both browser and Node.js environments (Web Browser) with TypeScript support.

## Features
- **Customizable log levels** (log, info, warn, error, debug, fatal)
- **Batch logging** with configurable size and intervals
- **Trace functionality** to capture stack traces
- **Save logs** to IndexedDB with optional web workers
- **Custom console styles** for different log levels
- **TypeScript support**
- **Worker support** for async log saving

## Installation

### Via CDN (ES Module)

To use the library directly in the browser, you can include it via a CDN like so:

```html
<script type="module">
  import { Logger } from 'https://cdn.jsdelivr.net/npm/yourlogger-browser@latest/dist/yourlogger-browser.esm.js';

  const logger = Logger.getInstance();
  logger.log('Hello World!');
</script>
```

### Via CDN (UMD)

If you need UMD (Universal Module Definition) support for compatibility with various module systems:

```html
<script src="https://cdn.jsdelivr.net/npm/yourlogger-browser@latest/dist/yourlogger-browser.umd.js"></script>
<script>
  const logger = Logger.getInstance();
  logger.log('Hello from UMD!');
</script>
```

### Node.js (Compiled with Node for Web)

You can also install and use this library with Node.js for bundling in modern web applications.

1. **Install the package** via npm or yarn:
   ```bash
   npm install yourlogger-browser
   # or
   yarn add yourlogger-browser
   ```

2. **Usage in your JavaScript/TypeScript file**:
   ```ts
   import { Logger } from 'yourlogger-browser';

   const logger = Logger.getInstance();
   logger.info('Logger initialized');
   ```


## Usage

### Basic Example

```js
const logger = Logger.getInstance({
  context: 'app', // Optional context for categorizing logs
});

logger.log('This is a log message');
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.debug('This is a debug message');
logger.fatal('This is a fatal message');
```

### Customizing Log Styles

You can define custom styles for your logs to distinguish them in the console:

```js
const logger = Logger.getInstance({
  customStyles: {
    log: 'color: black',
    info: 'color: blue',
    warn: 'color: orange',
    error: 'color: red',
    debug: 'color: green',
    fatal: 'color: white; font-weight: bold; background: red; padding: 5px;'
  }
});

logger.info('This is a styled info message');
```

### Batch Logging

Enable batch logging to send logs in batches based on size or interval:

```js
const logger = Logger.getInstance({
  batch: {
    enabled: true,
    batchSize: 5,
    batchInterval: 3000, // Flush logs every 3 seconds
    batchCallback: (logs) => {
      console.log('Batch of logs:', logs);
    }
  }
});

for (let i = 0; i < 10; i++) {
  logger.log(`Log message ${i}`);
}
```

### Saving Logs to IndexedDB

Enable saving logs to IndexedDB, optionally using a web worker for better performance:

```js
const logger = Logger.getInstance({
  saveEnabled: {
    log: true,
    info: true,
    error: true,
  },
  useWorkerForSave: true, // Optional: Save logs asynchronously with a worker
  debugWorker: false, // Optional: Enable worker logging
});

logger.log('This log will be saved to IndexedDB');
```

### Exporting Logs from IndexedDB

You can export logs from the database as JSON:

```js
const logger = Logger.getInstance();

logger.exportLogs({ all: true }).then(() => {
  console.log('Logs exported successfully!');
});
```

### Deleting Old Logs

You can also delete old logs based on a time threshold:

```js
const logger = Logger.getInstance();

logger.deleteOldLogs({ days: 7 }).then(() => {
  console.log('Old logs deleted');
});
```

### Handling Callbacks

You can specify a callback function to handle logs when they are processed:

```js
const logger = Logger.getInstance({
  callback: (logEntry) => {
    console.log('Log entry processed:', logEntry);
  }
});

logger.log('This log will trigger a callback');
```

## TypeScript Support

This library is fully typed and provides comprehensive TypeScript support. Here’s how you can use it in a TypeScript project:

```ts
import { Logger } from 'yourlogger-browser';

const logger = Logger.getInstance({
  logEnabled: { log: true, info: true, warn: true, error: true, debug: true, fatal: true },
  saveEnabled: { log: true, info: true, warn: true, error: true, debug: true, fatal: true }
});

logger.log('TypeScript log');
```

The library includes interfaces like `LoggerOptions`, `TypesBoolean`, and `TypesString` to ensure that your configuration is type-safe.

### Available Types

```ts
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
```

## License

This project is licensed under the MIT License.
