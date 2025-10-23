# Theme System Changes

## Summary
Added a comprehensive theme system with three Rosé Pine variants and dynamic theme-tinted backgrounds.

## Themes Available
1. **Rosé Pine Night** - Dark purple-tinted theme
2. **Rosé Pine Moon** - Slightly lighter purple-tinted theme  
3. **Rosé Pine Dawn** - Light beige theme

## Key Changes

### Theme Selector
- **Location**: Sticky header at top-right (stays visible on scroll)
- **Persistence**: Theme choice saved to localStorage
- **No Flash**: Inline script prevents theme flash on page load

### Dynamic Backgrounds
Each theme now has a **tinted background gradient** instead of pure black:
- **Night**: Black with dark purple tint (`#191724` tint)
- **Moon**: Black with lighter purple tint (`#232136` tint)
- **Dawn**: Light beige gradient (`#faf4ed`)

### Glass Morphism
All cards use theme-aware glass effects:
- Semi-transparent backgrounds (`bg-black/30` to `bg-black/50` for dark themes)
- Theme surface colors for Dawn light theme
- Backdrop blur effects throughout

## Files Modified
- `lib/themes.ts` - Theme definitions and utility functions
- `components/ThemeProvider.tsx` - React context for theme management
- `components/ThemeSelector.tsx` - Dropdown theme selector UI
- `app/layout.tsx` - Added ThemeProvider and sticky header
- `tailwind.config.js` - CSS variables for dynamic theming
- `styles/globals.css` - Default CSS variables

## Testing
Run `bun run dev` and test:
1. Theme selector appears at top-right
2. Switching between Night, Moon, and Dawn themes
3. Page refresh preserves theme choice
4. Each theme has distinct background tinting
