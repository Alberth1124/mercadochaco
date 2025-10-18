import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

export default function StarRating({
  value = 0,            // promedio (ej. 4.3)
  count = 0,            // cuántas calificaciones
  onRate = null,        // (n) => void  si quieres permitir votar
  size = 18,
  readOnly = false,
  showCount = true,
}) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = value - i;
    let Icon = FaRegStar;
    if (diff >= 0) Icon = FaStar;
    else if (diff > -1 && diff < 0) Icon = FaStarHalfAlt;

    const handle = () => !readOnly && onRate && onRate(i);
    stars.push(
      <span
        key={i}
        onClick={handle}
        style={{
          cursor: readOnly ? "default" : "pointer",
          marginRight: 2,
          color: "var(--mc-green-600, #198754)"
        }}
        aria-label={readOnly ? undefined : `Calificar ${i} estrellas`}
        title={readOnly ? undefined : `Calificar ${i} estrellas`}
      >
        <Icon size={size} />
      </span>
    );
  }

  return (
    <div className="d-inline-flex align-items-center gap-2">
      <span>{stars}</span>
      {showCount && <small className="text-muted">({count})</small>}
    </div>
  );
}
