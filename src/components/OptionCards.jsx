export default function OptionCards({ options, selectedOption, previewOption, onSelectOption, onPreviewOption }) {
  const isLocked = selectedOption !== null

  return (
    <div className="option-cards">
      {options.map(option => {
        const isSelected  = selectedOption?.id === option.id
        const isPreviewed = previewOption?.id  === option.id

        return (
          <div
            key={option.id}
            className={[
              'option-card',
              isSelected  ? 'option-selected'  : '',
              isPreviewed ? 'option-previewed'  : '',
              isLocked && !isSelected ? 'option-locked' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="option-card-body">
              <span className="option-id">{option.id}</span>
              <p className="option-label">{option.label}</p>
            </div>

            <div className="option-card-footer">
              {/* Before any selection: show Apply on all cards */}
              {!isLocked && (
                <button
                  className="btn btn-apply"
                  onClick={() => onSelectOption(option)}
                >
                  Apply
                </button>
              )}

              {/* Selected card: show chosen badge */}
              {isSelected && (
                <span className="badge-applied">Chosen ✓</span>
              )}

              {/* Non-selected cards after locking: show Explain toggle */}
              {isLocked && !isSelected && (
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
      })}
    </div>
  )
}
