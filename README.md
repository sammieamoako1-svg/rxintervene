**RxIntervene**

RxIntervene is a lightweight, mobile-first digital health platform designed to help clinical pharmacists document, monitor, and analyze their clinical interventions efficiently and as quickly as sending a text message, making their clinical impact more visible ands measurable.
By transforming routine bedside activities into structured data, the platform seeks to strengthen medication safety, improve documentation, and support evidence-informed healthcare management. 


Status: In extensive use at the University of Cape Coast Hospital, Ghana, where it supports the documentation of clinical interventions on the wards. The AI guideline assistant is being rebuilt on a vector-based retrieval backend (see below).



1. The Healthcare Challenge

Clinical pharmacists play an important role in optimizing medication regimens, identifying prescribing concerns, preventing medication-related harm, and supporting clinical decision-making.

However, many pharmaceutical interventions are communicated verbally or documented inconsistently. Consequently, valuable contributions to patient care may remain invisible within institutional performance records.

This creates several challenges:

-Limited documentation of clinical pharmacy interventions.

-Difficulty tracking whether recommendations are accepted, modified, or rejected.

-Inadequate longitudinal records for monitoring clinical interventions.

-Limited availability of structured data for quality improvement.

-Difficulty demonstrating clinical pharmacy contributions to hospital administrators and policymakers.

The central principle behind RxIntervene is simple:

If an intervention is not documented, it cannot be systematically counted, evaluated, or used to inform institutional decisions.

RxIntervene seeks to address this documentation gap through an accessible digital platform designed around clinical workflows.

2. The RxIntervene Solution

RxIntervene enables clinical pharmacists to record, retrieve, monitor, and analyze their interventions through a mobile-friendly interface.

Rather than introducing complicated documentation procedures, the application prioritizes rapid entry and accessibility at the bedside.

Its design is guided by three principles:

Accessibility: A mobile-first interface suitable for use during routine ward activities. Its Profile-aware login recognizes the clinical team profile at sign-in and tailors the workspace to it. With its Full-screen editing feature, you can tap any record to correct the text, change its status or delete it.

Efficiency: Minimal steps between identifying a clinical issue and documenting an intervention. With Fast intervention logging, text boxes grow as you type, so there are no cramped scrollbars on a phone, and saves go to the database in the background without lag. It has a Patient counselling terminal: a floating launch form for recording counselling sessions separately from interventions.

Accountability: Structured records that make clinical recommendations and their outcomes easier to monitor. It has Live feed of past records. One can filter months of history by ward, time frame, month or year, and by physician response: Accepted, Modified, Pending or Rejected.

The broader objective is to translate routine clinical pharmacy practice into information that healthcare institutions can use to evaluate services, identify gaps, and support improvement.

3. Application Demonstration

The live application requires authorized login. The demonstration screenshots below provide a public overview of its interfaces.


 **Notice: All screenshots contain fictional patient data or appropriately de-identified information.**

3.1 Clinical Intervention Activity

The activity interface allows pharmacists to review documented interventions across clinical departments, including their recorded outcomes.
<img width="32%" height="360" alt="image" src="https://github.com/user-attachments/assets/2e577500-89bd-4d69-b568-9665e92f7cea" />



3.2 Clinical Intervention Documentation and Editing

The intervention management interface supports documentation of clinical issues, pharmacist recommendations, intervention outcomes, and subsequent corrections.

<img width="35%" height="360" alt="image" src="https://github.com/user-attachments/assets/d2620891-96df-4037-afa1-dc527472bd84" />



3.3 Analytics and Performance Monitoring

The analytics interface presents intervention activity through summary statistics and visualizations, including recorded intervention volumes, acceptance rates, departmental distributions, and outcomes.
<img width="40%" height="360" alt="image" src="https://github.com/user-attachments/assets/a414a533-8376-4a2d-84c0-0549f789633c" />

<img width="40%" height="360" alt="image" src="https://github.com/user-attachments/assets/134193b2-3018-47e3-a9ef-0dfd056fba72" />




3.4 Follow-up Tracking

The follow-up interface supports the monitoring of clinical recommendations requiring subsequent review or action.

<img width="32%" height="360" alt="image" src="https://github.com/user-attachments/assets/634cb39e-5d0c-47b4-84ae-7f34e8e4b5a9" />



3.5 AI Clinical Audit and Reporting

The platform includes an AI clinical audit interface and options for exporting clinical intervention and counselling records.

<img width="32%" height="360" alt="image" src="https://github.com/user-attachments/assets/0319728b-5631-4729-b52b-0ef5d03605e0" />


4. Core Platform Features

Profile-Aware Login: The application recognizes clinical team profiles during authentication and adapts the workspace accordingly.

Rapid Intervention Documentation: Clinical pharmacists can document interventions through mobile-friendly text fields that expand automatically during entry.

