export function isFatalDatabaseError(error) {
  const message = String(error?.message || "").toLowerCase();

  const fatalCodes = [
    "P1000",
    "P1001",
    "P1002",
    "P1008",
    "P1017",
    "53100",
    "53200",
    "54000"
  ];

  if (fatalCodes.includes(error?.code)) return true;

  return (
    message.includes("no space left on device") ||
    message.includes("disk full") ||
    message.includes("database is unavailable") ||
    message.includes("connection refused") ||
    message.includes("could not connect")
  );
}
