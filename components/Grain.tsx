/**
 * Film grain over the whole site. The noise is one feTurbulence tile rasterised
 * once as a background image; a stepped CSS animation shifts it ~10 times a
 * second, so it costs a compositor transform rather than a filter per frame.
 */
export default function Grain() {
  return <div className="grain" aria-hidden="true" />;
}
