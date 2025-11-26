
rules:
  - description: |
      Always start documentation with a concise summary of the file or module.
      Follow up with clear sections like Purpose, Inputs, Outputs, and Examples (if applicable).
    appliesTo: files
    when: writing documentation

  - description: |
      Use docstring style that matches the language (e.g., Google-style for Python, TSDoc for TypeScript).
      Include function description, parameters, return type, and side effects.
    appliesTo: functions
    when: writing documentation

  - description: |
      When explaining how the application works, break it down into:
        1. High-level architecture (e.g., frontend ↔ API ↔ DB)
        2. Key workflows (e.g., User Signup, Transaction Flow)
        3. Data flow (what is sent/received)
        4. Relevant file/module locations
    appliesTo: files
    when: writing flow explanations

  - description: |
      Prefer markdown (.md) files for overall app documentation like `README.md`, `ARCHITECTURE.md`, or `FLOW.md`.
      Use bullet points and diagrams where possible (you can suggest Mermaid syntax for flowcharts).
    appliesTo: files
    when: creating new documentation

  - description: |
      If the function is a controller, document what route it handles, the request method, expected body/query params, and response format.
    appliesTo: functions
    when: writing documentation
