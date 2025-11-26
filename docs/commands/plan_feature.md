
---

# **Improved plan_feature.md**

*(Drop this into `docs/command/plan_feature.md`)*

---

## **plan_feature.md**

When the user provides a **feature description**, your job is to generate a **technical implementation plan** that covers **both backend and frontend**.

The output must follow these rules:

---

## **1. Purpose of the Document**

Produce a **strictly technical requirements document** (not a product plan).
The document must be written into:

```
docs/features/_PLAN_<next-number>.md
```

Numbering starts at **0001** and increments sequentially.

---

## **2. What the Plan Must Contain**

### **A. A brief context description**

Explain the feature in 3–5 sentences using **verbatim details** from the user’s prompt.

---

### **B. Relevant Files & Functions**

Identify **all backend and frontend files** that must be created or modified, such as:

* Backend:

  * API routes
  * Controllers / services
  * DB models and migrations
  * Utility modules
  * Validation layers

* Frontend:

  * Pages / screens
  * Components
  * Hooks
  * State management logic
  * API client functions

Include **specific file paths** based on the project structure.

---

### **C. Data Models & DB Changes**

If the feature requires new tables, schema updates, or type modifications:

* List the exact fields
* Identify migrations
* Specify relationships
* Outline constraints

This section should be the **first phase** of the plan ("Data Layer").

---

### **D. Algorithms & Logic Flow (Step-by-step)**

Explain any required logic precisely:

* Input → processing → output
* Validation rules
* Conditions and branching
* Error and edge-case handling
* UI state flow (loading, success, errors)

Do **not** write code. Describe the algorithm in bullet steps.

---

### **E. Work Phasing (only if the feature is large)**

Use this structure ONLY when necessary:

1. **Phase 1: Data Layer / Types / Schema**
2. **Phase 2A: Backend API Layer**
3. **Phase 2B: Frontend UI Layer**
4. (Optional) Phase 3+: Background jobs, integrations, etc.

These phases must be parallel-friendly.

---

## **3. What to Avoid**

* ❌ No success metrics
* ❌ No acceptance criteria
* ❌ No timelines
* ❌ No migration plans
* ❌ No PM-style wording
* ❌ No actual code
* ❌ No vague statements — be specific and technical

---

## **4. Clarifying Questions (Optional)**

If the user’s prompt is unclear, you may ask **up to 5 clarifying questions**.
Only ask when:

* the feature scope is ambiguous
* multiple implementations are possible
* existing files conflict with user requirements

User answers must be incorporated directly into the plan.

---

## **5. Tone Guidelines**

* Concise and technical
* Use precise wording
* Reference exact filenames and structures
* Do not generalize or over-explain

---

## **6. Output Location**

Every plan must be saved to:

```
docs/features/_PLAN_<next-number>.md
```

Format:

```
# Feature <number>: <Feature Name>

## Context
...

## Data Layer
...

## Backend Changes
...

## Frontend Changes
...

## Logic Flow
...

## (Optional) Phases
...
```

---

