# Delivery Rush Design Bible — Navigation Index

**Start here:** Read the [Canonical Brief](./00_CANONICAL_BRIEF.md) first. It is the single source of truth for game identity, mechanics, and design decisions. Its Reconciliation section wins over any chapter.

---

## 01 — Game Design

The creative vision, gameplay mechanics, player fantasy, and design pillars.

### 01 Foundations

Core identity, vision, and value statements.

- [Executive Summary](./01_Game_Design/01_Foundations/01_Executive_Summary.md) — Game concept, USPs, and quick profile
- [Vision](./01_Game_Design/01_Foundations/02_Vision.md) — Core vision chasing combos and throttle mastery
- [Pitch Ladder](./01_Game_Design/01_Foundations/03_Elevator_Pitch.md) — 5, 15, and 30 second pitches
- [High Concept](./01_Game_Design/01_Foundations/04_High_Concept.md) — The core hook and player fantasy
- [Game Identity](./01_Game_Design/01_Foundations/05_Game_Identity.md) — Emotional, visual, audio, narrative, interaction identity
- [Core Values](./01_Game_Design/01_Foundations/06_Core_Values.md) — Ranked priority values and principles

### 02 Gameplay

Mechanics, loops, difficulty, and player progression.

- [Core Gameplay Loop](./01_Game_Design/02_Gameplay/01_Core_Gameplay_Loop.md) — Micro loop (4-7 seconds per delivery)
- [Game Flow](./01_Game_Design/02_Gameplay/02_Game_Flow.md) — Core game states and player journey
- [Gameplay Pillars](./01_Game_Design/02_Gameplay/03_Gameplay_Pillars.md) — One-thumb throttle mastery pillar
- [Player Fantasy](./01_Game_Design/02_Gameplay/04_Player_Fantasy.md) — Skilled courier fantasy and mechanics
- [Emotional Design](./01_Game_Design/02_Gameplay/05_Emotional_Design.md) — Emotional beats and player feeling
- [Player Psychology](./01_Game_Design/02_Gameplay/06_Player_Psychology.md) — Psychological engagement and motivation
- [Cognitive Load Design](./01_Game_Design/02_Gameplay/07_Cognitive_Load_Design.md) — Information density and mental load
- [Difficulty Philosophy](./01_Game_Design/02_Gameplay/08_Difficulty_Philosophy.md) — Fair challenge and accessibility
- [Difficulty Curve](./01_Game_Design/02_Gameplay/09_Difficulty_Curve.md) — 45-90 second progression with difficulty ramps
- [Learning Curve](./01_Game_Design/02_Gameplay/10_Learning_Curve.md) — Onboarding and skill progression
- [Dopamine Loops](./01_Game_Design/02_Gameplay/11_Dopamine_Loops.md) — Reward rhythm and engagement cycles
- [Reward Systems](./01_Game_Design/02_Gameplay/12_Reward_Systems.md) — Coins, multipliers, and progression rewards
- [Retention Strategy](./01_Game_Design/02_Gameplay/13_Retention_Strategy.md) — Session hooks and replay motivation
- [Session Length](./01_Game_Design/02_Gameplay/14_Session_Length.md) — Time budgets and pacing
- [Replayability Strategy](./01_Game_Design/02_Gameplay/15_Replayability_Strategy.md) — Procedural generation and variety

### 03 Players

Target audience, personas, and player motivation.

- [Target Audience](./01_Game_Design/03_Players/01_Target_Audience.md) — Casual mobile players, demographics, and platform priority
- [Player Personas](./01_Game_Design/03_Players/02_Player_Personas.md) — Distinct player archetypes and playstyles
- [Player Journey](./01_Game_Design/03_Players/03_Player_Journey.md) — First impression through long-term play
- [Player Motivation](./01_Game_Design/03_Players/04_Player_Motivation.md) — Core drives and engagement drivers
- [Player Behavior](./01_Game_Design/03_Players/05_Player_Behavior.md) — Expected play patterns and decision-making

### 04 Design Craft

Design principles, constraints, and game feel.

- [Design Principles](./01_Game_Design/04_Design_Craft/01_Design_Principles.md) — Input latency, feedback, and responsiveness
- [Design Goals](./01_Game_Design/04_Design_Craft/02_Design_Goals.md) — Measurable design targets and success criteria
- [Design Constraints](./01_Game_Design/04_Design_Craft/03_Design_Constraints.md) — Technical and creative limitations
- [UX Philosophy](./01_Game_Design/04_Design_Craft/04_UX_Philosophy.md) — Player control and clarity principles
- [Game Feel Manifesto](./01_Game_Design/04_Design_Craft/05_Game_Feel_Manifesto.md) — Juice, feedback, and satisfaction
- [Visual Language](./01_Game_Design/04_Design_Craft/06_Visual_Language.md) — Visual communication and iconography

---

## 02 — Technical Design

Architecture, systems, rendering, and quality targets.

### 01 Technical Foundations

Vision, pillars, and technology selection.

