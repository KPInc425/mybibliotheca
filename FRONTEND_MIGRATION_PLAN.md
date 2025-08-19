# Frontend Migration Plan - Legacy Feature Parity

## 🎯 **Goal**
Modernize the React frontend to match the legacy Flask app's functionality while maintaining React Native compatibility and improving the user experience.

## 📋 **Current State Analysis**

### ✅ **What We Have (React Frontend)**
- Basic authentication (login/register)
- Simple dashboard placeholder
- Basic library view placeholder
- API integration working
- Modern React 18 + TypeScript
- Tailwind CSS v4 + DaisyUI v5
- Zustand state management

### 📚 **What Legacy App Has (Target Features)**
- **Dashboard**: Statistics cards, currently reading, recent activity
- **Library**: Advanced filtering, search, grid/list views, mass edit
- **Book Management**: Add, edit, delete, status changes, reading progress
- **Community**: User profiles, activity sharing, public library
- **Reports**: Month wrap-up, reading statistics
- **Import/Export**: Bulk import, Goodreads import, CSV export
- **Search**: Advanced search with multiple filters
- **Mobile**: Responsive design, PWA features

## 🚀 **Migration Strategy**

### **Phase 1: Core Layout & Navigation (Week 1)**
1. **Layout Component**: Recreate the legacy sidebar/navigation
2. **Dashboard**: Statistics cards, currently reading section
3. **Library**: Basic grid view with books
4. **Navigation**: Sidebar with collapsible sections

### **Phase 2: Book Management (Week 2)**
1. **Add Book**: Form with ISBN lookup, manual entry
2. **Book Details**: View/edit book information
3. **Reading Progress**: Log reading sessions
4. **Status Management**: Currently reading, finished, want to read

### **Phase 3: Advanced Features (Week 3)**
1. **Search & Filtering**: Advanced search with multiple filters
2. **Mass Edit**: Bulk operations on books
3. **Import/Export**: CSV import, Goodreads import
4. **Community**: User profiles, activity sharing

### **Phase 4: Reports & Analytics (Week 4)**
1. **Month Wrap-up**: Reading statistics and reports
2. **Reading Streaks**: Track daily reading habits
3. **Analytics**: Reading trends and insights

## 🎨 **Design System**

### **Theme (Matching Legacy)**
```css
/* Legacy uses "mybibliotheca" theme with: */
- Primary: Brown/copper tones
- Secondary: Complementary colors
- Gradients: from-primary to-secondary
- Cards: Rounded with borders and shadows
- Typography: Clean, readable fonts
```

### **Layout Structure**
```
┌─────────────────────────────────────┐
│ Header (Mobile: Hamburger)         │
├─────────────────┬───────────────────┤
│ Sidebar         │ Main Content      │
│ - Navigation    │ - Page Content    │
│ - User Info     │ - Responsive      │
│ - Quick Actions │ - Mobile First    │
└─────────────────┴───────────────────┘
```

## 📱 **React Native Compatibility**

### **Shared Components**
- **UI Components**: Buttons, cards, inputs, modals
- **Layout**: Flexbox-based responsive layouts
- **State Management**: Zustand stores (can be adapted)
- **API Layer**: Axios client (can be replaced with React Native fetch)

### **Platform-Specific Adaptations**
- **Web**: Full browser features, complex layouts
- **Mobile**: Simplified navigation, touch-friendly interfaces

## 🛠 **Implementation Plan**

### **Week 1: Foundation**
1. **Layout Component**
   - Responsive sidebar (desktop) / drawer (mobile)
   - Navigation with collapsible sections
   - User profile section
   - Theme switching

2. **Dashboard Page**
   - Statistics cards (6 cards like legacy)
   - Currently reading section
   - Quick action buttons
   - Recent activity

3. **Library Page**
   - Grid view of books
   - Basic filtering
   - Search functionality
   - Book cards with covers

### **Week 2: Book Management**
1. **Add Book Form**
   - ISBN lookup integration
   - Manual entry fields
   - Cover image handling
   - Form validation

2. **Book Detail Page**
   - Book information display
   - Reading progress tracking
   - Status management
   - Edit functionality

3. **Reading Progress**
   - Log reading sessions
   - Progress visualization
   - Reading streaks

### **Week 3: Advanced Features**
1. **Search & Filtering**
   - Advanced search form
   - Multiple filter options
   - Category/publisher/language filters
   - Search results display

2. **Mass Edit**
   - Bulk selection
   - Batch operations
   - Status changes
   - Delete operations

