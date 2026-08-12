# Fishing Game Invariants

These invariants MUST NOT be violated during any refactoring or feature additions:

1. **Character Stability**:
   - The boat/duck must not drift away when casting.
   - The runtime must not rotate the entire `AnimatedSprite` when the character casts the rod.
   - Character animation is kept static (frame 0) while the boat handles wave motion.
   - Do not use optical-flow or full-scale entire characters between animation frames.

2. **Performance Constraints**:
   - **No React State Updates at 60FPS**: The PixiJS ticker must not directly trigger React state updates per frame to avoid severe performance degradation.
   - **No Memory Leaks**: Heap must not continuously increase across multiple fishing turns.
   - **Lifecycle**: No duplicate utility executions, and all cleanup logic must be idempotent (safe to call multiple times). No double-destroying of Pixi nodes.

3. **UI / State Constraints**:
   - The result overlay must persist until the user clicks to collect (it cannot be overwritten by an `idle` state).
   - Ensure the modal lock, disabled state, focus, keyboard interactions, and reduced-motion preferences function correctly.

4. **Gameplay & Persistence**:
   - Do not change economy, save schemas, or gameplay balance without clear test coverage proving stability.
   - Existing save data (localStorage migrations, offline earnings, gift cooldowns, record catches) must not be lost or corrupted.
