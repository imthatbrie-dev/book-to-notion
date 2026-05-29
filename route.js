:root {
  --paper: #f3ede0;
  --paper-2: #e9e0cd;
  --card: #fcf9f1;
  --ink: #241c14;
  --ink-soft: #5d5345;
  --ink-faint: #8a7f6e;
  --oxblood: #7a2b2b;
  --oxblood-deep: #5f1f1f;
  --gold: #a9803f;
  --line: rgba(36, 28, 20, 0.16);
  --line-strong: rgba(36, 28, 20, 0.34);

  --display: "Fraunces", Georgia, serif;
  --body: "Newsreader", Georgia, serif;
  --mono: "Spline Sans Mono", ui-monospace, "SF Mono", monospace;

  --shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 18px 40px -28px rgba(36, 28, 20, 0.55);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--paper);
  background-image: radial-gradient(
      1100px 600px at 75% -8%,
      rgba(169, 128, 63, 0.12),
      transparent 60%
    ),
    radial-gradient(
      900px 500px at 5% 105%,
      rgba(122, 43, 43, 0.08),
      transparent 55%
    ),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  color: var(--ink);
  font-family: var(--body);
  font-size: 17px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

.wrap {
  max-width: 760px;
  margin: 0 auto;
  padding: 56px 24px 96px;
}

/* ---------- Header ---------- */
.masthead {
  text-align: center;
  margin-bottom: 40px;
  animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.eyebrow {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--oxblood);
  margin-bottom: 14px;
}
.wordmark {
  font-family: var(--display);
  font-weight: 600;
  font-size: clamp(44px, 9vw, 76px);
  line-height: 0.92;
  letter-spacing: -0.02em;
  margin: 0;
  font-optical-sizing: auto;
}
.wordmark em {
  font-style: italic;
  color: var(--oxblood);
}
.subhead {
  margin-top: 16px;
  color: var(--ink-soft);
  font-size: 18px;
}
.rule {
  width: 64px;
  height: 1px;
  background: var(--line-strong);
  margin: 22px auto 0;
  position: relative;
}
.rule::before,
.rule::after {
  content: "";
  position: absolute;
  top: -2px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--oxblood);
}
.rule::before {
  left: -10px;
}
.rule::after {
  right: -10px;
}

/* ---------- Cards ---------- */
.panel {
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  padding: 26px;
  box-shadow: var(--shadow);
  animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.panel + .panel {
  margin-top: 22px;
}

.label {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-faint);
  display: block;
  margin-bottom: 8px;
}

