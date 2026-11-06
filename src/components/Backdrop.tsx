/** The full-screen fluted glass background, behind every screen. See .backdrop in theme.css. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-blob" />
      <div className="backdrop-blob backdrop-refract" />
      <div className="backdrop-ribs" />
      <div className="backdrop-vignette" />
    </div>
  )
}
