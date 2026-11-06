import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import OsLayout from "./shell/OsLayout";
import Overview from "./pages/Overview";
import Investigations from "./pages/Investigations";
import InvestigationDetail from "./pages/InvestigationDetail";
import MyCases from "./pages/MyCases";
import Intelligence from "./pages/Intelligence";
import Evidence from "./pages/Evidence";
import Findings from "./pages/Findings";
import Reports from "./pages/Reports";
import Operations from "./pages/Operations";
import Hermes from "./pages/Hermes";
import Automation from "./pages/Automation";
import Team from "./pages/Team";
import Integrations from "./pages/Integrations";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

/**
 * SafeNestT OS — isolated interface prototype.
 * Mounted only under /os, outside the production layout. Every screen renders
 * synthetic in-browser data and makes no backend or provider calls.
 */
export default function OsRoot() {
  return (
    <Routes>
      <Route element={<OsLayout />}>
        <Route path="/os" element={<Overview />} />
        <Route path="/os/investigations" element={<Investigations />} />
        <Route path="/os/investigations/:code" element={<InvestigationDetail />} />
        <Route path="/os/my-cases" element={<MyCases />} />
        <Route path="/os/intelligence" element={<Intelligence />} />
        <Route path="/os/evidence" element={<Evidence />} />
        <Route path="/os/findings" element={<Findings />} />
        <Route path="/os/reports" element={<Reports />} />
        <Route path="/os/operations" element={<Operations />} />
        <Route path="/os/hermes" element={<Hermes />} />
        <Route path="/os/automation" element={<Automation />} />
        <Route path="/os/team" element={<Team />} />
        <Route path="/os/integrations" element={<Integrations />} />
        <Route path="/os/analytics" element={<Analytics />} />
        <Route path="/os/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/os" replace />} />
      </Route>
    </Routes>
  );
}