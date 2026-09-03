// Single source for the copyright line, so the footer, the team entry screen
// and the facilitator leaderboard can never drift apart.
export default function Copyright({ className = '' }) {
  return (
    <span className={`copyright ${className}`.trim()}>
      © {new Date().getFullYear()} Mara Pometti · AI Experience Decision Lab
    </span>
  )
}
