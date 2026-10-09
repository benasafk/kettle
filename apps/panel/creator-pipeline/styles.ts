/** Extends the existing card tokens without changing the DNA card. */
export const creatorPipelineStyles = `
.kettle-pipeline .kc-claim > summary { padding-top: 0; }
.kettle-pipeline .kc-claim > summary:only-child { padding-bottom: 0; }
.kettle-pipeline h2:focus { outline: 2px solid var(--kc-accent); outline-offset: 4px; }
.kettle-pipeline .kc-text { white-space: pre-wrap; }
`;
