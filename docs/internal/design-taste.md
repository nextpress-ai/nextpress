# Design Taste

This document outlines the core UI/UX guidelines and design principles for this project to ensure a consistent, intuitive, and modern user experience.

## UI/UX Guidelines

1. **Intuitive & Familiar**: UI should be intuitive and familiar so that users don't have to guess what to do or where to find things. While pursuing innovation, prioritize better UX and practicality.
2. **Digital-First Surface**: Avoid widget-heavy or paper-like interfaces. Optimize for desktop/app usage with a spacious, breathing feel. Use surfaces that look digital rather than physical.
3. **Micro-Interactions**: Use interaction animations only when they delight the user or provide feedback. Avoid continuous or attention-grabbing animations.
4. **Spacious Layouts**: Use tabs, accordions, slide sheets, cards, and segmented UI to keep things clean. Minimize text in favor of icons and visual cues.
5. **Clean Aesthetics**: Avoid gradients, sparkles, badges, glows, or shadows unless explicitly requested.
6. **Consistency**: Maintain uniform borders, padding, and spacing throughout the application to ensure a cohesive design language.
7. **Strong Typography**: Establish a clear visual hierarchy with readable fonts and distinct weight differences.
8. **Themed Experience**: The UI should feel intentionally themed rather than generic or random.
9. **Responsive & Adaptive**: Design for all screen sizes. The interface must be either responsive or adaptive to ensure usability everywhere.
10. **Anticipatory UX**: Anticipate user actions and streamline the interface to make the next step as easy as possible.
11. **Functional Efficiency**: Minimize the total number of items in the UI while maintaining 90%+ functionality. Use tables and cards to maximize utility in minimal surface area.
12. **Borders** use sharp borders for surfaces, tables, cards and panels but for buttons and inputs you can still optionally use rounded borders. Can also add some simple shadows to surfaces to give depth.
13. **Dividers** some times a diver is better than a card, don't put a surface within a surface eg. a card within a card or panel, mostly there use a divider instead, also for cards and surfaces, inner padding should be sufficient.
14. **Inputs** All inputs should have enough height, padding and spacing to ensure they are easy to use and accessible and on focus outlines and borders should not colide, either a ring, or border or outline, not all at once.
15. Always use UGX everywhere for Uganda currency not Ush
16. **Progressive Disclosure**: Avoid overwhelming users with too much information at once. Use progressive disclosure techniques to reveal information as needed, such as through tooltips, modals, or expandable sections.

## Visual Design Principles

1. **Emphasis & Dominance**: Create a focal point that intentionally draws attention. Primary actions or critical information should stand out immediately.
2. **Unity & Rhythm**: Form patterns that create harmony. Consistent repetition of styles and components helps the UI feel cohesive rather than fragmented.
3. **Hierarchy**: Arrange elements to communicate importance through size, typography, color, and placement. Guide the user's eye naturally through the content.
4. **Balance**: Distribute visual weight across the interface to create equilibrium. Proper spacing and layout prevent the design from feeling overwhelming.
5. **Proportion & Scale**: Use relative sizing to help users compare elements and understand relationships. A clear baseline improves visual clarity.
6. **Contrast**: Use differences in color, shape, and weight to distinguish elements. Contrast highlights important components and improves readability.
7. **Similarity**: Group related elements using shared visual characteristics like color or style. This helps users perceive structure and improves comprehension.


contrast is not good accross surfaces and give depth and distinction between surfaces, headers or embedded surfaces should be distinct from primary ones.
you can also give some surfaces colored bg, not all UI has to be uniform or all white or all dark, a sidebar can be dark for example with a main white content area in main view etc.

colored border on a card on one end of the card should be avoided

instead cards and popup models may have a header spanning full width with title and close button for popup, responsive for mobile and desktop or for just cards, a card can have title bar with distinct color usually muted or vairant of card body color, then card can have some utility quick actions or so with proper section dividers for easy mental comprehension of its contents, cards can also be smart if needed i.e resizable, draggable etc, same for table headers, and for table body or pop up modals contents area should be scrollable where it needs to such as on small devices.

popup modals should not be lazily designed, no problem adding an icon near the modal title, add proper close icon button, distinct header variant of body bacground, scrollable content area responsive, and clear bottom actions including cancel and the action to take.

Don't explain what is obvious, therefore a title on a modal is enough or a form sometimes, you don't need description or explainer text or something like that, UI should speak by itself through its intuitiveness.

When designing tables, avoid putting too much information in the table, use cards or popups to show more details when needed, and also use pagination or infinite scroll to avoid overwhelming the user with too much data at once, also use sorting and filtering to help users find what they are looking for quickly.

Never put any items like title, action buttons, sub text or description and close button together like packed in one corner of a card or modal, always give them enough breathing space and also use dividers to separate different sections of the card or modal for better visual hierarchy and comprehension.