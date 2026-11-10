export default function DateInput({ id, value, onChange, required = false }) {
  const hintId = `${id}-format-hint`;
  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
        title="Enter a valid date as DD/MM/YYYY"
        aria-describedby={hintId}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <small id={hintId}>Use DD/MM/YYYY</small>
    </>
  );
}
