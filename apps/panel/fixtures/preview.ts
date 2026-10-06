import { mountProjectReview, type ProjectReviewState } from '../project-review.ts';
import { project, emptyProject, longProject, hostileProject } from './projects.ts';
const root = document.querySelector<HTMLElement>('#preview')!;
const scenario = document.querySelector<HTMLSelectElement>('#scenario')!;
const theme = document.querySelector<HTMLSelectElement>('#theme')!;
const width = document.querySelector<HTMLSelectElement>('#width')!;
let timer: ReturnType<typeof setTimeout> | undefined;
let refreshCount = 0;
const component = mountProjectReview(root, { onRefresh() {
  refreshCount++;
  document.querySelector('#count')!.textContent = String(refreshCount);
  const value = selectedProject();
  component.render({kind:'ready', project:value, refreshing:true});
  timer = setTimeout(() => component.render({kind:'ready', project:value, refreshing:false}), 800);
} });
function selectedProject() {
  return scenario.value === 'long' ? longProject : scenario.value === 'empty' ? emptyProject : scenario.value === 'hostile' ? hostileProject : project;
}
function update() {
  clearTimeout(timer);
  document.documentElement.style.colorScheme = theme.value;
  root.style.width = `${width.value}px`;
  let state: ProjectReviewState = {kind:'ready', project:selectedProject(), refreshing:scenario.value === 'refreshing'};
  if (scenario.value === 'loading') state = {kind:'loading'};
  if (scenario.value === 'warning') state = {kind:'ready', project, refreshing:false, warning:'Could not refresh the brief. Try again.'};
  if (scenario.value === 'error') state = {kind:'error', message:'This project is unavailable', recovery:'reopen'};
  if (scenario.value === 'auth') state = {kind:'error', message:'Your connection needs attention.', recovery:'reauthorize'};
  component.render(state);
}
scenario.addEventListener('change', update);
theme.addEventListener('change', update);
width.addEventListener('change', update);
document.querySelector('#dispose')!.addEventListener('click', () => { clearTimeout(timer); component.dispose(); });
update();
