'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import type { RewardRule } from '@/types/card';

type TabType = 'pdf' | 'url';

interface ExtractionResult {
  cardName?: string;
  issuer?: string;
  rules: Partial<RewardRule>[];
  confidence: Record<string, 'high' | 'medium' | 'low'>;
  error?: string;
  source?: string;
  sourceText?: string;
  sourceUrl?: string;
}

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function UploadExtractor() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExtractionResult | null>(null);

  // Editable extraction results
  const [editedCardName, setEditedCardName] = useState('');
  const [editedIssuer, setEditedIssuer] = useState('');
  const [editedRules, setEditedRules] = useState<Partial<RewardRule>[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('new');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        setError('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size: 10MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        setError('Please drop a PDF file');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const extractFromPdf = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    setError('');
    setResult(null);

    try {
      // Read file as text (simplified - real implementation would use pdf.js)
      // For now, we'll send a request that the server can't handle PDF directly
      // This is a limitation noted in the spec

      // Try to extract text client-side using FileReader
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // This will get raw bytes, not parsed PDF text
          // For proper PDF parsing, we'd need pdf.js library
          const content = reader.result as string;
          // Check if it's readable text (some PDFs have embedded text)
          if (content.includes('%PDF')) {
            reject(new Error('PDF parsing requires pdf.js library. Please use URL extraction or paste text directly.'));
          } else {
            resolve(content);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(selectedFile);
      });

      const response = await fetch('/api/admin/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      handleExtractionResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract from PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  const extractFromUrl = async () => {
    if (!url) return;

    setIsExtracting(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      handleExtractionResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract from URL');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractionResult = (data: ExtractionResult) => {
    setResult(data);
    setEditedCardName(data.cardName || '');
    setEditedIssuer(data.issuer || '');
    setEditedRules(data.rules || []);
  };

  const handleExtract = () => {
    if (activeTab === 'pdf') {
      extractFromPdf();
    } else {
      extractFromUrl();
    }
  };

  const updateRule = (index: number, updates: Partial<RewardRule>) => {
    setEditedRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...updates } : rule))
    );
  };

  const removeRule = (index: number) => {
    setEditedRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveToPending = async () => {
    // For now, navigate to create a new card with extracted data
    // In a full implementation, this would save to a pending queue
    const cardData = {
      name: editedCardName,
      issuer: editedIssuer,
      rewards: editedRules,
      termsUrl: result?.sourceUrl,
      termsContent: result?.sourceText,
      termsExtractedAt: new Date().toISOString(),
    };

    // Store in sessionStorage for the new card form to pick up
    sessionStorage.setItem('extractedCardData', JSON.stringify(cardData));

    if (selectedCardId === 'new') {
      router.push('/admin/cards/new?fromExtraction=true');
    } else {
      router.push(`/admin/cards/${selectedCardId}/rules?fromExtraction=true`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="text-foreground-muted hover:text-foreground"
              >
                ← Back
              </button>
              <Logo size={32} />
              <div>
                <h1 className="text-lg font-bold text-foreground">AI Document Extraction</h1>
                <p className="text-sm text-foreground-muted">Extract reward rules from T&C documents</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Upload Section */}
        {!result && (
          <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
            {/* Tabs */}
            <div className="flex border-b border-border mb-6">
              <button
                onClick={() => setActiveTab('url')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'url'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                Enter URL
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pdf'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                Upload PDF
              </button>
            </div>

            {/* URL Input */}
            {activeTab === 'url' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.bank.com/credit-card-rewards"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground"
                  />
                  <p className="text-xs text-foreground-muted mt-2">
                    Enter the URL of a credit card T&C page or rewards info page
                  </p>
                </div>
              </div>
            )}

            {/* PDF Upload */}
            {activeTab === 'pdf' && (
              <div className="space-y-4">
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div>
                      <p className="text-foreground font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-foreground-muted mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-foreground-muted">
                        Drag & drop a PDF file here, or click to browse
                      </p>
                      <p className="text-xs text-foreground-muted mt-2">
                        Maximum file size: 10MB
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Note: PDF extraction requires the document to contain selectable text.
                  Scanned documents may not work properly.
                </p>
              </div>
            )}

            {/* Extract Button */}
            <div className="mt-6">
              <button
                onClick={handleExtract}
                disabled={isExtracting || (activeTab === 'pdf' ? !selectedFile : !url)}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Analyzing document...
                  </span>
                ) : (
                  'Extract Rewards'
                )}
              </button>
            </div>
          </section>
        )}

        {/* Extraction Results */}
        {result && (
          <>
            {/* Card Info */}
            <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground">Card Information</h2>
                <button
                  onClick={() => {
                    setResult(null);
                    setError('');
                  }}
                  className="text-sm text-foreground-muted hover:text-foreground"
                >
                  ← Extract Another
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Card Name
                    <ConfidenceBadge level={result.confidence?.cardName} />
                  </label>
                  <input
                    type="text"
                    value={editedCardName}
                    onChange={(e) => setEditedCardName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="e.g., HSBC Red Credit Card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Issuer
                    <ConfidenceBadge level={result.confidence?.issuer} />
                  </label>
                  <input
                    type="text"
                    value={editedIssuer}
                    onChange={(e) => setEditedIssuer(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="e.g., HSBC"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Save To
                </label>
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="new">Create New Card</option>
                  {/* In a full implementation, this would list existing cards */}
                </select>
              </div>
            </section>

            {/* Extracted Rules */}
            <section className="bg-background-secondary rounded-xl border border-border p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Extracted Rules ({editedRules.length})
                  <ConfidenceBadge level={result.confidence?.rules} />
                </h2>
              </div>

              <div className="space-y-4">
                {editedRules.map((rule, index) => (
                  <div
                    key={rule.id || index}
                    className="p-4 bg-background rounded-lg border border-border"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={rule.description || ''}
                          onChange={(e) => updateRule(index, { description: e.target.value })}
                          className="w-full px-3 py-1 text-sm rounded border border-border bg-background text-foreground font-medium"
                          placeholder="Rule description"
                        />
                      </div>
                      <button
                        onClick={() => removeRule(index)}
                        className="ml-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <label className="text-xs text-foreground-muted">Rate</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.0001"
                            value={rule.rewardRate || 0}
                            onChange={(e) =>
                              updateRule(index, { rewardRate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-20 px-2 py-1 rounded border border-border bg-background text-foreground"
                          />
                          <span className="text-foreground-muted">
                            ({((rule.rewardRate || 0) * 100).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-foreground-muted">Unit</label>
                        <select
                          value={rule.rewardUnit || 'cash'}
                          onChange={(e) =>
                            updateRule(index, { rewardUnit: e.target.value as RewardRule['rewardUnit'] })
                          }
                          className="w-full px-2 py-1 rounded border border-border bg-background text-foreground"
                        >
                          <option value="cash">Cash</option>
                          <option value="miles">Miles</option>
                          <option value="points">Points</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-foreground-muted">Priority</label>
                        <select
                          value={rule.priority || 'base'}
                          onChange={(e) =>
                            updateRule(index, { priority: e.target.value as RewardRule['priority'] })
                          }
                          className="w-full px-2 py-1 rounded border border-border bg-background text-foreground"
                        >
                          <option value="base">Base</option>
                          <option value="bonus">Bonus</option>
                          <option value="premium">Premium</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-foreground-muted">Categories</label>
                        <input
                          type="text"
                          value={(rule.categories as string[])?.join(', ') || 'all'}
                          onChange={(e) =>
                            updateRule(index, {
                              categories: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
                            })
                          }
                          className="w-full px-2 py-1 rounded border border-border bg-background text-foreground"
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex gap-4">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={rule.isPromotional || false}
                          onChange={(e) => updateRule(index, { isPromotional: e.target.checked })}
                          className="rounded border-border"
                        />
                        <span className="text-foreground-muted">Promotional</span>
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={rule.isCumulative || false}
                          onChange={(e) => updateRule(index, { isCumulative: e.target.checked })}
                          className="rounded border-border"
                        />
                        <span className="text-foreground-muted">Cumulative</span>
                      </label>
                    </div>

                    {/* Source Notes - for verification */}
                    {rule.notes && (
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <label className="text-xs font-medium text-blue-700 dark:text-blue-400 block mb-1">
                          📋 Source Text (for verification)
                        </label>
                        <p className="text-xs text-blue-600 dark:text-blue-300 italic">
                          &quot;{rule.notes}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {editedRules.length === 0 && (
                  <p className="text-center text-foreground-muted py-6">
                    No reward rules were extracted. The document may not contain recognizable reward information.
                  </p>
                )}
              </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setResult(null);
                  setError('');
                }}
                className="px-4 py-2 text-sm text-foreground-muted border border-border rounded-lg hover:bg-background-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToPending}
                disabled={editedRules.length === 0}
                className="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Save & Continue
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ConfidenceBadge({ level }: { level?: 'high' | 'medium' | 'low' }) {
  if (!level) return null;

  return (
    <span className={`ml-2 px-2 py-0.5 text-xs rounded ${CONFIDENCE_COLORS[level]}`}>
      {level}
    </span>
  );
}
