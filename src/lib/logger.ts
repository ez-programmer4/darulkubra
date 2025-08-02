// Logger utility that only logs in development
const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
    }
  },
};
