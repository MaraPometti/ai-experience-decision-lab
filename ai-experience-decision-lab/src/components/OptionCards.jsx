import { useState } from 'react'

function splitLabel(label) {
  const dotIdx  = label.indexOf('. ')
  const dashIdx = label.indexOf(' — ')
  if (dotIdx === -1 && dashIdx === -1) return { headline: label, detail: null }
  let headlineEnd, detailStart
  if (dotIdx === -1 || (dashIdx !== -1 && dashIdx < dotIdx)) {
    headlineEnd = dashIdx
    detailStart = dashIdx + 3
  } else {
    headlineEnd = dotIdx
    detailStart = dotIdx + 2
  }
  const headline = label.slice(0, headlineEnd).trim()
  const detail   = label.slice(detailStart).trim()
  return { headline, detail: detail || null }
}

function OptionCard({
  option,
  isSelected,
  isPreviewed,
  isBest,
  isLocked,
  isExpired,
  isConfirming,
  showBest,
  onApply,
  onPreviewOption,
}) {
  const [detailOpen, setDetailOpen] = useState(false)
  const { headline, detail } = splitLabel(option.label)
  const cleanDetail = detail || null

  const statusBadge = (() => {
    if (showBest && isBest) return { emoji: '🔥', text: 'Strong fit' }
    if (isSelected) return { emoji: '✅', text: 'Applied' }
    if (showBest && isLocked) return { emoji: '🤔', text: 'Weaker choice' }
    return null
  })()

  return (
    <div
      className={[
        'option-card',
        isSelected  ? 'option-selected'  : '',
        isPreviewed ? 'option-previewed'  : '',
        isConfirming ? 'option-confirming' : '',
        isLocked && !isSelected ? 'option-locked' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="option-card-body">
        <span className="option-id">{option.id}</span>
        <div className="option-label-wrap">
          <p className="option-label-headline">{headline}</p>
          {cleanDetail && detailOpen && (
            <p className="option-label-detail">{cleanDetail}</p>
          )}
          {cleanDetail && (
            <button className="show-detail-btn" onClick={() => setDetailOpen(v => !v)}>
              <span className="show-detail-arrow">{detailOpen ? '−' : '+'}</span>
              <span>{detailOpen ? 'Hide detail' : 'Show detail'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="option-card-footer">
        {statusBadge && (
          <span className={`badge-status ${isBest ? 'status-good' : isSelected ? 'status-applied' : 'status-weak'}`}>
            {statusBadge.emoji} {statusBadge.text}
          </span>
        )}

        {!isLocked && !isExpired && (
          <button
            className={`btn btn-apply ${isConfirming ? 'btn-apply-confirm' : ''}`}
            onClick={() => onApply(option)}
          >
            {isConfirming ? `Confirm ${option.id} — this is final` : 'Apply'}
          </button>
        )}

        {showBest && isLocked && !isSelected && (
          <button
            className={`btn btn-preview ${isPreviewed ? 'active' : ''}`}
            onClick={() => onPreviewOption(option)}
          >
            {isPreviewed ? 'Hide Explanation' : `Explain Option ${option.id}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function OptionCards({
  options,
  selectedOption,
  previewOption,
  bestOptionId,
  onSelectOption,
  onPreviewOption,
  showBest,
  requireConfirm = false,
  isExpired = false,
}) {
  const isLocked = selectedOption !== null
  const [confirmId, setConfirmId] = useState(null)

  // Decisions are irreversible in team play, so a single stray click must not
  // be able to spend a round. First click arms, second commits.
  function handleApply(option) {
    if (!requireConfirm) {
      onSelectOption(option)
      return
    }
    if (confirmId === option.id) {
      setConfirmId(null)
      onSelectOption(option)
    } else {
      setConfirmId(option.id)
    }
  }

  return (
    <div className="option-cards">
      {options.map(option => (
        <OptionCard
          key={option.id}
          option={option}
          isSelected={selectedOption?.id === option.id}
          isPreviewed={previewOption?.id === option.id}
          isBest={isLocked && option.id === bestOptionId}
          isLocked={isLocked}
          isExpired={isExpired}
          isConfirming={confirmId === option.id}
          showBest={showBest}
          onApply={handleApply}
          onPreviewOption={onPreviewOption}
        />
      ))}
    </div>
  )
}
