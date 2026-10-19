/** Normalize Base44 function-invocation failures without hiding platform errors. */
export function classifyBase44FunctionError(error, functionName = "backend function") {
  const status = Number(error?.response?.status ?? error?.status ?? error?.statusCode ?? 0) || undefined;
  const responseData = error?.response?.data;
  const detail = typeof responseData === "string"
    ? responseData
    : responseData?.message || responseData?.detail || responseData?.error || "";
  const rawMessage = String(detail || error?.message || error || "Unknown invocation error");
  const combined = `${rawMessage} ${JSON.stringify(responseData ?? {})}`;
  if (status === 402 && /functions are blocked|backend functions capability|function.*blocked|owner.*capability/i.test(combined)) {
    return {
      status: "backend_functions_blocked",
      upstreamStatus: 402,
      message: `SafeNestT cannot run ${functionName}: Base44 reports that backend functions are blocked for this app owner (HTTP 402). Enable backend-function capability for this workspace/app, then retry. No successful Hermes start was confirmed.`,
    };
  }
  if (status === 402) {
    return {
      status: "base44_http_402",
      upstreamStatus: 402,
      message: `Base44 returned HTTP 402 while invoking ${functionName}. Check the Base44 workspace's backend-function entitlement/billing and inspect the platform response before treating this as an AI-provider billing error.`,
    };
  }
  return {
    status: status ? "base44_function_invoke_failed" : "base44_function_invoke_error",
    upstreamStatus: status,
    message: `Could not invoke Base44 ${functionName}${status ? ` (HTTP ${status})` : ""}: ${rawMessage}`.slice(0, 4000),
  };
}
