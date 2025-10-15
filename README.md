# 🧪 Zerops WebSocket Subscription Test

Minimal reproduction app to investigate why WebSocket subscriptions stop working after the app has been in the background.

## 🎯 Purpose

This test app replicates the **EXACT** WebSocket behavior of the Zerops Angular application:
- Same connection flow
- Same subscription API calls
- Same ping/pong mechanism
- **NO re-subscription workarounds** (we want to understand the real problem)

## 🚀 Quick Start

### Method 1: With Node.js Server (Recommended)

The server allows you to configure credentials via environment variables.

**Setup:**

```bash
cd websocket-test

# Copy environment template
cp .env.example .env

# Edit .env and add your credentials
nano .env  # or use your editor

# Start server
npm start
```

**Or with inline environment variables:**

```bash
ACCESS_TOKEN="your-token" CLIENT_ID="your-client-id" npm start
```

**Then open:** http://localhost:3000

The credentials will be auto-filled from environment variables!

### Method 2: Direct HTML File

Open `index.html` directly in browser and enter credentials manually.

```bash
cd websocket-test
open index.html  # macOS
# or just drag index.html to your browser
```

---

### 1. Get Required Credentials

Open the Zerops app in your browser and get these values:

**Access Token:**
```
1. Open DevTools (F12)
2. Go to Application → Local Storage
3. Find key: zef_access_token
4. Copy the value
```

**Client ID:**
```
Option A - From localStorage:
1. Open DevTools (F12)
2. Go to Application → Local Storage
3. Find key that contains your user data
4. Look for clientId in the JSON

Option B - From Redux DevTools:
1. Open Redux DevTools
2. Go to State tab
3. Navigate to: clientUser → entities → <your-id> → clientId
4. Copy the value
```

### 2. Configure & Connect

If using Node.js server with environment variables, credentials are pre-filled. Otherwise:

1. Enter **Backend URL** (default: `https://app.zerops.io`)
2. Paste **Access Token**
3. Paste **Client ID**

Then:

4. Click **"1️⃣ Connect WebSocket"**
5. Wait for "✅ Connected" status
6. Click **"2️⃣ Subscribe All Entities"**

## 🧪 Test Scenarios

### Scenario 1: Normal Operation (Baseline)

**Steps:**
1. Connect WebSocket
2. Subscribe to all entities
3. Wait 2-3 minutes
4. Observe message counters incrementing

**Expected:** All subscriptions show "active" (green border) and receive messages

**Purpose:** Verify basic functionality works

---

### Scenario 2: Background Simulation (Primary Test)

**Steps:**
1. Complete Scenario 1
2. Wait until all subscriptions are receiving messages
3. Click **"🌙 Simulate Background (60s)"**
4. Wait 60 seconds (watch the log)
5. Observe what happens after timeout

**What This Does:**
- Stops ping/pong for 60 seconds (like browser tab suspension)
- Backend should close connection after ~30-60s of no heartbeat
- After 60s, attempts to send ping to check if connection is alive

**Expected Outcomes:**

**If ALL subscriptions work after reconnect:**
- Backend keeps subscriptions alive
- Problem is somewhere else

**If NO subscriptions work:**
- Backend deletes all subscriptions on disconnect
- Need to add re-subscription logic

**If SOME work (e.g., Process only):**
- Confirms TTL/timing theory
- Different cleanup rules for different entities

---

### Scenario 3: Process Timer Pattern

**Steps:**
1. Connect WebSocket
2. Click **"3️⃣ Start Process Timer (30s)"**
3. Click **"🌙 Simulate Background (60s)"**
4. Wait for full cycle
5. Observe if Process subscription recovers

**Purpose:** Test if timer-based re-subscription survives/recovers from background suspension

---

### Scenario 4: Real Browser Suspension

