import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

// Wykres kolumnowy (jedna seria). Dotknięcie/najechanie na kolumnę pokazuje jej wartość;
// największa wartość jest podpisana na stałe. Pod wykresem tabela z danymi.
export function ColumnChart({ data, format, caption }) {
  const { t } = useI18n();
  const [active, setActive] = useState(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const maxIndex = data.findIndex((d) => d.value === max && max > 0);
  const shown = active !== null ? data[active] : null;

  return (
    <figure className="chart">
      <div className="chart-readout" aria-live="polite">
        {shown ? (
          <>
            <span className="chart-readout-label">{shown.fullLabel || shown.label}</span>
            <strong>{format(shown.value)}</strong>
          </>
        ) : (
          <span className="chart-readout-hint">{max > 0 ? t('chartHint') : t('noData')}</span>
        )}
      </div>
      <div className="column-chart" onMouseLeave={() => setActive(null)}>
        {data.map((d, i) => (
          <button
            key={d.key}
            type="button"
            className={`column-slot ${active === i ? 'active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${d.fullLabel || d.label}: ${format(d.value)}`}
          >
            <span className="column-plot">
              {i === maxIndex && <span className="column-cap">{d.value}</span>}
              {d.value > 0 && <span className="column-bar" style={{ height: `${(d.value / max) * 100}%` }} />}
            </span>
            <span className="column-label">{d.label}</span>
          </button>
        ))}
      </div>
      <details className="chart-table">
        <summary>{t('showTable')}</summary>
        <table>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.fullLabel || d.label}</th>
                <td>{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

// Wykres słupkowy poziomy z wartością na końcu słupka (np. gatunki, autorzy).
export function BarList({ data }) {
  const { t } = useI18n();
  if (!data.length) return <p className="chart-readout-hint">{t('noData')}</p>;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="bar-list">
      {data.map((d) => (
        <li key={d.label}>
          <span className="bar-label" title={d.label}>{d.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
            <span className="bar-value">{d.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
