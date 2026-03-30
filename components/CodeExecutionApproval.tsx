import React, { useState } from 'react';

interface CodeExecutionApprovalProps {
  code: string;
  detectedOperations: string[];
  onApprove: () => void;
  onReject: () => void;
}

export const CodeExecutionApproval: React.FC<CodeExecutionApprovalProps> = ({
  code,
  detectedOperations,
  onApprove,
  onReject,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-red-500/50">
        {/* Header */}
        <div className="p-6 border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-500">⚠️ Code Requires Approval</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This code needs full system access
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Detected Operations */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Detected Operations:
            </h4>
            <div className="flex flex-wrap gap-2">
              {detectedOperations.map((op, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-red-500/10 text-red-500 text-xs font-mono rounded-full border border-red-500/30"
                >
                  {op}
                </span>
              ))}
            </div>
          </div>

          {/* Code Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Code to Execute:
              </h4>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-cyan-600 hover:text-cyan-500"
              >
                {showDetails ? 'Hide' : 'Show'} Full Code
              </button>
            </div>
            {showDetails && (
              <pre className="bg-black/90 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono max-h-64 overflow-y-auto">
                {code}
              </pre>
            )}
            {!showDetails && (
              <pre className="bg-black/50 text-gray-400 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                {code.substring(0, 200)}{code.length > 200 ? '...' : ''}
              </pre>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-xs text-yellow-600 dark:text-yellow-500">
              <strong>⚠️ Security Notice:</strong> This code will run with full access to your system. 
              Only approve if you trust the source and understand what it does.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-4 justify-end">
          <button
            onClick={onReject}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-lg shadow-red-500/30"
          >
            ✓ Run with Full Access
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeExecutionApproval;
