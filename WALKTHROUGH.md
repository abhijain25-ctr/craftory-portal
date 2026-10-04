# 3–5 Minute Reviewer Walkthrough Guide

Follow these steps to demonstrate and verify all 7 acceptance scenarios required in the Craftory Studio brief.

---

### Prerequisites
Open the live portal in your browser:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Step 1: Ordinary Message Exchange & Persistence (Scenario 1)
1. In the top bar, click **"👤 Client (Marcus - Client Alpha)"**.
2. Notice your assigned projects on the left: **Project Apollo** and **Project Borealis**.
3. Select **Project Apollo**. Note your public alias is **Client Alpha**.
4. Type an ordinary project update in the chat composer:  
   `"Reviewed sprint 1 milestone deliverables. Ready to proceed."`  
   Click **Send**.
5. The message appears instantly with status **Delivered** and a green checkmark.
6. **Reload the browser page (F5)**: The message and conversation history persist cleanly from MySQL.

---

### Step 2: Access Control & IDOR Tampering Prevention (Scenario 2)
1. In the top bar, click **"🚫 Unassigned User (IDOR Test)"**.
2. Notice the Assigned Projects list displays:  
   `"No Projects Assigned — You are not authorized for any project workstreams."`
3. If an attacker attempts to fetch or send messages to Project Apollo using conversation IDs via curl:
   ```bash
   curl -i http://localhost:3000/api/conversations/[apollo_id]/messages
   ```
   The backend responds with `HTTP 403 Forbidden` (`Access denied: You are not an active member of this project conversation`).

---

### Step 3: Identity Privacy & Cross-Project Alias Discrepancy (Scenario 3)
1. Click **"👤 Client (Marcus)"**.
   - In **Project Apollo**: Notice your alias is **Client Alpha**.
   - In **Project Borealis**: Select Borealis. Notice your alias is **Enterprise Advisor C**.
   - Confirmed: The same user receives *different aliases* across projects.
2. Click **"🛠️ Employee (Devon)"**.
   - Switch between Apollo (where Devon is **Project Specialist Beta**) and Borealis (where Devon is **Systems Architect Gamma**).
   - In the chat stream, inspect the client messages. Notice only the alias **Client Alpha** is visible. Zero real names, emails, phone numbers, or user IDs are exposed in the UI or network API payloads.

---

### Step 4: Contact-Sharing Message Held & Invisible to Recipient (Scenario 4)
1. Sign in as **👤 Client (Marcus)** in **Project Apollo**.
2. In the "Evaluator Fast-Test Triggers" box, click:  
   **"🚨 Test 1: Email Leak"** (`marcus.vp@directcorp.com`) or **"🚨 Test 2: Phone Leak"** (`+1 415-893-1029`).
3. Click **Send**.
4. In the Client's chat window, the message is marked with an amber badge:  
   `"Held for Admin Review (Invisible to recipient)"`.
5. Now click **"🛠️ Employee (Devon)"** in the top bar.
6. Open **Project Apollo**.
7. **Notice:** The held message is completely **INVISIBLE** to the employee. It is filtered out from both API responses and the chat view until administrative clearance.

---

### Step 5: Pricing Discussion Alert & Continuous Chat Usability (Scenario 5)
1. Sign in as **👤 Client (Marcus)** in **Project Apollo**.
2. Click **"💰 Test 3: Pricing Discussion"** (`Can we apply a $2,000 discount to the upcoming milestone?`).
3. Click **Send**.
4. The message is delivered to the recipient because Commercial discussion is configured as "Allow & Flag".
5. Both client and employee can continue normal conversation without obstruction, while an in-app alert has been raised in the administrator queue.

---

### Step 6: Administrator Review Actions & Audit Log (Scenario 6)
1. In the top bar, click **"👑 Admin (Sophia)"**.
2. The **Administrator Oversight Dashboard** opens.
3. In the **Flag Review Queue**:
   - Locate the held contact-sharing message.
   - Click **"Approve & Deliver"**.
   - Locate the abusive or pricing message. Type a note (`"Policy violation"` or `"Permitted quotation"`) and click **"Reject"** or **"Dismiss False Positive"**.
4. Switch to the **Audit Trail** tab:
   - View the timestamped, actor-tagged audit entries for each action (`MESSAGE_APPROVED`, `MESSAGE_REJECTED`, `FLAG_DISMISSED_FALSE_POSITIVE`).
5. Switch back to **"🛠️ Employee (Devon)"** in Apollo:
   - Notice the approved message is now delivered and visible in the chat!

---

### Step 7: Revocation of Access & Duplicate Delivery Retries (Scenario 7)
1. Sign in as **👑 Admin (Sophia)**.
2. Go to the **Projects & Identities** tab.
3. In Project Apollo, find an assigned member and click the **Revoke Access** button.
4. Access is immediately terminated (membership status set to inactive).
5. Retrying approval on an already delivered message does not duplicate delivery (tested and confirmed via idempotent handler).