/* ---------- Inputs ---------- */
.field {
  width: 100%;
  font-family: var(--body);
  font-size: 18px;
  color: var(--ink);
  background: #fffdf8;
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  padding: 13px 15px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field:focus {
  border-color: var(--oxblood);
  box-shadow: 0 0 0 3px rgba(122, 43, 43, 0.12);
}
select.field {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a2b2b' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 15px center;
  padding-right: 38px;
}

.search-row {
  display: flex;
  gap: 10px;
}
.search-row .field {
  flex: 1;
}

/* ---------- Buttons ---------- */
.btn {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 3px;
  padding: 13px 22px;
  border: 1px solid var(--oxblood-deep);
  background: var(--oxblood);
  color: #fbf3ec;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
.btn:hover:not(:disabled) {
  background: var(--oxblood-deep);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px -10px rgba(95, 31, 31, 0.8);
}
.btn:active:not(:disabled) {
  transform: translateY(0);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.ghost {
  background: transparent;
  color: var(--ink);
  border-color: var(--line-strong);
}
.btn.ghost:hover:not(:disabled) {
  background: rgba(36, 28, 20, 0.05);
  box-shadow: none;
}
.btn.big {
  width: 100%;
  padding: 16px;
  font-size: 14px;
}

.linkbtn {
  background: none;
  border: none;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
  cursor: pointer;
  padding: 0;
}
.linkbtn:hover {
  color: var(--oxblood);
}

/* ---------- Connect screen ---------- */
.connect {
  text-align: center;
}
.connect p {
  color: var(--ink-soft);
  max-width: 46ch;
  margin: 0 auto 22px;
}
.notion-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

/* ---------- Workspace bar ---------- */
.workspace {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
  padding: 10px 16px;
  border: 1px dashed var(--line-strong);
  border-radius: 3px;
  background: rgba(255, 253, 248, 0.5);
  animation: rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.workspace .who {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3f9142;
  box-shadow: 0 0 0 3px rgba(63, 145, 66, 0.18);
}

/* ---------- Results ---------- */
.results {
  margin-top: 18px;
  border-top: 1px solid var(--line);
}
.result {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid var(--line);
  padding: 14px 6px;
  cursor: pointer;
  transition: background 0.14s, padding-left 0.14s;
  font-family: var(--body);
}
.result:hover {
  background: rgba(122, 43, 43, 0.05);
  padding-left: 12px;
}
.result.active {
  background: rgba(122, 43, 43, 0.09);
  padding-left: 12px;
}
.result .thumb,
.preview .thumb {
  background: var(--paper-2);
  border: 1px solid var(--line);
  border-radius: 2px;
  object-fit: cover;
  flex-shrink: 0;
}
.result .thumb {
  width: 40px;
  height: 60px;
}
.result .meta h4 {
  margin: 0;
  font-family: var(--display);
  font-weight: 500;
  font-size: 19px;
  line-height: 1.15;
}
.result .meta .sub {
  color: var(--ink-soft);
  font-size: 15px;
  margin-top: 3px;
}
.result .meta .tiny {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-faint);
  letter-spacing: 0.04em;
  margin-top: 5px;
}

/* ---------- Preview (catalog card) ---------- */
.preview {
  display: grid;
  grid-template-columns: 116px 1fr;
  gap: 22px;
}
.preview .thumb {
  width: 116px;
  height: 174px;
  box-shadow: 0 10px 26px -14px rgba(36, 28, 20, 0.7);
}
.preview .no-cover {
  width: 116px;
  height: 174px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-faint);
  background: var(--paper-2);
  border: 1px solid var(--line);
  border-radius: 2px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.preview h3 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 26px;
  line-height: 1.08;
  margin: 0 0 4px;
}
.preview .byline {
  font-style: italic;
  color: var(--ink-soft);
  margin-bottom: 16px;
}
.cardgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}
.cardgrid .full {
  grid-column: 1 / -1;
}
.cardgrid dt {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 2px;
}
.cardgrid dd {
  margin: 0;
  font-size: 15.5px;
  color: var(--ink);
}
.cardgrid dd.desc {
  font-size: 15px;
  color: var(--ink-soft);
  line-height: 1.55;
  max-height: 7.5em;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, #000 70%, transparent);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.03em;
  background: rgba(169, 128, 63, 0.14);
  border: 1px solid rgba(169, 128, 63, 0.4);
  color: #6b4f24;
  padding: 2px 9px;
  border-radius: 999px;
}
.confirm-row {
  grid-column: 1 / -1;
  margin-top: 8px;
}

/* ---------- Messages ---------- */
.note {
  font-size: 14px;
  padding: 12px 14px;
  border-radius: 3px;
  margin-bottom: 18px;
}
.note.err {
  background: rgba(122, 43, 43, 0.1);
  border: 1px solid rgba(122, 43, 43, 0.4);
  color: var(--oxblood-deep);
}
.note.ok {
  background: rgba(63, 145, 66, 0.12);
  border: 1px solid rgba(63, 145, 66, 0.45);
  color: #2c5e2e;
}

.success {
  text-align: center;
  padding: 10px 0 4px;
}
.stamp {
  display: inline-block;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--oxblood);
  border: 2px solid var(--oxblood);
  border-radius: 4px;
  padding: 8px 16px;
  transform: rotate(-4deg);
  margin-bottom: 18px;
  opacity: 0.92;
}
.success h3 {
  font-family: var(--display);
  font-size: 24px;
  margin: 0 0 6px;
}
.success a {
  color: var(--oxblood);
}

.foot {
  text-align: center;
  margin-top: 34px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
}
.foot a {
  color: var(--ink-soft);
}

.muted {
  color: var(--ink-faint);
  font-size: 14px;
}
.center {
  text-align: center;
}

.spinner {
  display: inline-block;
  width: 15px;
  height: 15px;
  border: 2px solid rgba(251, 243, 236, 0.4);
  border-top-color: #fbf3ec;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: -2px;
  margin-right: 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 560px) {
  .wrap {
    padding: 36px 16px 72px;
  }
  .preview {
    grid-template-columns: 84px 1fr;
    gap: 16px;
  }
  .preview .thumb,
  .preview .no-cover {
    width: 84px;
    height: 126px;
  }
  .cardgrid {
    grid-template-columns: 1fr;
  }
  .search-row {
    flex-direction: column;
  }
}
