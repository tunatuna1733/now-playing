const DEBUG = true;

export const debugPrint = (...args: any[]) => {
  if (DEBUG) console.log(...args);
};
