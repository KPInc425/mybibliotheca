import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Icon from './Icon';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  multiple?: boolean;
  selectedValues?: string[];
  onMultipleChange?: (values: string[]) => void;
  className?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Search...",
  label,
  multiple = false,
  selectedValues = [],
  onMultipleChange,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    if (multiple && onMultipleChange) {
      const newValues = selectedValues.includes(option)
        ? selectedValues.filter(v => v !== option)
        : [...selectedValues, option];
      onMultipleChange(newValues);
    } else {
      onChange(option);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleRemove = (optionToRemove: string) => {
    if (onMultipleChange) {
      onMultipleChange(selectedValues.filter(v => v !== optionToRemove));
    }
  };

  const displayValue = multiple 
    ? selectedValues.length > 0 
      ? `${selectedValues.length} selected`
      : placeholder
    : value || placeholder;

  return (
    <div className={`${className}`} ref={dropdownRef}>
      {label && (
        <label className="label">
          <span className="label-text font-semibold">{label}</span>
        </label>
      )}
      
      <div className="relative">
        <div
          className="input input-bordered w-full cursor-pointer flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {multiple && selectedValues.length > 0 ? (
              selectedValues.map((selected, index) => (
                <span
                  key={index}
                  className="badge badge-primary badge-sm flex items-center gap-1"
                >
                  {selected}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(selected);
                    }}
                    className="btn btn-ghost btn-xs p-0 h-4 w-4"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="truncate">{displayValue}</span>
            )}
          </div>
          <Icon 
            hero={<ChevronDownIcon className="w-4 h-4" />} 
            emoji="🔽" 
          />
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-base-300">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input input-sm input-bordered w-full pl-8"
                  onClick={(e) => e.stopPropagation()}
                />
                <Icon 
                  hero={<MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-base-content/50" />} 
                  emoji="🔍" 
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 cursor-pointer hover:bg-base-200 flex items-center justify-between ${
                      multiple && selectedValues.includes(option) ? 'bg-primary text-primary-content' : ''
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    <span>{option}</span>
                    {multiple && selectedValues.includes(option) && (
                      <span className="text-xs">✓</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-base-content/50 text-sm">
                  No options found
                </div>
              )}
            </div>

            {/* Add New Option */}
            {searchTerm && !options.includes(searchTerm) && (
              <div className="p-2 border-t border-base-300">
                <button
                  className="btn btn-sm btn-outline w-full"
                  onClick={() => handleSelect(searchTerm)}
                >
                  Add "{searchTerm}"
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableDropdown;
