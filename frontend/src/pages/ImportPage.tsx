import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, UPLOAD_TIMEOUT_MS } from '@/api/client';
import { 
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import Icon from '@/components/Icon';

interface ImportResult {
  success: boolean;
  message: string;
  imported_count?: number;
  skipped_duplicate?: number;
  skipped_invalid?: number;
  enrichment_pending?: boolean;
  errors?: string[];
}

const ImportPage: React.FC = () => {
  const [importType, setImportType] = useState<'csv' | 'goodreads'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [goodreadsFile, setGoodreadsFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const goodreadsInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleGoodreadsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setGoodreadsFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (importType === 'csv' && !file) {
      setResult({
        success: false,
        message: 'Please select a CSV file to import'
      });
      return;
    }

    if (importType === 'goodreads' && !goodreadsFile) {
      setResult({
        success: false,
        message: 'Please select the CSV file you downloaded from Goodreads'
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
        response = await api.post<ImportResult>(
          '/import/csv',
          formData,
          { timeout: UPLOAD_TIMEOUT_MS }
        );
      } else if (importType === 'goodreads' && goodreadsFile) {
        const formData = new FormData();
        formData.append('file', goodreadsFile);
        response = await api.post<ImportResult>(
          '/import/goodreads',
          formData,
          { timeout: UPLOAD_TIMEOUT_MS }
        );
      }

      if (response?.success) {
        const data = response.data as ImportResult;
        setResult({
          ...data,
          // Enrichment (covers/metadata) runs in the background after the import
          // is saved, so say so instead of letting the counts look incomplete.
          message: data.enrichment_pending
            ? `${data.message} Fetching covers and details in the background.`
            : data.message,
        });
      } else {
        setResult({
          success: false,
          message: response?.error || 'Import failed'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      // A 4xx/5xx rejects the promise, so the server's explanation ("This file
      // does not look like a book CSV", "Please upload a .csv file") lives on the
      // response body. Without reading it, every validation error surfaced as a
      // useless "Please try again".
      const axiosError = error as { response?: { data?: { error?: string } } };
      setResult({
        success: false,
        message:
          axiosError.response?.data?.error ||
          'Import failed. The file could not be uploaded; please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setGoodreadsFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (goodreadsInputRef.current) {
      goodreadsInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-base-content">Import Books</h1>
        <p className="text-base-content/70 mt-1">Import your books from CSV or Goodreads</p>
      </div>

      {/* Import Type Selection */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary mb-6">
            <Icon hero={<ArrowDownTrayIcon className="w-6 h-6" />} emoji="⬇️" />
            Choose Import Method
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setImportType('csv')}
              className={`btn btn-lg flex-col gap-2 ${
                importType === 'csv' ? 'btn-primary' : 'btn-outline'
              }`}
            >
              <Icon hero={<DocumentTextIcon className="w-8 h-8" />} emoji="📄" />
              <span>CSV Import</span>
              <span className="text-xs opacity-70">Upload a CSV file</span>
            </button>
            
            <button
              onClick={() => setImportType('goodreads')}
              className={`btn btn-lg flex-col gap-2 ${
                importType === 'goodreads' ? 'btn-primary' : 'btn-outline'
              }`}
            >
              <Icon hero={<BookOpenIcon className="w-8 h-8" />} emoji="📖" />
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
              <Icon hero={<DocumentTextIcon className="w-6 h-6" />} emoji="📄" />
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
                  <Icon hero={<DocumentTextIcon className="w-5 h-5" />} emoji="📄" />
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
                      <Icon hero={<CloudArrowUpIcon className="w-5 h-5" />} emoji="☁️" />
                      Import CSV
                    </>
                  )}
                </button>
                
                {file && (
                  <button
                    onClick={resetImport}
                    className="btn btn-outline"
                  >
                    <Icon hero={<XMarkIcon className="w-5 h-5" />} emoji="✖️" />
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
              <Icon hero={<BookOpenIcon className="w-6 h-6" />} emoji="📖" />
              Goodreads Import
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-base-content/70 mb-4">
                  Upload the CSV from Goodreads&rsquo; own export. In Goodreads go to
                  <strong> My Books &rarr; Import/Export &rarr; Export Library</strong>, then
                  upload the file it emails you. BookOracle imports titles, authors, ISBNs,
                  shelves and read dates from it.
                </p>

                <div className="alert alert-info mb-4 text-sm">
                  <span>
                    A Goodreads profile URL cannot be imported: Goodreads redirects those pages
                    to its sign-in page, so BookOracle will not ask for your Goodreads password.
                  </span>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Goodreads CSV file</span>
                  </label>
                  <input
                    ref={goodreadsInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleGoodreadsFileChange}
                    className="file-input file-input-bordered w-full"
                  />
                </div>

                {goodreadsFile && (
                  <div className="alert alert-info">
                    <Icon hero={<DocumentTextIcon className="w-5 h-5" />} emoji="📄" />
                    <span>Selected file: {goodreadsFile.name} ({(goodreadsFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={!goodreadsFile || isUploading}
                  className="btn btn-primary"
                >
                  {isUploading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Icon hero={<BookOpenIcon className="w-5 h-5" />} emoji="📖" />
                      Import from Goodreads
                    </>
                  )}
                </button>
                
                {goodreadsFile && (
                  <button
                    onClick={resetImport}
                    className="btn btn-outline"
                  >
                    <Icon hero={<XMarkIcon className="w-5 h-5" />} emoji="✖️" />
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
            <Icon hero={<BookOpenIcon className="w-6 h-6" />} emoji="📖" />
            Import Help
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">CSV Import</h3>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Export your books as CSV from your current system</li>
                <li>• Include columns: title, author, isbn (optional)</li>
                <li>• A Goodreads &ldquo;Export Library&rdquo; file also works here: the format is detected automatically</li>
                <li>• Additional columns: cover_url, description, published_date</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Goodreads Import</h3>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• In Goodreads: <strong>My Books &rarr; Import/Export &rarr; Export Library</strong></li>
                <li>• Goodreads emails you a CSV: upload that file here</li>
                <li>• Imports title, author, ISBN, publisher, page count and read dates</li>
                <li>• &ldquo;to-read&rdquo; shelf books arrive as Want to Read</li>
                <li>• Re-uploading the same file is safe: duplicates are skipped</li>
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
                <Icon hero={<BookOpenIcon className="w-5 h-5 mr-2" />} emoji="📚" />
                View Library
              </Link>
              <Link to="/add-book" className="btn btn-primary">
                <Icon hero={<BookOpenIcon className="w-5 h-5 mr-2" />} emoji="📖" />
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
