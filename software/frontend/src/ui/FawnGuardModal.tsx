 *
export default function FawnGuardModal({
  draft,
  markers,
  confidence,
  onConfirm,
  onReject
}: FawnGuardModalProps) {
  const [showDraft, setShowDraft] = useState(false);

  // Calculate confidence percentage
  const confidencePercent = Math.round(confidence * 100);

  // Get marker info
  const markerList = markers.map(m => MARKER_DISPLAY[m]).filter(Boolean);




        {/* Draft preview toggle */}
        <div className="fawn-guard-draft-section">
          <button


        {/* Context hint */}
        <div className="fawn-guard-context">
          <p>
            <strong>Remember:</strong> Your words represent your actual thoughts.
            Are you writing what you truly think, or what you think others want to hear?
          </p>
        </div>

        {/* Actions */}
        <div className="fawn-guard-actions">
          <button
          <button
export function FawnGuardInputWrapper({
  children,
  onSubmit,
  value,
  onChange
}: FawnGuardInputProps) {
  const {
    fawnGuardEnabled,
    pendingDraft,
    fawnMarkers,

  const isPending = useFawnPending();
  const [showModal, setShowModal] = useState(false);



  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();


    // Check for fawn patterns before submit
    if (value.length > 10) {
      checkForFawnMarkers(value);


    onSubmit(value);
  };



  return (
    <div className="fawn-guard-input-wrapper">
      {children}

  const {
    fawnGuardEnabled,
    fawnMarkers,

