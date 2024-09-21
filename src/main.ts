import { Logger } from "./yourlogger-browser";

const logger = new Logger();
logger.log("Hello World");
logger.error("Hello World");
logger.warn("Hello World");
logger.info("Hello World");

//@ts-ignore
window.logger = logger;