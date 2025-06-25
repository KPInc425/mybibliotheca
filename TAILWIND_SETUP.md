# Tailwind CSS + DaisyUI Setup

## Overview

MyBibliotheca has been migrated from Bootstrap to Tailwind CSS with DaisyUI for better theming, customization, and maintainability.

## Features

### 🎨 **Custom Theme System**
- **MyBibliotheca Theme**: Warm, book-themed color palette with browns and golds
- **Dark Mode Support**: Built-in dark theme toggle
- **Consistent Design**: Unified color system across all components

### 🧹 **Clean Code**
- **Removed 200+ lines** of custom CSS from templates
- **Modular Components**: DaisyUI components for consistent UI
- **Utility-First**: Tailwind utility classes for rapid development

### 📱 **Better Mobile Experience**
- **Responsive Design**: Mobile-first approach
- **Touch-Friendly**: Optimized for mobile interactions
- **Performance**: Smaller CSS bundle size

## File Structure

```
app/static/
├── styles.css          # Main Tailwind + DaisyUI configuration
├── output.css          # Generated CSS (after build)
└── scanner-*.js        # Modular scanner components

templates/
├── base.html           # Updated with Tailwind classes
└── add_book.html       # Completely rewritten with Tailwind
```

## Theme Configuration

### Custom Colors (MyBibliotheca Theme)
```css
/* Base colors - Warm, book-themed palette */
--color-base-100: oklch(0.99 0.01 85); /* Warm white */
--color-base-200: oklch(0.96 0.02 85); /* Light cream */
--color-base-300: oklch(0.92 0.03 85); /* Medium cream */

/* Primary - Rich brown */
--color-primary: oklch(0.45 0.12 85);

/* Secondary - Golden accent */
--color-secondary: oklch(0.75 0.15 85);

/* Accent - Warm gold */
--color-accent: oklch(0.7 0.18 85);
```

### Available Themes
- `mybibliotheca` (default) - Custom book-themed palette
- `dark` - Dark mode variant
- All DaisyUI themes available via theme toggle

## Development

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Build CSS for development:
   ```bash
   npm run build:css
   ```

3. Build CSS for production:
   ```bash
   npm run build:css:prod
   ```

### Key Components

#### Navigation
```html
<div class="navbar bg-base-100 shadow-lg">
  <div class="navbar-start">
    <!-- Mobile menu -->
  </div>
  <div class="navbar-center hidden lg:flex">
    <!-- Desktop menu -->
  </div>
  <div class="navbar-end">
    <!-- User menu -->
  </div>
</div>
```

#### Cards
```html
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <!-- Card content -->
  </div>
</div>
```

#### Forms
```html
<div class="form-control">
  <label class="label">
    <span class="label-text">Field Label</span>
  </label>
  <input class="input input-bordered" type="text">
</div>
```

#### Buttons
```html
<button class="btn btn-primary">Primary Button</button>
<button class="btn btn-secondary">Secondary Button</button>
<button class="btn btn-outline">Outline Button</button>
```

#### Alerts
```html
<div class="alert alert-success">
  <svg><!-- icon --></svg>
  <span>Success message</span>
</div>
```

## Migration Benefits

### Before (Bootstrap)
- 200+ lines of custom CSS
- Complex theming system
- Large bundle size
- Difficult customization

### After (Tailwind + DaisyUI)
- 50 lines of configuration
- Built-in theme system
- Smaller bundle size
- Easy customization

## Custom Animations

### Scanner Animations
```css
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 20px oklch(0.7 0.18 85 / 0.6); }
  50% { box-shadow: 0 0 30px oklch(0.7 0.18 85 / 0.8); }
}

.animate-pulse-gold {
  animation: pulse 2s infinite;
}
```

### Notification Animations
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

## Browser Support

- **Modern Browsers**: Full support
- **Mobile Browsers**: Optimized for iOS Safari and Chrome Mobile
- **Progressive Enhancement**: Graceful degradation for older browsers

## Performance

- **CSS Size**: ~50KB (minified)
- **Load Time**: Faster than Bootstrap
- **Tree Shaking**: Only includes used styles
- **Caching**: Optimized for browser caching

## Future Enhancements

1. **Theme Editor**: Visual theme customization
2. **Component Library**: Reusable UI components
3. **Animation Library**: More custom animations
4. **Accessibility**: Enhanced ARIA support
5. **Internationalization**: RTL language support 