RxIntervene
A lightweight, mobile-first web app that lets clinical pharmacists log their ward interventions as quickly as sending a text message, so that their clinical impact becomes visible and measurable.

Status: in extensive use at the University of Cape Coast Hospital, Ghana. The AI guideline assistant is being rebuilt on a vector-based retrieval backend (see below).

Why it exists

Clinical pharmacists optimise complex regimens and protect patient safety at the bedside every day, but many of those interventions are given verbally or tracked poorly, so they disappear once the pharmacist leaves the ward. When hospital leadership weighs resources and roles, that missing record makes the profession's value hard to show.

RxIntervene is built on a simple idea: if an intervention is not written down, it cannot be counted. Fast, frictionless documentation turns daily bedside work into data that institutions can act on.

What it does
Profile-aware login: recognises the clinical team profile at sign-in and tailors the workspace to it.
Fast intervention logging: text boxes grow as you type, so there are no cramped scrollbars on a phone, and saves go to the database in the background without lag.
Patient counselling terminal: a floating launch form for recording counselling sessions separately from interventions.
Live feed of past records: filter months of history by ward, time frame, month or year, and by physician response: Accepted, Modified, Pending or Rejected.
Full-screen editing: tap any record to correct the text, change its status or delete it.
In use

RxIntervene is used extensively at the University of Cape Coast Hospital in Ghana, where it supports the documentation of clinical interventions on the wards. [Add figures cleared by the hospital, such as the number of users or interventions logged, if available.]

AI guideline assistant

The app includes an assistant that draws on reference texts, currently the BNF and the Standard Treatment Guidelines, to check logged information such as drug doses. When a dose looks wrong, it is designed to show a short supporting note from the reference so the pharmacist can verify it.

Lessons from the first version

The first version stored the reference texts in Firestore as large text chunks, without a vector database. Every lookup therefore sent bloated sections of text to the language model just to find one sentence, which drove token usage, and cost, up very quickly.

The backend is now being rebuilt around vector embeddings, so that retrieval returns only the specific passages the assistant needs. The principle behind the rebuild is that a data layer has to be ready for AI before the feature is launched at scale.

Tech stack
Progressive Web App, serverless and browser-native
JavaScript (ES6) and Tailwind CSS
Firebase, with Firestore for live data
Gemini API for the assistant
Design principles
Mobile-first and usable at the bedside, instead of heavy desktop hospital software that keeps clinicians away from the patient
Zero-friction entry: logging an intervention should take seconds
The clinician stays responsible for every decision, and the assistant only supports verification
In progress
Vector-based retrieval for the guideline assistant
Patient follow-up alerts designed not to drain phone battery [confirm status]
Use of native device alarm intents [confirm status]
AI governance reporting that turns raw logs into institutional data [confirm status]
Part of a wider effort

RxIntervene is the working proof of concept for guideline support within a larger project on equitable access to medicine in Ghana. That project looks at how an integrated digital health platform could be adapted for Ghana's clinical and regulatory context. RxIntervene is a separate, independently built tool, and it is not part of any third-party platform.

Data and safety notes
No patient data, API keys or source code are included in this document or in the documentation repository.
Reference texts such as the BNF are cited as sources and are not reproduced here.

Team
Built by Dr (Pharm) Samuel Amoako. Co-founded with Dr (Med) Emmanuel Akuamoah. [www.linkedin.com/in/samuel-amoako-pharmd-330b301b0]
 [www.linkedin.com/in/samuel-amoako-pharmd-330b301b0]  [emmanuelakuamoah16@gmail.com]

A series of posts on the build is on LinkedIn: (https://lnkd.in/p/gQYd9Ejg)].
