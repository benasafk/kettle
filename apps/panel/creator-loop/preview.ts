import { mountCreatorReview } from './index.ts';
import { fixtureState, scenarioNames, type Scenario } from './fixtures.ts';

const root = document.querySelector<HTMLElement>('#review')!;
const view = mountCreatorReview(root);
const scenario = document.querySelector<HTMLSelectElement>('#scenario')!;
for (const name of scenarioNames) scenario.add(new Option(name, name));
const params = new URLSearchParams(location.search);
if (scenarioNames.includes(params.get('scenario') as Scenario)) scenario.value = params.get('scenario')!;
function render() { view.render(fixtureState(scenario.value as Scenario)); }
scenario.addEventListener('change', render);
const theme = document.querySelector<HTMLSelectElement>('#theme')!;
theme.value = ['light', 'dark'].includes(params.get('theme') ?? '') ? params.get('theme')! : 'light';
function setTheme() { document.documentElement.style.colorScheme = theme.value; }
theme.addEventListener('change', setTheme);
setTheme();
render();
