/**
 * Category Auto-complete functionality
 * Provides suggestions for categories based on existing books and shared data
 */

class CategoryAutoComplete {
    constructor() {
        this.categoriesInput = document.getElementById('categories');
        this.suggestionsList = document.getElementById('category-suggestions');
        this.allCategories = [];
        this.debounceTimer = null;
        this.isDropdownVisible = false;
        
        if (this.categoriesInput) {
            this.init();
        }
    }
    
    init() {
        // Load initial categories
        this.loadCategories();
        
        // Add event listeners
        this.categoriesInput.addEventListener('input', (e) => {
            this.handleInput(e);
        });
        
        this.categoriesInput.addEventListener('focus', () => {
            this.loadCategories();
            this.showDropdown();
        });
        
        this.categoriesInput.addEventListener('blur', () => {
            // Delay hiding to allow for clicks on suggestions
            setTimeout(() => {
                this.hideDropdown();
            }, 200);
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.categoriesInput.contains(e.target) && !this.suggestionsList.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }
    
    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                this.allCategories = await response.json();
                this.updateSuggestions();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    handleInput(event) {
        // Clear previous debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Set new debounce timer
        this.debounceTimer = setTimeout(() => {
            this.filterSuggestions(event.target.value);
        }, 300);
    }
    
    filterSuggestions(query) {
        if (!query) {
            this.updateSuggestions();
            return;
        }
        
        const filtered = this.allCategories.filter(category => 
            category.toLowerCase().includes(query.toLowerCase())
        );
        
        this.updateSuggestions(filtered);
    }
    
    updateSuggestions(categories = this.allCategories) {
        if (!this.suggestionsList) return;
        
        // Clear existing options
        this.suggestionsList.innerHTML = '';
        
        // Add new options
        categories.forEach(category => {
            const option = document.createElement('div');
            option.className = 'px-4 py-2 hover:bg-base-200 cursor-pointer text-sm';
            option.textContent = category;
            option.addEventListener('click', () => {
                this.selectCategory(category);
            });
            this.suggestionsList.appendChild(option);
        });
        
        // Show dropdown if there are suggestions
        if (categories.length > 0) {
            this.showDropdown();
        } else {
            this.hideDropdown();
        }
    }
    
    selectCategory(category) {
        const currentCategories = this.getCurrentCategories();
        if (!currentCategories.includes(category)) {
            currentCategories.push(category);
            this.categoriesInput.value = currentCategories.join(', ');
        }
        this.hideDropdown();
        this.categoriesInput.focus();
    }
    
    showDropdown() {
        if (this.suggestionsList && this.suggestionsList.children.length > 0) {
            this.suggestionsList.classList.remove('hidden');
            this.isDropdownVisible = true;
        }
    }
    
    hideDropdown() {
        if (this.suggestionsList) {
            this.suggestionsList.classList.add('hidden');
            this.isDropdownVisible = false;
        }
    }
    
    // Helper method to get current categories from input
    getCurrentCategories() {
        const value = this.categoriesInput.value;
        return value ? value.split(',').map(cat => cat.trim()).filter(cat => cat) : [];
    }
    
    // Helper method to add a category
    addCategory(category) {
        const current = this.getCurrentCategories();
        if (!current.includes(category)) {
            current.push(category);
            this.categoriesInput.value = current.join(', ');
        }
    }
    
    // Helper method to remove a category
    removeCategory(category) {
        const current = this.getCurrentCategories();
        const filtered = current.filter(cat => cat !== category);
        this.categoriesInput.value = filtered.join(', ');
    }
}

/**
 * Searchable Dropdown functionality for library filters
 */
class SearchableDropdown {
    constructor() {
        this.initDropdowns();
    }
    
    initDropdowns() {
        const dropdowns = ['category', 'publisher', 'language'];
        
        dropdowns.forEach(fieldName => {
            const input = document.getElementById(fieldName);
            if (input) {
                this.setupDropdown(input, fieldName);
            }
        });
    }
    
    setupDropdown(input, fieldName) {
        const optionsContainer = document.getElementById(`${fieldName}-options`);
        
        if (!optionsContainer) return;
        
        // Add event listener for input changes
        input.addEventListener('input', (e) => {
            this.filterOptions(input, fieldName);
        });
        
        // Add event listener for focus to show all options
        input.addEventListener('focus', () => {
            this.showAllOptions(input, fieldName);
        });
        
        // Add event listener for blur to handle selection
        input.addEventListener('blur', (e) => {
            // Small delay to allow click events to fire
            setTimeout(() => {
                this.hideDropdown(fieldName);
            }, 200);
        });
        
        // Add click handlers for options
        const options = optionsContainer.querySelectorAll('[data-value]');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.getAttribute('data-value');
                input.value = value;
                this.hideDropdown(fieldName);
                // Trigger form submission to apply filter
                input.closest('form').submit();
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !optionsContainer.contains(e.target)) {
                this.hideDropdown(fieldName);
            }
        });
    }
    
    filterOptions(input, fieldName) {
        const query = input.value.toLowerCase();
        const optionsContainer = document.getElementById(`${fieldName}-options`);
        
        if (!optionsContainer) return;
        
        const options = optionsContainer.querySelectorAll('[data-value]');
        let hasVisibleOptions = false;
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            if (text.includes(query) || query === '') {
                option.style.display = '';
                hasVisibleOptions = true;
            } else {
                option.style.display = 'none';
            }
        });
        
        // Show/hide dropdown based on visible options
        if (hasVisibleOptions) {
            this.showDropdown(fieldName);
        } else {
            this.hideDropdown(fieldName);
        }
    }
    
    showAllOptions(input, fieldName) {
        const optionsContainer = document.getElementById(`${fieldName}-options`);
        
        if (!optionsContainer) return;
        
        const options = optionsContainer.querySelectorAll('[data-value]');
        options.forEach(option => {
            option.style.display = '';
        });
        
        this.showDropdown(fieldName);
    }
    
    showDropdown(fieldName) {
        const optionsContainer = document.getElementById(`${fieldName}-options`);
        if (optionsContainer) {
            optionsContainer.classList.remove('hidden');
        }
    }
    
    hideDropdown(fieldName) {
        const optionsContainer = document.getElementById(`${fieldName}-options`);
        if (optionsContainer) {
            optionsContainer.classList.add('hidden');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize category auto-complete on add/edit book pages
    new CategoryAutoComplete();
    
    // Initialize searchable dropdowns on library page
    new SearchableDropdown();
});

// Export for potential use in other scripts
window.CategoryAutoComplete = CategoryAutoComplete;
window.SearchableDropdown = SearchableDropdown; 