**Steps:**
1. Complete Scenario 1
2. **Switch to another browser tab** (don't use simulate button)
3. Wait 5 minutes
4. Return to test tab
5. Observe subscription status

**Purpose:** Test real browser behavior, not simulated

---

### Scenario 5: Subscription Age Test

**Steps:**
1. Connect WebSocket
2. Subscribe entities one-by-one with 30s gaps:
   - Subscribe Service → wait 30s
   - Subscribe Project → wait 30s
   - Subscribe Notification → wait 30s
   - Subscribe Process → wait 30s
3. Click **"🌙 Simulate Background (60s)"**
4. After reconnection, observe which subscriptions still work

**Expected (if TTL theory correct):**
- Older subscriptions (Service, Project) more likely to fail
- Newer subscriptions (Notification, Process) more likely to survive

**Purpose:** Prove cleanup is age-based

---

## 📊 What To Look For

### In the Subscription Status Panel:

**🟢 Green Border = Active:**
- Subscription sent ✅
- Messages being received ✅
- Last message timestamp updating ✅

**🟡 Yellow Border = Unknown:**
- Subscription sent ✅
- But no messages received yet ⚠️
- Might be normal if no data changes

**🔴 Red Border = Inactive:**
- Subscription never sent ❌
- Or subscription broken after reconnection ❌

### In the Event Log:

Look for patterns like:
```
[HH:MM:SS] ❌ WebSocket CLOSED (code: 1006, reason: none)
[HH:MM:SS] ☀️ RETURNING FROM BACKGROUND
[HH:MM:SS] ❌ Ping failed: connection is dead
[HH:MM:SS] 📨 Message received: ... [process__list-subscription]
[HH:MM:SS] (no messages for service/project/notification)
```

This would confirm: Process works, others don't.

---

## 🔍 Theory Validation

| Observation | Meaning |
|-------------|---------|
| **All subscriptions work after background** | Backend keeps subscriptions alive, no cleanup issue |
| **No subscriptions work after background** | Backend deletes ALL on disconnect, need re-subscription |
| **Process works, others don't** | Timer-based refresh keeps subscription alive |
| **Newer subscriptions work, older fail** | Age-based TTL cleanup confirmed |
| **Works on rapid reconnect (<5s)** | Backend has grace period |

---

## 🐛 Debugging Tips

### WebSocket Won't Connect

**Check:**
- Is access token valid? (Try refreshing from app)
- Is backend URL correct?
- Check browser console for CORS errors

### No Messages Received

**Check:**
- Is client ID correct?
- Do you have actual data for those entities in your account?
- Check Event Log for HTTP errors (401, 403, 404)

### Test Gets Stuck

**Solution:**
- Click "Reset All" button
- Refresh page
- Get fresh access token

---

## 📝 Expected Findings

Based on investigation, we expect:

**After 60s background simulation:**
```
✅ Process:       Active (if timer running) or recovers within 30s
❌ Service:       Inactive
❌ Project:       Inactive
❌ Notification:  Inactive
```

This would prove: **Backend cleans up subscriptions on disconnect, timer pattern survives via constant refresh.**

---

## 🔧 Technical Details

### Connection Flow

```
1. POST /api/rest/public/web-socket/login
   → Returns: { webSocketToken: "..." }

2. WebSocket connect to:
   wss://app.zerops.io/api/rest/public/web-socket/{receiverId}/{wsToken}

3. Backend sends: { type: "SocketSuccess", chainId: "...", sessionId: "..." }

4. Client starts ping/pong every 15s

5. POST /api/rest/public/{entity}/search
   Body: {
     subscriptionName: "...",
     receiverId: "...",
     wsOutputType: "listStream",
     search: [{ name: "clientId", operator: "eq", value: "..." }]
   }

6. Backend creates subscription:
   - Key: receiverId + subscriptionName
   - Sends messages via WebSocket when data changes
```

### Subscription Names Used

- **Service:** `service__list-subscription`
- **Project:** `project__project-base__list-subscription`
- **Notification:** `notification__list-subscription`
- **Process:** `process__list-subscription`

### Ping/Pong Mechanism

- Interval: 15 seconds
- Client sends: `{ type: "ping" }`
- Backend responds: `{ type: "pong" }`
- If no pong received, backend assumes client is dead
- Backend closes connection after ~30-60s of no heartbeat

---

## 🎓 Understanding The Results

### If Process Always Works:

The 30-second timer in the Angular app keeps the subscription "fresh" on the backend:

```typescript
// From process-base.effect.ts
switchMap((clientId) => timer(0, 30000).pipe(
  map(() => this.processEntity.listSubscribe(clientId, ...))
))
```

This HTTP call refreshes the subscription, so even if the connection dies and reconnects, the subscription is recreated automatically.

### If Others Don't Work:

Other entities subscribe only once when `activeClientId$` emits:

```typescript
// From service-base.effect.ts
this.activeClientId$.pipe(
  map((clientId) => this.serviceEntity.listSubscribe(clientId))
)
```

Since `activeClientId$` uses `distinctUntilChanged()`, it doesn't re-emit on reconnection, so subscriptions are never re-established.

---

## 💡 Solution (Not Implemented Here)

If tests confirm subscriptions break, the fix would be:

```typescript
// Add to app.effect.ts or websocket.effect.ts
private _resubscribeOnReconnect$ = createEffect(() => this.actions$.pipe(
  ofType(zefWebsocketOpened),
  debounceTime(100),
  withLatestFrom(this.userEntity.activeClientId$),
  filter(([_, clientId]) => !!clientId),
  mergeMap(([_, clientId]) => [
    // Re-dispatch ALL subscription actions
    this.serviceEntity.listSubscribe(clientId),
    this.serviceEntity.updateSubscribe(clientId),
    this.projectEntity.listSubscribe(clientId, ...),
    // ... etc
  ])
));
```

But we want to understand the problem first before implementing workarounds.

---

## 📞 Questions?

If you discover unexpected behavior, document it in the test results and share with the team.

---

## 🚢 Deploy to Zerops

You can deploy this test app to Zerops itself to test in a production-like environment:

**1. Import the service:**

```yaml
project:
  name: websocket-test
services:
  - hostname: test
    type: nodejs@20
    buildFromGit: https://github.com/fxck/ws-test
    enableSubdomainAccess: true
    envSecrets:
      ACCESS_TOKEN: <your-token>
      CLIENT_ID: <your-client-id>

```

**2. Set environment variables in Zerops UI:**

```
ACCESS_TOKEN=<your-token>
CLIENT_ID=<your-client-id>
```

**3. Deploy:**

```bash
# From websocket-test directory
zcli service push ws-test
```

**4. Access:**

Open the public URL provided by Zerops.

This lets you test the WebSocket behavior from a real server environment, which might reveal different timing/connectivity issues than localhost.

---

**Happy Testing! 🧪**
