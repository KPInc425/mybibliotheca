import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { 
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

interface ImportResult {
  success: boolean;
  message: string;
  imported_count?: number;
  errors?: string[];
}

const ImportPage: React.FC = () => {
  const [importType, setImportType] = useState<'csv' | 'goodreads'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [goodreadsUrl, setGoodreadsUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleGoodreadsUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGoodreadsUrl(event.target.value);
    setResult(null);
  };

  const handleImport = async () => {
    if (importType === 'csv' && !file) {
      setResult({
        success: false,
        message: 'Please select a CSV file to import'
      });
      return;
    }

    if (importType === 'goodreads' && !goodreadsUrl.trim()) {
      setResult({
        success: false,
        message: 'Please enter a Goodreads URL'
      });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      let response;

      if (importType === 'csv' && file) {
        const formData = new FormData();
        formData.append('file', file);
        
        response = await api.post<ImportResult>('/import/csv', formData);
      } else if (importType === 'goodreads') {
        response = await api.post<ImportResult>('/import/goodreads', {
          url: goodreadsUrl.trim()
        });
      }

      if (response?.success) {
        setResult(response.data || { success: false, message: 'Import failed' });
      } else {
        setResult({
          success: false,
          message: response?.error || 'Import failed'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        message: 'Import failed. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setGoodreadsUrl('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-base-content">📥 Import Books</h1>
        <p className="text-base-content/70 mt-1">Import your books from CSV or Goodreads</p>
      </div>

      {/* Import Type Selection */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary mb-6">
            <ArrowDownTrayIcon className="w-6 h-6" />
            Choose Import Method
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setImportType('csv')}
              className={`btn btn-lg flex-col gap-2 ${
                importType === 'csv' ? 'btn-primary' : 'btn-outline'
              }`}
            >
              <DocumentTextIcon className="w-8 h-8" />
              <span>CSV Import</span>
              <span className="text-xs opacity-70">Upload a CSV file</span>
            </button>
            
            <button
              onClick={() => setImportType('goodreads')}
              className={`btn btn-lg flex-col gap-2 ${
                importType === 'goodreads' ? 'btn-primary' : 'btn-outline'
              }`}
            >
              <BookOpenIcon className="w-8 h-8" />
              <span>Goodreads Import</span>
              <span className="text-xs opacity-70">Import from Goodreads URL</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSV Import Section */}
      {importType === 'csv' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <DocumentTextIcon className="w-6 h-6" />
              CSV Import
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-base-content/70 mb-4">
                  Upload a CSV file with your books. The file should include columns for:
                  <strong> title, author, isbn, cover_url, description, published_date, page_count, publisher, language, categories</strong>
                </p>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">CSV File</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="file-input file-input-bordered w-full"
                  />
                </div>
              </div>
              
              {file && (
                <div className="alert alert-info">
                  <DocumentTextIcon className="w-5 h-5" />
                  <span>Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={!file || isUploading}
                  className="btn btn-primary"
                >
                  {isUploading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Importing...
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-5 h-5" />
                      Import CSV
                    </>
                  )}
                </button>
                
                {file && (
                  <button
                    onClick={resetImport}
                    className="btn btn-outline"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goodreads Import Section */}
      {importType === 'goodreads' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <BookOpenIcon className="w-6 h-6" />
              Goodreads Import
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-base-content/70 mb-4">
                  Enter your Goodreads profile URL to import your books. 
                  Make sure your Goodreads profile is public.
                </p>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Goodreads Profile URL</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.goodreads.com/user/show/12345678-username"
                    value={goodreadsUrl}
                    onChange={handleGoodreadsUrlChange}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={!goodreadsUrl.trim() || isUploading}
                  className="btn btn-primary"
                >
                  {isUploading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Importing...
                    </>
                  ) : (
                    <>
                      <BookOpenIcon className="w-5 h-5" />
                      Import from Goodreads
                    </>
                  )}
                </button>
                
                {goodreadsUrl && (
                  <button
                    onClick={resetImport}
                    className="btn btn-outline"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Result */}
      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
          {result.success ? (
            <CheckCircleIcon className="w-6 h-6" />
          ) : (
            <ExclamationTriangleIcon className="w-6 h-6" />
          )}
          <div>
            <h3 className="font-bold">
              {result.success ? 'Import Successful!' : 'Import Failed'}
            </h3>
            <div className="text-sm">
              {result.message}
              {result.imported_count && (
                <p className="mt-1">
                  <strong>{result.imported_count}</strong> books imported successfully.
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Errors:</p>
                  <ul className="list-disc list-inside text-xs">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary mb-6">
            <BookOpenIcon className="w-6 h-6" />
            Import Help
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">CSV Import</h3>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Export your books as CSV from your current system</li>
                <li>• Include columns: title, author, isbn (optional)</li>
                <li>• Additional columns: cover_url, description, published_date</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Goodreads Import</h3>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Make sure your Goodreads profile is public</li>
                <li>• Use your profile URL, not individual book URLs</li>
                <li>• Import includes: title, author, isbn, cover</li>
                <li>• Reading status and dates will be preserved</li>
              </ul>
            </div>
          </div>
          
          <div className="divider"></div>
          
          <div className="text-center">
            <p className="text-base-content/70 mb-4">
              Need help with the import process?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/library" className="btn btn-outline">
                <BookOpenIcon className="w-5 h-5 mr-2" />
                View Library
              </Link>
              <Link to="/add-book" className="btn btn-primary">
                <BookOpenIcon className="w-5 h-5 mr-2" />
                Add Book Manually
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
