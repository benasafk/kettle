export const creatorReviewStyles = `
.kettle-creator {
  --kc-ink: light-dark(#17191e, #f2f3f7);
  --kc-muted: light-dark(#535b69, #b8c0ce);
  --kc-line: light-dark(#dce1e9, #444d60);
  --kc-soft: light-dark(#eef2f8, #242e40);
  --kc-accent: light-dark(#294f94, #b6ceff);
  font: 16px/1.5 system-ui, sans-serif; color: var(--kc-ink);
  container-type: inline-size; overflow-wrap: anywhere;
}
.kettle-creator * { box-sizing: border-box; }
.kettle-creator .kc-card {
  padding: 24px; border-radius: 24px;
  background: light-dark(#fafafd, #191e29);
  background-image: linear-gradient(145deg, light-dark(#ffffff, #191e29), light-dark(#f0f1f8, #202636));
  border: 1px solid var(--kc-line);
}
.kettle-creator :is(h2,h3,h4,p,dl,dd) { margin: 0; }
.kettle-creator h2 { font-size: 24px; line-height: 30px; letter-spacing: -.025em; }
.kettle-creator h3 { font-size: 20px; line-height: 28px; }
.kettle-creator h4 { font-size: 16px; line-height: 24px; }
.kettle-creator .kc-stack > * + * { margin-top: 16px; }
.kettle-creator .kc-section { border-top: 1px solid var(--kc-line); padding-top: 24px; margin-top: 24px; }
.kettle-creator .kc-meta { color: var(--kc-muted); font-size: 14px; line-height: 22px; }
.kettle-creator .kc-notice { padding: 12px 16px; border-radius: 12px; background: var(--kc-soft); }
.kettle-creator .kc-row { display: grid; grid-template-columns: 140px minmax(0,1fr); gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--kc-line); }
.kettle-creator dt { color: var(--kc-muted); font-size: 14px; }
.kettle-creator dd { white-space: pre-wrap; min-width: 0; }
.kettle-creator .kc-text { white-space: pre-wrap; }
.kettle-creator ul { padding-left: 22px; margin: 8px 0 0; }
.kettle-creator li + li { margin-top: 8px; }
.kettle-creator a { color: var(--kc-accent); text-decoration-thickness: 1px; text-underline-offset: 3px; }
.kettle-creator a.kc-source { display: inline-flex; align-items: center; min-height: 44px; }
.kettle-creator summary { cursor: pointer; padding: 12px 0; min-height: 48px; color: var(--kc-accent); font-weight: 600; }
.kettle-creator :is(a,summary):focus-visible { outline: 3px solid var(--kc-accent); outline-offset: 3px; border-radius: 4px; }
.kettle-creator details { border-top: 1px solid var(--kc-line); }
.kettle-creator .kc-observation { padding: 16px 0; }
.kettle-creator .kc-observation + .kc-observation { border-top: 1px solid var(--kc-line); }
.kettle-creator .kc-claim { margin-top: 16px; padding: 16px; border-radius: 16px; background: light-dark(#ffffff, #171c26); border: 1px solid var(--kc-line); }
.kettle-creator .kc-basis { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 14px; background: var(--kc-soft); }
.kettle-creator .kc-claim > * + * { margin-top: 12px; }
.kettle-creator .kc-status { margin-top: 16px; }
@container (max-width: 420px) {
  .kettle-creator .kc-card { padding: 16px; border-radius: 20px; }
  .kettle-creator .kc-row { grid-template-columns: minmax(0,1fr); gap: 4px; }
  .kettle-creator .kc-claim { padding: 12px; }
}
@media (forced-colors: active) {
  .kettle-creator .kc-basis, .kettle-creator .kc-notice { border: 1px solid CanvasText; }
}
`;
