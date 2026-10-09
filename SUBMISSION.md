# Draft challenge summary

> Owner review required. Implementation and verification are different. This draft must not be submitted as a claim of eligibility while historical data, production officer validation, evaluator access and final production demonstration remain incomplete.

BeiSawa (“fair price”) is a prototype for evidence-led procurement review. Its only bundled records are four labelled synthetic examples. No result is evidence about a real tender, supplier or institution.

A Next.js desk uses Neon authentication, private object storage and Postgres through a Neon Function, with a Python engine hosted on Render. BeiSawa's own MCP server exposes search, record retrieval, deterministic value checks and draft writing. The borrowed filesystem MCP server reads a scoped review playbook. Findings carry dataset-scoped source identifiers and JSON Pointer citations. The writer re-resolves citations and recomputes deterministic analysis.

In Ollama mode a LangGraph loop asks Qwen to select the next discovered MCP tool. Server code fixes scoped arguments, imposes an eight-choice budget, and retries retrieval before abstaining when evidence stays incomplete. The separate test stub is labelled and does not measure Qwen quality. One genuine local Qwen 2.5 3B run completed in 98.554 seconds on synthetic data, with choices, citations, digest and audit recorded. This is feasibility evidence, not a real-data accuracy claim.

Drafts pause at a human interrupt, with the checkpoint and canonical content hash stored in Neon. Only operator-configured named officer subjects can approve or reject their own workspace revision. Approval binds the exact hash. A serialized transaction resumes the workflow and creates one immutable internal filed report; retries return the same report. This does not award, reject, cancel or submit a tender. Local tests verify the controls; actual officer setup and production filing remain unverified.

The public domain renders sign-in. A public `/demo` route displays that genuine recorded run without login. The owner designated Roy Okola Otieno as both approval officer and evaluator, using his existing account. Authenticated production evaluation remains unverified; no independent evaluation is claimed. Historical Kenya energy/solar data, practitioner evaluation, institutional adoption and a production approval demonstration are not claimed. A 35-second recorded-run browser walkthrough is available. The submission must describe these limits accurately until evidence is available.
