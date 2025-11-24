import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Database, Shield, Users, Code, GitBranch, 
  Layers, Server, Lock, Download, Copy, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

const documentation = {
  overview: `
# SafeNestt Technical Documentation
**Version:** 1.0.0 | **Last Updated:** November 2024

## 1. APP OVERVIEW

### Purpose
SafeNestt is a comprehensive cybersecurity and fraud investigation platform designed to protect users from crypto scams, identity theft, and digital threats. The platform provides tools for case management, blockchain transaction tracing, document generation for law enforcement, and real-time security monitoring.

### Target Users
- **End Users:** Individuals seeking protection from cyber threats
- **Investigators:** Fraud analysts tracking stolen crypto funds
- **Administrators:** Platform managers overseeing cases and users
- **Law Enforcement:** Agencies receiving documented fraud cases

### Key Features
1. **Crypto Fraud Investigation Center** - Centralized hub for fraud case management
2. **Case Management** - Create, track, and manage investigation cases
3. **Document Generator** - Auto-generate legal documents for stolen funds cases
4. **Etherscan Import** - Parse and import blockchain transactions from CSV
5. **Referral Program** - Tier-based referral system with bonus rewards
6. **Subscription System** - Free trial + paid premium tiers
7. **Suspect Management** - Track and document scammer information
8. **Dashboard & Analytics** - Real-time security score and alerts

---

## 2. APP ARCHITECTURE

### High-Level Architecture Diagram
\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard │ Fraud Center │ Case Detail │ Documents │ Settings  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BASE44 SDK (API Layer)                        │
├─────────────────────────────────────────────────────────────────┤
│  base44.entities  │  base44.auth  │  base44.functions           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    ENTITIES     │ │   FUNCTIONS     │ │  INTEGRATIONS   │
│  (Database)     │ │  (Backend)      │ │  (External)     │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ InvestigationCase│ │subscriptionSvc  │ │ Core.SendEmail  │
│ FraudCase       │ │ referralService │ │ Core.UploadFile │
│ Transaction     │ │ stripeWebhook   │ │ Core.InvokeLLM  │
│ WalletMonitor   │ │ cryptoIntel     │ │                 │
│ Agency          │ │                 │ │                 │
│ Alert           │ │                 │ │                 │
│ User            │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
\`\`\`

### Data Flow
1. User interacts with React frontend
2. Frontend calls Base44 SDK methods
3. SDK routes to appropriate entity/function/integration
4. Backend processes request and returns response
5. Frontend updates UI with response data
`,

  entities: `
## 3. DATABASE SCHEMA (ENTITIES)

### 3.1 User Entity
**Purpose:** Store user profile, subscription, and security settings
\`\`\`json
{
  "name": "User",
  "properties": {
    "username": "string",
    "phone": "string",
    "monitored_emails": ["string"],
    "account_status": "enum: pending_approval, active, rejected",
    "subscription_plan": "enum: free, basic, elite",
    "subscription_status": "enum: inactive, trial, active, cancelled",
    "trial_ends": "date-time",
    "risk_score": "number (0-100)",
    "vpn_enabled": "boolean",
    "two_factor_enabled": "boolean",
    "referral_code": "string",
    "referrals_count": "number",
    "is_admin": "boolean"
  },
  "built_in": ["id", "email", "full_name", "role", "created_date"]
}
\`\`\`

### 3.2 InvestigationCase Entity
**Purpose:** Main case record for fraud investigations
\`\`\`json
{
  "name": "InvestigationCase",
  "properties": {
    "case_number": "string (auto-generated)",
    "case_title": "string (required)",
    "victim_name": "string (required)",
    "victim_email": "string",
    "victim_phone": "string",
    "victim_contact_info": {
      "primary_email": "string",
      "phone": "string",
      "address": "string"
    },
    "fraud_type": "enum: crypto_theft, phishing, rug_pull, etc.",
    "amount_stolen_usd": "number (required)",
    "cryptocurrency": "string",
    "blockchain": "string",
    "scammer_info": {
      "name": "string",
      "email": "string",
      "wallet_addresses": ["string"]
    },
    "status": "enum: new, investigating, documented, submitted, closed",
    "priority": "enum: low, medium, high, critical",
    "investigation_progress": "number (0-100)",
    "evidence_files": [{ "name": "string", "url": "string" }],
    "imported_transactions": [{ "hash": "string", "from": "string", "to": "string" }],
    "case_documents": { "case_summary": {}, "victim_statement": {} },
    "case_notes": [{ "timestamp": "date", "note": "string" }]
  },
  "rls": {
    "create": { "user_condition": { "role": "admin" } },
    "read": { "user_condition": { "role": "admin" } },
    "update": { "user_condition": { "role": "admin" } },
    "delete": { "user_condition": { "role": "admin" } }
  }
}
\`\`\`

### 3.3 Transaction Entity
**Purpose:** Store imported blockchain transactions
\`\`\`json
{
  "name": "Transaction",
  "properties": {
    "case_id": "string (FK to InvestigationCase)",
    "tx_hash": "string (required)",
    "from_address": "string (required)",
    "to_address": "string (required)",
    "amount": "number",
    "amount_usd": "number",
    "blockchain": "string",
    "timestamp": "date-time",
    "is_suspicious": "boolean",
    "risk_flags": ["string"]
  }
}
\`\`\`

### 3.4 WalletMonitor Entity
**Purpose:** Track wallet addresses for activity
\`\`\`json
{
  "name": "WalletMonitor",
  "properties": {
    "wallet_address": "string (required)",
    "blockchain": "enum: ethereum, bitcoin, bsc, polygon, tron, solana",
    "fraud_case_id": "string (FK)",
    "wallet_type": "enum: scammer, victim, exchange, mixer",
    "risk_score": "number (0-100)",
    "monitoring_status": "enum: active, paused, completed",
    "alert_enabled": "boolean"
  }
}
\`\`\`

### 3.5 Agency Entity
**Purpose:** Federal agency contact information
\`\`\`json
{
  "name": "Agency",
  "properties": {
    "agency_name": "string (required)",
    "category": "enum: federal, state, local, international",
    "website": "string",
    "submission_portal": "string",
    "phone": "string",
    "email": "string",
    "related_case_types": ["string"]
  }
}
\`\`\`

### 3.6 Referral Entity
**Purpose:** Track referral relationships and rewards
\`\`\`json
{
  "name": "Referral",
  "properties": {
    "referrer_email": "string",
    "referrer_code": "string",
    "referred_email": "string",
    "referred_name": "string",
    "status": "enum: pending, completed, rewarded",
    "bonus_months": "number",
    "signup_date": "date-time",
    "completed_date": "date-time"
  }
}
\`\`\`
`,

  screens: `
## 4. SCREEN-BY-SCREEN DOCUMENTATION

### 4.1 Dashboard (pages/Dashboard.js)
**Purpose:** Main landing page showing security overview
**Components:**
- SecurityScoreCard - Displays risk score (0-100)
- QuickActionsGrid - Navigation shortcuts
- UserDetailsCard - Editable user profile
- VPNControl - Toggle VPN status
- RecentAlertsCard - Recent security alerts
- MiaQuickChat - AI assistant widget

**Actions:**
- "Run Security Scan" → Calculates risk score based on alerts/passwords
- Edit User Details → Opens inline edit form
- VPN Toggle → Updates user.vpn_enabled

---

### 4.2 Crypto Fraud Center (pages/CryptoFraudCenter.js)
**Purpose:** Central hub for fraud investigation tools
**Access:** Admin/Investigator only

**Tabs/Components:**
1. **Dashboard Tab** (CryptoFraudDashboard)
   - Stats: Active cases, resolved, total stolen, recovered
   - Quick actions: Report Fraud, Trace Wallet, View Cases
   
2. **Active Cases Tab** (ActiveCasesPanel)
   - Searchable/filterable case list
   - Status badges (new, investigating, closed)
   - Click row → Opens CaseDetailDialog

3. **Report Fraud Tab** (ReportFraudPanel)
   - Multi-step form (4 steps):
     Step 1: Case info (title, type, blockchain)
     Step 2: Victim details (name, email, phone, amount)
     Step 3: Suspect info (name, email, wallet, telegram)
     Step 4: Description + Submit

4. **Blockchain Trace Tab** (BlockchainTracePanel)
   - Wallet address input
   - AI-powered risk analysis via InvokeLLM

5. **Wallet Tracker Tab** (CryptoTrackerPanel)
   - Monitor suspicious wallet addresses
   - Real-time balance/transaction alerts

6. **Documents Tab** (DocumentsEvidencePanel)
   - Generate case documents
   - Upload evidence files

---

### 4.3 Case Detail Dialog (components/investigation/CaseDetailDialog.jsx)
**Purpose:** Full case view and editing interface
**Opened From:** ActiveCasesPanel row click

**Tabs:**
1. **Overview** - Case summary, victim, financials
2. **Edit Case** - Full form to modify all case fields
3. **Documents** - Generate/view case documents
4. **Victim Details** - Contact information
5. **Suspect Details** - Scammer information (view)
6. **Edit Suspect** - Form to add/edit suspect info
7. **Evidence** - Upload and manage evidence files
8. **Timeline** - Chronological case events
9. **Notes** - Internal investigation notes
10. **Tracking** - Monitored wallet addresses
11. **Agencies** - Recommended federal agencies

**Key Actions:**
- Status dropdown → Updates case.status
- Priority dropdown → Updates case.priority
- Progress slider → Updates case.investigation_progress
- Save in Edit tab → Updates all modified fields

---

### 4.4 Case Documents (components/investigation/CaseDocuments.jsx)
**Purpose:** Generate and manage legal documents

**Document Types:**
1. Case Summary
2. Victim Statement
3. Transaction Log
4. Transaction Analysis
5. Scammer Profile
6. Evidence Package

**Workflow:**
1. Click "Generate" on document card
2. Content auto-generated from case data
3. Document editor opens (DocumentEditor.jsx)
4. Rich text editing with image upload
5. Save, Download as TXT, or Preview as PDF
6. Submit to authorities via FederalSubmission.jsx

---

### 4.5 Etherscan Importer (components/investigation/EtherscanImporter.jsx)
**Purpose:** Import blockchain transactions from CSV

**Workflow:**
1. User exports CSV from etherscan.io
2. Drag-drop or browse to upload
3. CSV parsed, transactions displayed
4. User can edit/delete individual transactions
5. Click "Import All" to save to case
6. Transactions stored in case.imported_transactions

---

### 4.6 Subscription Page (pages/Subscription.js)
**Purpose:** Premium subscription management

**Features:**
- Current subscription status display
- 7-day free trial banner
- Stripe checkout integration
- Cancel subscription option

---

### 4.7 Referrals Page (pages/Referrals.js)
**Purpose:** Referral program dashboard

**Features:**
- Unique referral code display
- Share buttons (copy, email, SMS, WhatsApp)
- Stats: total sent, completed, pending, months earned
- Tier progress (Bronze → Silver → Gold → Platinum)
- Recent referral activity feed
`,

  customCode: `
## 5. CUSTOM CODE DOCUMENTATION

### 5.1 Document Generation System
**Location:** components/investigation/CaseDocuments.jsx

**Function: generateDocumentContent(docType)**
\`\`\`javascript
const generateDocumentContent = useCallback((docType) => {
  const transactions = caseData.imported_transactions || [];
  const scammerInfo = caseData.scammer_info || {};
  
  switch (docType) {
    case 'case_summary':
      return {
        title: \`Case Summary - \${caseData.case_number}\`,
        document_id: \`\${caseData.id}_case_summary_\${Date.now()}\`,
        sections: [
          {
            heading: 'Case Information',
            editable: true,
            content: \`Case Number: \${caseData.case_number}
Case Title: \${caseData.case_title}
Status: \${caseData.status}
Priority: \${caseData.priority}\`
          },
          // ... more sections
        ]
      };
    // ... other document types
  }
}, [caseData]);
\`\`\`

**Why Custom Code:** Base44 doesn't have built-in document templating. Custom JavaScript generates structured content from case data.

---

### 5.2 Etherscan CSV Parser
**Location:** components/investigation/EtherscanImporter.jsx

**Function: processFile(file)**
\`\`\`javascript
const processFile = async (file) => {
  const text = await file.text();
  const lines = text.split('\\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => 
    h.trim().toLowerCase().replace(/"/g, '')
  );
  
  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.replace(/"/g, '').trim();
    });
    
    // Map Etherscan fields to our format
    const tx = {
      hash: row['txhash'] || row['hash'] || '',
      from: row['from'] || '',
      to: row['to'] || '',
      value: parseFloat(row['value'] || 0),
      timestamp: row['datetime'] || new Date().toISOString(),
      token: row['tokenname'] || 'ETH'
    };
    
    if (tx.hash && (tx.from || tx.to)) {
      transactions.push(tx);
    }
  }
  return transactions;
};

// CSV line parser (handles quoted values)
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};
\`\`\`

**Why Custom Code:** Etherscan CSV format varies. Custom parser handles multiple column name formats and quoted values.

---

### 5.3 Subscription Service (Backend Function)
**Location:** functions/subscriptionService.js

**Key Endpoints:**

\`\`\`javascript
// Initialize 7-day trial
case 'init-trial': {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);
  
  await base44.auth.updateMe({
    subscription_plan: 'trial',
    subscription_status: 'trial',
    trial_started: new Date().toISOString(),
    trial_ends: trialEnd.toISOString()
  });
}

// Get subscription info (calculates days remaining)
case 'get-subscription-info': {
  const trialEnd = user.trial_ends ? new Date(user.trial_ends) : null;
  const daysLeft = trialEnd 
    ? Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)) 
    : 0;
    
  return {
    subscription_plan: user.subscription_plan,
    is_trial_active: user.subscription_status === 'trial' && daysLeft > 0,
    days_left: daysLeft
  };
}

// Cancel subscription
case 'cancel-subscription': {
  await base44.auth.updateMe({
    subscription_status: 'cancelled',
    cancelled_at: new Date().toISOString()
  });
}
\`\`\`

---

### 5.4 Referral Service (Backend Function)
**Location:** functions/referralService.js

**Key Functions:**

\`\`\`javascript
// Generate unique referral code
function generateReferralCode(name, email) {
  const namePart = name.substring(0, 3).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return \`\${namePart}\${randomPart}\`;
}

// Calculate tier based on referral count
function calculateTier(referralsCount) {
  if (referralsCount >= 10) return 'platinum';
  if (referralsCount >= 5) return 'gold';
  if (referralsCount >= 2) return 'silver';
  return 'bronze';
}

// Bonus months per tier
const bonusMap = {
  'bronze': 1,    // 1 month per referral
  'silver': 1.5,  // 1.5 months per referral
  'gold': 2,      // 2 months per referral
  'platinum': 3   // 3 months per referral
};
\`\`\`

---

### 5.5 Risk Score Calculation
**Location:** pages/Dashboard.js

\`\`\`javascript
const runSecurityScan = async () => {
  let score = 100;
  
  // Deduct for critical alerts
  score -= alerts.filter(a => a.severity === 'critical').length * 10;
  score -= alerts.filter(a => a.severity === 'high').length * 5;
  score -= alerts.filter(a => a.severity === 'medium').length * 2;
  
  // Deduct for weak passwords
  const weakPasswords = passwords.filter(p => p.password_strength === 'weak');
  score -= weakPasswords.length * 3;
  
  // Deduct for missing security features
  if (!user?.vpn_enabled) score -= 5;
  if (!user?.two_factor_enabled) score -= 10;
  
  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));
  
  await base44.auth.updateMe({ risk_score: score });
};
\`\`\`
`,

  permissions: `
## 6. PERMISSIONS AND ROLES

### 6.1 Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | Full platform access | All features + user management |
| **Investigator** | Fraud investigation tools | Cases, documents, tracing |
| **Verified User** | Validated premium user | All non-admin features |
| **Regular User** | Standard user | Basic features only |

### 6.2 Module Access Matrix

| Module | Admin | Investigator | Verified | Regular |
|--------|-------|--------------|----------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Crypto Fraud Center | ✅ | ✅ | ❌ | ❌ |
| Create/Edit Cases | ✅ | ✅ | ❌ | ❌ |
| View Cases | ✅ | ✅ | Own only | ❌ |
| Generate Documents | ✅ | ✅ | ❌ | ❌ |
| Edit Suspect Info | ✅ | ✅ | ❌ | ❌ |
| User Approvals | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |
| Referrals | ✅ | ✅ | ✅ | ✅ |
| Subscription | ✅ | ✅ | ✅ | ✅ |

### 6.3 Row-Level Security (RLS)

**InvestigationCase:**
\`\`\`json
{
  "create": { "user_condition": { "role": "admin" } },
  "read": { "user_condition": { "role": "admin" } },
  "update": { "user_condition": { "role": "admin" } },
  "delete": { "user_condition": { "role": "admin" } }
}
\`\`\`

**FraudCase (User-created):**
\`\`\`json
{
  "create": { "created_by": "{{user.email}}" },
  "read": {
    "$or": [
      { "created_by": "{{user.email}}" },
      { "user_condition": { "role": "admin" } }
    ]
  }
}
\`\`\`

### 6.4 Access Control Implementation

\`\`\`javascript
// In CryptoFraudCenter.js
const checkAccess = () => {
  if (!user) return false;
  
  // Admin always has access
  if (user.role === 'admin' || user.is_admin) return true;
  
  // Check for investigator role
  if (user.account_type === 'investigator') return true;
  
  // Check subscription
  const hasPremium = ['basic', 'elite'].includes(user.subscription_plan);
  const hasActiveSub = user.subscription_status === 'active';
  
  return hasPremium && hasActiveSub;
};
\`\`\`
`,

  workflows: `
## 7. WORKFLOW EXAMPLES

### 7.1 Creating a New Fraud Case

\`\`\`
Step 1: Navigate to Crypto Fraud Center
        → Click "Report New Fraud" tab

Step 2: Fill Case Information (Step 1/4)
        → Case Title (required)
        → Fraud Type (dropdown)
        → Cryptocurrency
        → Blockchain

Step 3: Fill Victim Details (Step 2/4)
        → Victim Name (required)
        → Email, Phone, Address
        → Amount Stolen USD (required)

Step 4: Fill Suspect Information (Step 3/4)
        → Suspect Name/Alias
        → Email, Phone, Telegram
        → Wallet Address
        → Website

Step 5: Add Description (Step 4/4)
        → Detailed incident description
        → Review summary
        → Click "Submit Case"

Result: Case created with:
        - Auto-generated case number (INV-YYYYMMDD-XXXX)
        - Status: "new"
        - Empty document templates ready for generation
\`\`\`

---

### 7.2 Importing Etherscan Transactions

\`\`\`
Step 1: Open Case Detail Dialog
        → Navigate to "Documents" tab

Step 2: Click "Etherscan Import" sub-tab

Step 3: Export from Etherscan
        → Go to etherscan.io
        → Search wallet address
        → Click "Download CSV Export"

Step 4: Upload CSV
        → Drag-drop file OR click "Import CSV"
        → Parser extracts transactions

Step 5: Review Parsed Data
        → View transaction count
        → Check inbound/outbound totals
        → Edit individual rows if needed

Step 6: Confirm Import
        → Click "Import All"
        → Transactions saved to case
        → Transaction Log document auto-updated
\`\`\`

---

### 7.3 Generating and Submitting Documents

\`\`\`
Step 1: Open Case Documents
        → Case Detail → Documents tab

Step 2: Generate Documents
        → Click "Generate" on each document type
        OR Click "Generate All Documents"

Step 3: Edit in Document Editor
        → Rich text editing
        → Add images/PDFs
        → Save changes

Step 4: Submit to Authorities
        → Click "Submit to Authorities"
        → Select target agency (FBI, IC3, etc.)
        → Choose documents to include
        → Generate evidence package
        → Download or open agency portal

Step 5: Track Submission
        → Submission logged in AgencySubmission entity
        → Status: pending → received → investigating
\`\`\`

---

### 7.4 Admin Editing Suspect Details

\`\`\`
Step 1: Open Case Detail
        → From Active Cases, click case row

Step 2: Navigate to Edit Suspect Tab
        → Click "Edit Suspect" tab
        OR Click "Add/Edit Suspect Info" button

Step 3: Fill Suspect Form
        → Suspect Name/Alias
        → Email, Phone, Telegram, WhatsApp
        → Location
        → Wallet Addresses (add multiple)
        → Social Media profiles
        → Upload evidence files
        → Add notes

Step 4: Save Changes
        → Click "Save Suspect Info"
        → Data saved to case.scammer_info
        → Wallets added to case.monitored_wallets
\`\`\`

---

### 7.5 User Subscription Flow

\`\`\`
New User Signup:
  1. User creates account
  2. subscriptionService.init-trial called
  3. 7-day trial starts automatically
  4. User has full premium access

During Trial:
  - Banner shows "X days remaining"
  - Notifications at 48h and 24h before expiry
  - User can add payment method anytime

Trial Expires:
  A) With Payment Method:
     → Auto-converts to paid subscription
     → Status: active
     
  B) Without Payment Method:
     → Status: inactive
     → Plan: free
     → Premium features blocked

Cancel Subscription:
  - During trial: Access until trial ends
  - After: Immediate downgrade to free
\`\`\`

---

### 7.6 Referral System Flow

\`\`\`
Referrer Actions:
  1. Go to Referrals page
  2. Copy unique referral code/link
  3. Share via email, SMS, WhatsApp

New User Signup with Code:
  1. User enters referral code during signup
  2. referralService.validate-code validates code
  3. referralService.apply-signup creates pending referral
  4. New user gets 1 month free premium
  5. Email sent to referrer (pending notification)

Referral Completion:
  1. New user adds payment method
  2. referralService.complete-referral triggered
  3. Referrer receives bonus months based on tier:
     - Bronze (0-1): 1 month
     - Silver (2-4): 1.5 months
     - Gold (5-9): 2 months
     - Platinum (10+): 3 months
  4. Referrer's trial_ends extended
  5. Completion email sent to referrer
\`\`\`
`,

  bestPractices: `
## 8. BEST PRACTICES

### 8.1 Scaling Recommendations

**Database:**
- Add indexes on frequently queried fields (case_number, status, created_date)
- Implement pagination for large case lists (currently limited to 50)
- Archive closed cases older than 1 year

**Performance:**
- Use React Query's caching (already implemented)
- Lazy load heavy components (DocumentEditor, charts)
- Implement virtual scrolling for transaction lists > 100 items

**Infrastructure:**
- Consider dedicated Stripe webhook endpoint
- Implement rate limiting on referral endpoints
- Add CDN for uploaded evidence files

---

### 8.2 Error Handling

**Frontend Pattern:**
\`\`\`javascript
// Use toast notifications for user feedback
try {
  await base44.entities.InvestigationCase.update(id, data);
  toast.success('Case updated successfully');
} catch (error) {
  console.error('Update error:', error);
  toast.error('Failed to update: ' + error.message);
}
\`\`\`

**Backend Pattern:**
\`\`\`javascript
// Always return structured errors
Deno.serve(async (req) => {
  try {
    // ... logic
  } catch (error) {
    console.error('Service error:', error);
    return Response.json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
});
\`\`\`

---

### 8.3 Logging

**Audit Trail:**
\`\`\`javascript
// Log significant actions
await base44.entities.AuditLog.create({
  action_type: 'case_updated',
  action_category: 'investigation',
  description: 'Case status changed to investigating',
  metadata: {
    case_id: caseId,
    old_status: 'new',
    new_status: 'investigating'
  },
  severity: 'info'
});
\`\`\`

---

### 8.4 Modularity Guidelines

**Component Structure:**
\`\`\`
components/
├── investigation/
│   ├── CaseDetailDialog.jsx    # Main case view
│   ├── CaseDocuments.jsx       # Document management
│   ├── DocumentEditor.jsx      # Rich text editor
│   ├── EtherscanImporter.jsx   # CSV import
│   ├── SuspectEditForm.jsx     # Suspect form
│   └── FederalSubmission.jsx   # Agency submission
├── fraud-center/
│   ├── CryptoFraudDashboard.jsx
│   ├── ActiveCasesPanel.jsx
│   ├── ReportFraudPanel.jsx
│   └── BlockchainTracePanel.jsx
└── dashboard/
    ├── SecurityScoreCard.jsx
    ├── UserDetailsCard.jsx
    └── QuickActionsGrid.jsx
\`\`\`

**Rules:**
- Max 300 lines per component
- Extract reusable logic to custom hooks
- Keep state close to where it's used
- Use composition over prop drilling

---

### 8.5 Future Improvements

1. **Real-time Collaboration**
   - WebSocket for live case updates
   - Multi-user editing indicators

2. **Advanced Analytics**
   - Case resolution time tracking
   - Recovery rate dashboards
   - Fraud pattern detection

3. **Integrations**
   - Direct blockchain API integration
   - Law enforcement portal APIs
   - SMS/WhatsApp notifications

4. **AI Enhancements**
   - Auto-categorize fraud types
   - Suspect profile matching
   - Document summarization
`
};

