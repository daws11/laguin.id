1) Goal

Build a mobile-first web application that lets users generate a custom song using AI, based on their personal story and music preferences. The frontend must clone the reference flow/design 1:1, and the backend must manage prompts, API integrations, customers, orders, and delivery via WhatsApp (instant or delayed).

⸻

2) Routes and App Structure

Public Frontend (React + shadcn UI, note that you can use shadcn mcp)
	•	Landing page: /
Clone 1:1 of: laguin.id/prices/custom-song-valentine
	•	Song configurator: /config
Clone 1:1 of: laguin.id/prices/order-valentine
	•	Checkout page: /checkout
Conversion-optimized page in the same style as the above flow (also mobile-first).

Admin Panel
	•	Admin: /admin
Internal dashboard for settings, prompt templates, customers, and orders.

⸻

3) Tech Stack Requirement

Frontend
	•	React (recommended: React + React Router, or React in a monorepo setup)
	•	Mobile-first implementation (layout, typography, form UX designed for mobile first)

Backend
	•	Node.js (recommended: Express or Fastify)
	•	Database (recommended: PostgreSQL)
	•	Job queue / scheduler (recommended: BullMQ + Redis, or a cron-based scheduler for MVP)

⸻

4) Frontend Requirements (Mobile-first + 1:1 Clone)

A) Landing Page (/)

Objective: replicate the look/feel/layout of the reference landing page exactly.
	•	Same section order, spacing, typography hierarchy, and CTA placements
	•	Mobile-first layout and responsiveness
	•	Strong CTA leading to /config

Acceptance criteria
	•	Mobile view matches reference page behavior first (sticky CTA behavior if applicable)
	•	Desktop is responsive enhancement (not separate design)

⸻

B) Song Configurator (/config)

Objective: replicate the reference configuration flow (step-based form UX).

Form inputs (minimum)
	•	Recipient name / Your name
	•	Occasion
	•	Story / context
	•	Music preferences (genre, mood, vibe, tempo, voice style if supported)
	•	Optional extra notes

UX requirements
	•	Step-by-step flow with progress indication
	•	Inline validation and clear error states
	•	Smooth transitions (no jarring reloads)
	•	On submit → create order in backend → redirect to /checkout

⸻

C) Checkout (/checkout)

Objective: conversion-optimized confirmation page in the same style.
	•	Summary of what the user entered
	•	Primary CTA: “Generate Song” / “Complete Order”
	•	Initial version: free checkout (no payment), but structure must be compatible with Xendit later
	•	Trust elements + clarity on delivery timing

Flow
	•	Confirm details → finalize order → show “processing” state → show success state (“We’ll deliver via WhatsApp”)

⸻

5) Backend Requirements

A) Settings Module (Admin)

Admin must manage:
	1.	API keys

	•	OpenAI API key (lyrics + description)
	•	kai.ai API key (Suno access)

	2.	WhatsApp integration settings

	•	Provider credentials/config
	•	Message template(s) for delivery

	3.	Delivery timing settings

	•	instant_enabled (boolean)
	•	ON → deliver as soon as generation completes
	•	OFF → delay delivery
	•	delivery_delay_hours (integer, required when instant is OFF)
	•	Example: 24 → deliver 24 hours after generation completes

⸻

B) Prompt Management Module (Admin)

Admin can manage prompt templates with placeholders for user input.

Prompt sections
	1.	Create Lyrics (OpenAI)
	2.	Create Music (kai.ai Suno)
	3.	Create Mood Description (OpenAI)

Placeholder system
Admin must be able to write prompts like:
	•	“Write lyrics about [story] for [recipient_name] on the occasion [occasion]…”
Supported placeholders should include (expandable):
	•	[name], [recipient_name], [story], [occasion], [music_preference], [mood], [language], etc.

Suno (kai.ai) settings in admin
A UI section to manage tunable parameters (whatever kai.ai exposes), for example:
	•	genre/style tags
	•	vocal type
	•	tempo / mood
	•	structure preferences
	•	instrumental vs vocal
(Exact fields depend on kai.ai spec; design admin to be extensible.)

⸻

C) Customers Module (Admin)
	•	Customer list view with:
	•	name
	•	WhatsApp number / contact
	•	order count
	•	latest order status
	•	Customer detail view:
	•	all submitted inputs
	•	order history
	•	delivery history/status

⸻

D) Orders Module (Admin)

Order statuses
	•	created
	•	processing
	•	completed
	•	failed
	•	plus delivery statuses:
	•	delivery_pending
	•	delivery_scheduled
	•	delivered
	•	delivery_failed

Order detail view shows
	•	All user inputs (exact raw form submission)
	•	Generated lyrics (final + intermediate if needed)
	•	Generated mood/description text
	•	Suno generation metadata (track IDs, settings used, etc.)
	•	Delivery schedule fields and timestamps
	•	Logs/errors (OpenAI/kai.ai/WhatsApp)

⸻

6) AI Generation Workflow (Backend)

Trigger points
	•	Order created on /config
	•	Order finalized/confirmed on /checkout (recommended to avoid accidental generation)

Processing pipeline (recommended)
	1.	Generate lyrics with OpenAI using “Create Lyrics” prompt template + placeholders
	2.	Generate mood description with OpenAI using “Create Mood Description” template (considers lyrics + preferences)
	3.	Generate music via kai.ai Suno using “Create Music” + settings
	4.	Save outputs to order
	5.	Compute delivery schedule:
	•	if instant: deliver ASAP
	•	if delayed: schedule at generation_completed_at + delivery_delay_hours
	6.	Deliver via WhatsApp:
	•	send link/file to customer
	•	record delivery result

⸻

7) Payments (Future: Xendit)
	•	MVP starts free
	•	Checkout page and backend must be designed so payments can be added later without rewriting:
	•	add payment_status field (free, pending, paid, failed)
	•	store xendit_invoice_id etc. when implemented
	•	block generation until paid when payments are enabled (future toggle)

⸻

8) Minimum Data Model (Conceptual)
	•	Settings
	•	openai_key (encrypted)
	•	kai_ai_key (encrypted)
	•	whatsapp_provider_config
	•	instant_enabled
	•	delivery_delay_hours
	•	PromptTemplates
	•	type: lyrics | mood_description | music
	•	template_text
	•	active_version
	•	optional json settings for kai.ai
	•	Customers
	•	name, whatsapp, email(optional)
	•	Orders
	•	customer_id
	•	input_payload (JSON)
	•	status fields
	•	lyrics_text
	•	mood_description
	•	track_url / file reference
	•	scheduled delivery timestamps + delivery status

⸻

9) Key Acceptance Criteria
	•	Routes exactly:
	•	/ landing
	•	/config configurator
	•	/checkout checkout
	•	/admin admin panel
	•	Mobile-first frontend that matches reference pages 1:1 in flow/design
	•	Admin can:
	•	set API keys
	•	manage prompt templates with placeholders
	•	manage kai.ai/Suno settings
	•	view customers + order detail
	•	set delivery timing (instant vs delayed)
	•	Backend reliably runs generation pipeline + WhatsApp delivery scheduling