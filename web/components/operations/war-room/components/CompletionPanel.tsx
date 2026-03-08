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
    <div className="mt-12 flex justify-center">
      <div className="w-full max-w-md space-y-4">

        {/* Cost + file card */}
        <div
          className="relative rounded-md border text-center overflow-hidden"
          style={{ background: '#111A1D', borderColor: '#5A9E8F30' }}
        >
          <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: '#5A9E8F60' }} />
          <div className="px-6 py-6">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#3A5056', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="mb-2">
              Operation Complete
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '28px', fontWeight: 700, color: '#BF8A52' }}>
              ${totalCost.toFixed(2)}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }} className="mt-0.5">
              Total Cost
            </p>

            {savedFileId && (
              <div className="mt-5 border-t pt-5" style={{ borderColor: '#5A9E8F20' }}>
                <a
                  href={`/dashboard?view=vault&fileId=${savedFileId}`}
                  className="inline-flex items-center gap-2 rounded border px-4 py-2 text-[12px] transition-all"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#5A9E8F22'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Results →
                </a>
                {savedFileName && (
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#2E4248' }} className="mt-2">
                    {savedFileName}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rating card */}
        <div
          className="rounded-md border px-6 py-5"
          style={{ background: '#111A1D', borderColor: '#1E2D30' }}
        >
          {ratingSubmitted ? (
            <div className="text-center py-1">
              <div className="flex justify-center gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map(star => (
                  <svg key={star} className="h-5 w-5" fill={userRating >= star ? '#BF8A52' : '#1E2D30'} viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '13px', color: '#5A9E8F' }} className="mb-1">
                Thanks for your feedback!
              </p>
              {qualityScore !== null && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#3A5056' }}>
                  Quality score updated to {(qualityScore * 100).toFixed(0)}%
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '14px', color: '#EAE6DF' }} className="mb-0.5">
                  Rate this output
                </p>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', color: '#3A5056' }}>
                  Your feedback helps agents improve
                </p>
              </div>

              {/* Stars */}
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
                      className="h-7 w-7 transition-colors"
                      fill={activeRating >= star ? '#BF8A52' : '#1A2A2E'}
                      stroke={activeRating >= star ? '#BF8A52' : '#2A3E44'}
                      strokeWidth={1}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>

              {userRating > 0 && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#BF8A52' }} className="text-center mb-4">
                  {RATING_LABELS[userRating]}
                </p>
              )}

              {userRating > 0 && (
                <div className="mb-4">
                  <textarea
                    value={ratingFeedback}
                    onChange={(e) => onFeedbackChange(e.target.value)}
                    placeholder="What could be improved? (optional)"
                    rows={2}
                    className="w-full rounded-md border bg-[#0B1215] px-3 py-2 text-[12px] text-[#B8B2AA] placeholder-[#2A3E44] outline-none transition-all resize-none"
                    style={{ borderColor: '#1E2D30', fontFamily: "'Syne', sans-serif" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
                  />
                </div>
              )}

              {userRating > 0 && (
                <button
                  onClick={onSubmitRating}
                  disabled={isSubmittingRating}
                  className="flex w-full items-center justify-center gap-2 rounded border py-2 text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#5A9E8F12', borderColor: '#5A9E8F50', color: '#5A9E8F' }}
                  onMouseEnter={(e) => { if (!isSubmittingRating) e.currentTarget.style.background = '#5A9E8F22'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#5A9E8F12'; }}
                >
                  {isSubmittingRating ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting…
                    </>
                  ) : 'Submit Rating →'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
