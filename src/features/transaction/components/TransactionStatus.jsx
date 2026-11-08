export function TransactionStatus({ status }) {
  return <span className={`transaction-status ${status === "ACCEPTED" ? "transaction-status--accepted" : ""}`}>{status || "—"}</span>;
}
