/** Paper 1.5B values, scoped to the mounted component. Inherits host color-scheme. */
export const projectReviewStyles = `
.kettle-review { container-type: inline-size; width:100%; max-width:640px; font-family:system-ui,sans-serif; color:light-dark(#111111,#f2f2f5); }
.kettle-review, .kettle-review * { box-sizing:border-box; }
.kettle-review .kr-card { padding:24px; border-radius:24px; background:light-dark(#fafafd,#202126); background-image:linear-gradient(145deg,light-dark(#ffffff,#24252b),light-dark(#f8f9fc,#202126) 48%,light-dark(#eeeef6,#1c1d23)); box-shadow:0 1px 0 light-dark(#fff,#35363d) inset,0 2px 4px #4a4b6810,0 18px 42px #57516f1c; overflow-wrap:anywhere; }
.kettle-review h2,.kettle-review h3,.kettle-review p,.kettle-review dl,.kettle-review dd { margin:0; }
.kettle-review h2 { font-size:24px; font-weight:650; line-height:30px; letter-spacing:-.025em; margin-bottom:20px; }
.kettle-review .kr-product { display:flex; align-items:flex-start; gap:16px; padding:16px; border-radius:16px; background:light-dark(#eff4f2,#293630); }
.kettle-review .kr-mark { display:grid; place-items:center; flex-shrink:0; width:48px; height:48px; border-radius:14px; background:light-dark(#dce8e2,#3b4c43); color:light-dark(#284537,#dbebe2); font-size:24px; line-height:1; }
.kettle-review .kr-product-copy { min-width:0; display:grid; gap:5px; }
.kettle-review h3 { font-size:22px; font-weight:700; line-height:28px; }
.kettle-review .kr-version,.kettle-review .kr-meta { color:light-dark(#596273,#bcc4ce); font-size:13px; line-height:18px; }
.kettle-review .kr-summary { font-size:15px; line-height:22px; white-space:pre-wrap; }
.kettle-review .kr-row { display:grid; grid-template-columns:106px minmax(0,1fr); gap:16px; padding-block:16px; border-bottom:1px solid light-dark(#e8e8e8,#414249); }
.kettle-review dt { font-size:14px; line-height:20px; color:light-dark(#666666,#bcc0c9); }
.kettle-review dd { min-width:0; font-size:16px; line-height:24px; white-space:pre-wrap; }
.kettle-review ul { padding-left:20px; margin:0; }
.kettle-review li + li { margin-top:8px; }
.kettle-review .kr-facts { padding-top:20px; }
.kettle-review summary { cursor:pointer; font-size:16px; font-weight:600; line-height:24px; padding-block:10px; border-radius:4px; }
.kettle-review .kr-facts ul { padding-top:12px; }
.kettle-review .kr-fact { white-space:pre-wrap; font-size:15px; line-height:22px; }
.kettle-review .kr-meta { display:block; margin-top:6px; }
.kettle-review a { color:light-dark(#3c6397,#adcdf8); text-underline-offset:3px; }
.kettle-review .kr-footer { padding-top:20px; display:grid; gap:12px; justify-items:start; }
.kettle-review .kr-help { color:light-dark(#666666,#bcc0c9); font-size:13px; line-height:20px; }
.kettle-review button { appearance:none; font:600 14px/20px system-ui,sans-serif; padding:11px 18px; min-height:44px; border:1px solid light-dark(#d0d4dc,#555862); border-radius:999px; background:light-dark(#fff,#30323a); color:inherit; cursor:pointer; }
.kettle-review button[aria-disabled=true] { cursor:wait; color:light-dark(#666,#b7bac3); }
.kettle-review :is(button,a,summary):focus-visible { outline:3px solid light-dark(#4373b3,#adcdf8); outline-offset:4px; }
.kettle-review .kr-message { font-size:15px; line-height:24px; white-space:pre-wrap; }
.kettle-review .kr-notice { margin-top:16px; padding:12px 16px; border-radius:12px; background:light-dark(#fff4d4,#423923); color:light-dark(#795917,#ffe2a0); font-size:14px; line-height:22px; white-space:pre-wrap; }
.kettle-review .kr-status:not(:empty) { margin-top:12px; font-size:13px; line-height:20px; color:light-dark(#666,#bcc0c9); }
@container (max-width:420px) { .kettle-review .kr-card { padding:20px; } .kettle-review .kr-row { grid-template-columns:minmax(0,1fr); gap:6px; } .kettle-review .kr-product { gap:12px; } .kettle-review .kr-mark { width:36px; height:36px; border-radius:10px; } }
@media (forced-colors:active) { .kettle-review .kr-card { border:1px solid CanvasText; } }
`;