3. **Import/Export**
   - CSV import
   - Goodreads import
   - Data export
   - Progress tracking

### **Week 4: Polish & Analytics**
1. **Community Features**
   - User profiles
   - Activity sharing
   - Public library view
   - Privacy settings

2. **Reports & Analytics**
   - Month wrap-up
   - Reading statistics
   - Progress charts
   - Export reports

## 🎯 **Key Features to Implement**

### **Dashboard**
- [ ] Statistics cards (total, finished, reading, want-to-read, library-only, streak)
- [ ] Currently reading section with progress bars
- [ ] Quick action buttons
- [ ] Recent activity feed

### **Library**
- [ ] Grid/list view toggle
- [ ] Advanced filtering (search, category, publisher, language)
- [ ] Sort options (title, author, date added, progress)
- [ ] Book cards with covers and status indicators
- [ ] Mass edit functionality

### **Book Management**
- [ ] Add book with ISBN lookup
- [ ] Book detail page with full information
- [ ] Reading progress logging
- [ ] Status management (reading, finished, want-to-read)
- [ ] Edit book information
- [ ] Delete book with confirmation

### **Search & Filtering**
- [ ] Advanced search form
- [ ] Multiple filter combinations
- [ ] Search results with highlighting
- [ ] Filter persistence

### **Community**
- [ ] User profile pages
- [ ] Activity sharing settings
- [ ] Public library view
- [ ] Community statistics

### **Reports**
- [ ] Month wrap-up page
- [ ] Reading statistics
- [ ] Progress charts
- [ ] Export functionality

## 🔧 **Technical Implementation**

### **State Management (Zustand)**
```typescript
// Stores to create:
- authStore (existing)
- booksStore (existing)
- uiStore (new - for layout, theme, filters)
- searchStore (new - for search state)
- importStore (new - for import/export)
```

### **API Integration**
```typescript
// API endpoints to implement:
- /api/books (existing)
- /api/books/lookup/{isbn} (existing)
- /api/books/{uid} (existing)
- /api/books/{uid}/status (existing)
- /api/books/{uid}/reading-log (existing)
- /api/user/profile (existing)
- /api/user/statistics (existing)
- /api/community/activity (existing)
- /api/system/settings (existing)
```

### **Component Structure**
```
src/
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Navigation.tsx
│   ├── books/
│   │   ├── BookCard.tsx
│   │   ├── BookGrid.tsx
│   │   ├── BookDetail.tsx
│   │   └── AddBookForm.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── CurrentlyReading.tsx
│   │   └── QuickActions.tsx
│   ├── library/
│   │   ├── FilterPanel.tsx
│   │   ├── SearchBar.tsx
│   │   └── MassEditToolbar.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       └── Loading.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── LibraryPage.tsx
│   ├── BookDetailPage.tsx
│   ├── AddBookPage.tsx
│   ├── SearchPage.tsx
│   ├── MassEditPage.tsx
│   ├── ImportPage.tsx
│   ├── ProfilePage.tsx
│   └── ReportsPage.tsx
└── stores/
    ├── auth.ts (existing)
    ├── books.ts (existing)
    ├── ui.ts (new)
    ├── search.ts (new)
    └── import.ts (new)
```

## 🎨 **Styling Approach**

### **Legacy Theme Recreation**
```css
/* Match the legacy "mybibliotheca" theme */
:root {
  --color-primary: 139 69 19; /* Brown */
  --color-secondary: 160 82 45; /* Saddle brown */
  --color-accent: 210 105 30; /* Chocolate */
  --color-neutral: 51 65 85;
  --color-base-100: 255 255 255;
  --color-base-200: 248 250 252;
  --color-base-300: 241 245 249;
  --color-base-content: 15 23 42;
}
```

### **Component Styling**
- Use DaisyUI components as base
- Custom styling to match legacy design
- Responsive design with mobile-first approach
- Consistent spacing and typography

## 📱 **Mobile Considerations**

### **Responsive Design**
- Sidebar becomes drawer on mobile
- Grid adapts to single column on small screens
- Touch-friendly button sizes
- Swipe gestures for navigation

### **React Native Preparation**
- Component structure allows easy adaptation
- State management can be shared
- API layer can be replaced
- Styling can be adapted to React Native

## 🚀 **Next Steps**

1. **Start with Layout**: Recreate the sidebar and navigation
2. **Dashboard**: Implement statistics cards and currently reading
3. **Library**: Basic grid view with book cards
4. **Iterate**: Add features one by one, testing each step

This approach ensures we maintain the rich functionality of the legacy app while modernizing the user experience and preparing for React Native development.