Records are saved to the database in the background, minimizing interruptions to the documentation workflow.

Patient Counselling Documentation: A dedicated counselling interface enables pharmacists to record patient counselling sessions separately from other clinical interventions.

Intervention History and Monitoring: Users can retrieve historical records and filter them by:

Clinical department or ward.

Time frame, month, or year.

Physician response.

Intervention outcome: Accepted, Modified, Pending, or Rejected.



Intervention Editing :Authorized users can open existing records to correct documentation, update intervention status, or delete records.

Analytics and Reporting :The platform provides visual summaries of recorded interventions, supporting the monitoring of clinical pharmacy activity and outcomes.

Data Export: Intervention and counselling records can be exported for further review and reporting.



5. AI guideline assistant

RxIntervene includes an AI-assisted guideline-support component designed to help pharmacists verify clinical information against reference materials.
The assistant draws on clinical reference sources, including:

British National Formulary (BNF).

Standard Treatment Guidelines. 

When a dose looks wrong, it is designed to show a short supporting note from the reference so the pharmacist can verify it.

6.Lessons from the first version

The first version stored the reference texts in Firestore as large text chunks, without a vector database. Every lookup therefore sent bloated sections of text to the language model just to find one sentence, which drove token usage, and cost, up very quickly.

The backend is now being rebuilt around vector embeddings, so that retrieval returns only the specific passages the assistant needs. The principle behind the rebuild is that a data layer has to be ready for AI before the feature is launched at scale.


7. Clinical and Public Health Relevance

RxIntervene sits at the intersection of clinical practice, digital health, health information systems, and healthcare management.

Medication Safety: Structured documentation may support the identification and review of medication-related concerns and prescribing recommendations.

Healthcare Quality Improvement: Intervention records can provide information for identifying recurring clinical issues, monitoring responses, and evaluating documentation practices.

Health Information Systems: The platform demonstrates how routine bedside activities can be converted into structured digital records suitable for analysis and reporting.

Health Systems Management: Aggregated intervention data may help healthcare managers better understand clinical pharmacy activities and identify areas requiring additional attention or resources.

Evidence-Informed Decision-Making: By making clinical interventions more visible, RxIntervene aims to strengthen the availability of information that can inform service planning, performance monitoring, and institutional decision-making.



8. Founders and Contributions

Dr. Samuel Amoako, PharmD

Co-Founder | Software Development

-Led the technical development and implementation of RxIntervene.

-Translated the clinical concept and workflow requirements into a functional digital platform.

-Developed the application architecture, user interfaces, database integration, and supporting software functionality.

Dr. Emmanuel Kwame Akuamoah, MBChB

Co-Founder | Clinical Concept and Workflow Design

-Developed the clinical concept underlying RxIntervene, identifying the need for structured documentation and improved visibility of clinical pharmacy interventions.

-Led the conceptual design of clinical workflows to support intervention recording, patient counselling documentation, and medication safety.

-Translated clinical needs into functional requirements to guide the platform's development.

-Collaborated on aligning the platform's proposed functionality with healthcare delivery needs.

9. Collaborative Vision

RxIntervene brings together clinical expertise and software development to create an accessible digital tool for documenting pharmaceutical interventions and supporting data-informed healthcare delivery.

10. Technology stack


Progressive Web App, serverless and browser-native
JavaScript (ES6) and Tailwind CSS
Firebase, with Firestore for live data
Gemini API for the assistant

11. Design principles


Mobile-first and usable at the bedside, instead of heavy desktop hospital software that keeps clinicians away from the patient
Zero-friction entry: logging an intervention should take seconds
The clinician stays responsible for every decision, and the assistant only supports verification

In progress

Vector-based retrieval for the guideline assistant

Patient follow-up alerts designed not to drain phone battery 

Use of native device alarm intents 

AI governance reporting that turns raw logs into institutional data


12. Part of a wider effort

RxIntervene is the working proof of concept for guideline support within a larger project on equitable access to medicine in Ghana. That project looks at how an integrated digital health platform could be adapted for Ghana's clinical and regulatory context. RxIntervene is a separate, independently built tool, and it is not part of any third-party platform.

13. Data and safety notes

No patient data, API keys or source code are included in this document or in the documentation repository.
Reference texts such as the BNF are cited as sources and are not reproduced here.

14. Team
Built by Dr (Pharm) Samuel Amoako. Co-founded with Dr (Med) Emmanuel Akuamoah. [www.linkedin.com/in/samuel-amoako-pharmd-330b301b0]
 [www.linkedin.com/in/samuel-amoako-pharmd-330b301b0]  [emmanuelakuamoah16@gmail.com]

A series of posts on the build is on LinkedIn: (https://lnkd.in/p/gQYd9Ejg)].
