import React from 'react';
import { createRoot } from 'react-dom/client';
import '/app/src/index.css';
import CaseReportDocument from '@/components/report/CaseReportDocument.jsx';
import { buildCaseReport } from '@/lib/report/reportModel.js';
import { caseItem, findings, evidence } from '/tmp/rpt/fixture.mjs';
const model = buildCaseReport({ caseItem, findings, evidence, asOf: '2026-11-05T20:00:00.000Z', preparedBy: 'Moussa Yaya, SafeNestT Investigations' });
createRoot(document.getElementById('root')).render(<div style={{padding:12}}><CaseReportDocument model={model} integrity="" draft /></div>);
