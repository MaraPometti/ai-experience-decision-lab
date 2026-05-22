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
  showBest,
  onSelectOption,
  onPreviewOption,
}) {
  const [detailOpen, setDetailOpen] = useState(false)
  const { headline, detail } = splitLabel(option.label)
  const cleanDetail = detail || null

  return (
    <div
      className={[
        'option-card',
        isSelected  ? 'option-selected'  : '',
        isPreviewed ? 'option-previewed'  : '',
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
              {detailOpen ? 'Hide detail ↑' : 'Show detail ↓'}
            </button>
          )}
        </div>
      </div>

      <div className="option-card-footer">
        {showBest && isBest && (
          <span className="badge-best">Best choice for this stage</span>
        )}

        {!isLocked && (
          <button
            className="btn btn-apply"
            onClick={() => onSelectOption(option)}
          >
            Apply
          </button>
        )}

        {isSelected && (
          <span className="badge-applied">Applied ✓</span>
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
}) {
  const isLocked = selectedOption !== null

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
          showBest={showBest}
          onSelectOption={onSelectOption}
          onPreviewOption={onPreviewOption}
        />
      ))}
    </div>
  )
}
