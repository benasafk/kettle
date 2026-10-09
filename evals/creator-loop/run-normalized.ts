/** Offline evaluation only. Does not read secrets or invoke provider/model clients. */
import { normalizedAnalysisFixture } from './normalized-fixture.ts';
if (process.argv.length > 2) throw new Error('This fixture evaluation accepts no arguments or live mode.');
console.log(JSON.stringify(normalizedAnalysisFixture(), null, 2));
