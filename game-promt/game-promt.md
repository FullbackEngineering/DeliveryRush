# PROJECT: DELIVERY RUSH

You are a senior game developer, game designer, UI/UX designer, software architect, and Phaser 3 expert.

Build a production-quality HTML5 mobile game called **Delivery Rush**.

## Core Vision

Delivery Rush is a highly polished casual arcade courier game designed for GameTegra.

The game must feel like a premium mobile title with satisfying controls, smooth animations, and extremely addictive gameplay.

Target session length:

30–90 seconds.

Target audience:

Age 4–18.

The game must be easy to learn but difficult to master.

---

# Technology

- Phaser 3
- TypeScript
- Vite
- Mobile First
- Responsive UI
- 60 FPS
- Portrait mode
- Component-based architecture
- Object Pooling
- Event-driven systems
- Finite State Machines where appropriate

---

# Gameplay

The player's vehicle automatically drives forward.

The player controls the vehicle using only three large touch buttons:

- Turn Left
- Go Straight
- Turn Right

The city contains:

- restaurants
- customers
- highways
- intersections
- traffic lights
- police
- pedestrians
- accidents
- road work
- weather

Deliver orders before the timer expires.

Chain deliveries increase score multipliers.

Missing deliveries reduces combo.

---

# Procedural City

Generate endless small city layouts.

Different themes:

- Modern City
- Snow
- Desert
- Cyberpunk
- Beach
- Europe
- Tokyo
- Dubai

Every run should feel unique.

---

# Vehicles

Implement a garage with unlockable and upgradeable vehicles.

Stats:

- Speed
- Acceleration
- Handling
- Braking
- Durability
- Fuel
- Nitro
- Cargo Capacity

Vehicles have different visual styles.

---

# Card System

Implement collectible ability cards.

Player equips three cards before each run.

Examples:

- Police Ignore You
- Highway Speed +30%
- Fuel +20%
- Coin Bonus
- Traffic Reduction
- Free First Crash
- VIP Orders Spawn More
- Drone Delivery
- Slow Motion
- Magnet Coins

Cards have rarity:

Common

Rare

Epic

Legendary

Cards can be upgraded.

---

# Economy

Currencies:

Coins

Gems

Coins are earned through gameplay.

Gems are premium currency.

Include:

Battle Pass

Daily Shop

Daily Missions

Achievements

Weekly Events

Rewarded Ads

Cosmetic Vehicle Skins

No pay-to-win mechanics.

---

# Online

Design the architecture so online systems can be added later:

Global Leaderboards

Country Rankings

Friends Rankings

Weekly Tournaments

Season Pass Progress

Player Profiles

Cloud Save

Do not hard-code networking.

Use service interfaces and mock implementations.

---

# UI/UX

Create a AAA-quality mobile interface inspired by premium casual games.

Requirements:

- Smooth transitions
- Juice effects
- Particle effects
- Screen shake
- Floating rewards
- Animated buttons
- Responsive layouts
- Haptic feedback hooks
- High readability
- Accessible color palette

---

# Audio

Design hooks for:

Engine sounds

Traffic

Delivery success

Coins

UI clicks

Near miss

Police siren

Nitro

---

# Code Quality

Follow SOLID principles.

Use clean architecture.

Separate:

Core

Gameplay

UI

Managers

Systems

Services

Audio

Input

Scenes

Assets

Effects

No monolithic classes.

Document every module.

Generate a scalable project suitable for future live-service updates.

The final result should look and feel like a commercially released mobile game rather than a prototype.