export default function TechnicalDocumentation() {
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const fullDoc = Object.values(documentation).join('\n\n---\n\n');
    navigator.clipboard.writeText(fullDoc);
    setCopied(true);
    toast.success('Documentation copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const fullDoc = `# SafeNestt Technical Documentation\n\n${Object.values(documentation).join('\n\n---\n\n')}`;
    const blob = new Blob([fullDoc], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SafeNestt_Technical_Documentation.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Documentation downloaded!');
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'entities', label: 'Database', icon: Database },
    { id: 'screens', label: 'Screens', icon: Layers },
    { id: 'customCode', label: 'Custom Code', icon: Code },
    { id: 'permissions', label: 'Permissions', icon: Lock },
    { id: 'workflows', label: 'Workflows', icon: GitBranch },
    { id: 'bestPractices', label: 'Best Practices', icon: Shield }
  ];

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-cyan-400" />
              Technical Documentation
            </h1>
            <p className="text-gray-400 mt-1">Complete developer reference for SafeNestt</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
            <Button
              onClick={downloadMarkdown}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download .md
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <Button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    variant={activeTab === section.id ? "default" : "outline"}
                    className={activeTab === section.id 
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" 
                      : "border-gray-500/30 text-gray-400 hover:text-white"
                    }
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {section.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="prose prose-invert prose-cyan max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono bg-[#0f1419] p-6 rounded-lg overflow-auto max-h-[70vh]">
                {documentation[activeTab]}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-cyan-500/20">
            <CardContent className="p-4 text-center">
              <Database className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">15+</p>
              <p className="text-xs text-gray-400">Entities</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Layers className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">50+</p>
              <p className="text-xs text-gray-400">Components</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-green-500/20">
            <CardContent className="p-4 text-center">
              <Server className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">10+</p>
              <p className="text-xs text-gray-400">Backend Functions</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-orange-500/20">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">4</p>
              <p className="text-xs text-gray-400">User Roles</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}