- [Technical Vision & Pillars](./02_Technical_Design/01_Technical_Foundations/01_Technical_Vision_And_Pillars.md) — Three.js, 60 FPS mobile, <100ms input latency
- [Target Platforms & Constraints](./02_Technical_Design/01_Technical_Foundations/02_Target_Platforms_And_Constraints.md) — Device targets and performance budgets
- [Technology Stack Selection](./02_Technical_Design/01_Technical_Foundations/03_Technology_Stack_Selection.md) — Phaser, TypeScript, Vite justification
- [Non-Functional Requirements](./02_Technical_Design/01_Technical_Foundations/04_Non_Functional_Requirements.md) — Performance, security, accessibility specs

### 02 Systems & Data

Architecture, systems specification, and game state.

- [Systems Architecture Overview](./02_Technical_Design/02_Systems_And_Data/01_Systems_Architecture_Overview.md) — System inventory and interaction map
- [System Specification Method](./02_Technical_Design/02_Systems_And_Data/02_System_Specification_Method.md) — Behavior-focused system contracts
- [Game State & Data Model](./02_Technical_Design/02_Systems_And_Data/03_Game_State_And_Data_Model.md) — Player profile, run state, and persistence
- [Game Loop & State Management](./02_Technical_Design/02_Systems_And_Data/04_Game_Loop_And_State_Management.md) — Frame update and state machine
- [Algorithms & Formulas](./02_Technical_Design/02_Systems_And_Data/05_Algorithms_And_Formulas.md) — Scoring, difficulty, and math
- [Data-Driven Design & Content Pipeline](./02_Technical_Design/02_Systems_And_Data/06_Data_Driven_Design_And_Content_Pipeline.md) — Balance tuning and content authoring
- [Input & Control Abstraction](./02_Technical_Design/02_Systems_And_Data/07_Input_And_Control_Abstraction.md) — Touch, keyboard, and gamepad handling

### 03 Quality, Risk & Operations

Performance, reliability, and testing strategy.

- [Performance Budgets & Optimization](./02_Technical_Design/03_Quality_Risk_And_Ops/01_Performance_Budgets_And_Optimization.md) — FPS targets and profiling
- [Persistence & Save Systems](./02_Technical_Design/03_Quality_Risk_And_Ops/02_Persistence_And_Save_Systems.md) — LocalStorage, versioning, and migration
- [Networking & Multiplayer](./02_Technical_Design/03_Quality_Risk_And_Ops/03_Networking_And_Multiplayer.md) — Online services and future multiplayer
- [Technical Risk & Validation](./02_Technical_Design/03_Quality_Risk_And_Ops/04_Technical_Risk_And_Validation.md) — Risks and validation strategy

---

## 03 — Art & UI/UX Bible

Visual direction, user experience, and audio design.

### 01 Art Direction

Aesthetic, color, and visual system.

- [Art Vision & Pillars](./03_Art_And_UIUX_Bible/01_Art_Direction/01_Art_Vision_And_Pillars.md) — Clarity over realism, warm inviting color, snappy energy
- [Visual Identity & Style Guide](./03_Art_And_UIUX_Bible/01_Art_Direction/02_Visual_Identity_And_Style_Guide.md) — Low-poly 3D style and rendering approach
- [Color System](./03_Art_And_UIUX_Bible/01_Art_Direction/03_Color_System.md) — Palette, contrast, and color theory
- [Typography](./03_Art_And_UIUX_Bible/01_Art_Direction/04_Typography.md) — Font selection and text hierarchy
- [Shape Language & Iconography](./03_Art_And_UIUX_Bible/01_Art_Direction/05_Shape_Language_And_Iconography.md) — Visual shapes and emoji glyph system

### 02 UI/UX

User interface and experience design.

- [UX Principles](./03_Art_And_UIUX_Bible/02_UI_UX/01_UX_Principles.md) — Clarity, feedback, consistency, and player control
- [UI Architecture & Screen Flow](./03_Art_And_UIUX_Bible/02_UI_UX/02_UI_Architecture_And_Screen_Flow.md) — Screen hierarchy and navigation
- [HUD & In-Game UI](./03_Art_And_UIUX_Bible/02_UI_UX/03_HUD_And_In_Game_UI.md) — Combo meter, timers, and feedback display
- [Menus & Navigation](./03_Art_And_UIUX_Bible/02_UI_UX/04_Menus_And_Navigation.md) — Main menu, pause, results, and transitions
- [Feedback & Game Juice](./03_Art_And_UIUX_Bible/02_UI_UX/05_Feedback_And_Game_Juice.md) — Particles, screen shake, and satisfaction
- [Accessibility](./03_Art_And_UIUX_Bible/02_UI_UX/06_Accessibility.md) — Color blindness, input options, and inclusive design

### 03 Audio & Production

Audio design and asset pipeline.

- [Audio Direction](./03_Art_And_UIUX_Bible/03_Audio_And_Production/01_Audio_Direction.md) — Sonic identity, synthesized SFX, and music
- [Art Asset Pipeline & Consistency](./03_Art_And_UIUX_Bible/03_Audio_And_Production/02_Art_Asset_Pipeline_And_Consistency.md) — Procedural generation and asset workflow

---

## How to Use This Index

1. **First time?** Start with the [Canonical Brief](./00_CANONICAL_BRIEF.md) for all decisions in one place.
2. **Design decisions?** Check the relevant section (Game Design, Technical, or Art).
3. **Deep dive?** Read all chapters in a section in order; they build on each other.
4. **Looking for something specific?** Use Ctrl+F to search this README and jump to the section.
5. **Contradictions?** The Canonical Brief's Reconciliation section always wins.
