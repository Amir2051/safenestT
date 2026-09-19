import React from "react";
import VPNDevices from "./VPNDevices.jsx";

/**
 * SafeNestT VPN entry point.
 *
 * The previous page simulated server metrics and connection state in the
 * browser. That has been removed. VPNPage now exposes the real WireGuard
 * device/configuration workflow so the UI does not claim a tunnel is active
 * when the operating system's WireGuard client is not actually connected.
 */
export default function VPNPage() {
  return <VPNDevices />;
}
