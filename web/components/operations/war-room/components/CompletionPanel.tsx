'use client';

const RATING_LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];

interface CompletionPanelProps {
  totalCost: number;
  savedFileId: number | null;
  savedFileName: string | null;
  userRating: number;
  hoveredStar: number;
  ratingFeedback: string;
  isSubmittingRating: boolean;
  ratingSubmitted: boolean;
  qualityScore: number | null;
  onRatingChange: (star: number) => void;
  onHoverChange: (star: number) => void;
  onFeedbackChange: (text: string) => void;
  onSubmitRating: () => void;
}

export function CompletionPanel({
  totalCost, savedFileId, savedFileName,
  userRating, hoveredStar, ratingFeedback, isSubmittingRating, ratingSubmitted, qualityScore,
  onRatingChange, onHoverChange, onFeedbackChange, onSubmitRating,
}: CompletionPanelProps) {
  const activeRating = hoveredStar || userRating;

  return (
    <div className="flex justify-center mt-12">
      <div className="w-full max-w-md">
        <div className="px-6 py-5 bg-green-900/20 border border-green-500/30 rounded-xl text-center">
          <div className="text-sm text-green-400 mb-1">Operation Complete</div>
          <div className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-1">Total Cost</div>
          {savedFileId && (
            <div className="mt-4 pt-4 border-t border-green-500/20">
              <a
                href={`/dashboard?view=vault&fileId=${savedFileId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Results
              </a>
              {savedFileName && <div className="text-xs text-slate-500 mt-2">{savedFileName}</div>}
            </div>
          )}
        </div>

        <div className="mt-4 px-6 py-5 bg-[#0A0A0F] border border-slate-800 rounded-xl">
          {ratingSubmitted ? (
            <div className="text-center py-2">
              <div className="flex justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(star => (
                  <svg key={star} className="w-6 h-6" fill={userRating >= star ? '#FDE047' : '#334155'} viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <div className="text-sm text-green-400 font-medium mb-1">Thanks for your feedback!</div>
              {qualityScore !== null && (
                <div className="text-xs text-slate-500">Quality score updated to {(qualityScore * 100).toFixed(0)}%</div>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="text-sm font-medium text-white mb-1">Rate this output</div>
                <div className="text-xs text-slate-500">Your feedback helps agents improve</div>
              </div>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onMouseEnter={() => onHoverChange(star)}
                    onMouseLeave={() => onHoverChange(0)}
                    onClick={() => onRatingChange(star)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <svg
                      className="w-8 h-8 transition-colors"
                      fill={activeRating >= star ? '#FDE047' : '#334155'}
                      stroke={activeRating >= star ? '#FDE047' : '#475569'}
                      strokeWidth={1}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
              {userRating > 0 && (
                <div className="text-center text-xs text-slate-400 mb-4">{RATING_LABELS[userRating]}</div>
              )}
              {userRating > 0 && (
                <div className="mb-4">
                  <textarea
                    value={ratingFeedback}
                    onChange={(e) => onFeedbackChange(e.target.value)}
                    placeholder="What could be improved? (optional)"
                    rows={2}
                    className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#6366F1] resize-none"
                  />
                </div>
              )}
              {userRating > 0 && (
                <button
                  onClick={onSubmitRating}
                  disabled={isSubmittingRating}
                  className="w-full py-2 bg-[#6366F1] hover:bg-[#5558E3] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmittingRating ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
                  ) : 'Submit Rating'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
