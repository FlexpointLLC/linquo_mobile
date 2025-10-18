# 🔔 Push Notification Behavior

## ✅ How It Works Now:

### **Scenario 1: Customer sends multiple messages**
```
Customer: "Hi"           → Notification queued: "Hi"
Customer: "Bujhlam Na"   → Old notification deleted, New: "Bujhlam Na"
Customer: "Kire"         → Old notification deleted, New: "Kire"
Agent receives: ONE notification showing "Kire" (latest message)
```

### **Scenario 2: Agent reads message**
```
Customer: "Hello"        → Notification queued: "Hello"
Agent opens chat        → Message marked as read_by_agent = true
                        → Pending notification cancelled
Agent receives: NO notification (already read)
```

### **Scenario 3: Multiple conversations**
```
Conversation A:
  Customer: "Hi"         → Notification: "Hi"
  
Conversation B:
  Customer: "Hello"      → Notification: "Hello"
  
Agent receives: TWO notifications (one per conversation)
```

## 🎯 Rules:

1. ✅ **Only LATEST message** per conversation
2. ✅ **Only UNREAD messages** (read_by_agent = false)
3. ✅ **Old pending notifications deleted** when new message arrives
4. ✅ **Notification cancelled** if agent reads message before it's sent
5. ✅ **One notification per agent** per conversation
6. ✅ **Only agents with device tokens** get notifications

## 🧪 Testing:

### Test 1: Multiple messages
1. Send 3 messages: "Hi", "How are you", "Are you there?"
2. Call Edge Function
3. Expected: ONE notification showing "Are you there?"

### Test 2: Read before notification
1. Customer sends: "Hello"
2. Agent opens chat and reads
3. Call Edge Function
4. Expected: NO notification (already read)

### Test 3: Multiple conversations
1. Start 2 different conversations
2. Send message in each
3. Call Edge Function
4. Expected: TWO notifications (one per conversation)

