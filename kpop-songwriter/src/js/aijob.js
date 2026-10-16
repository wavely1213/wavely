// 진행 중인 Claude 작업 하나를 관리 (동시에 하나만, 중지 가능).
import { refresh } from './state.js';
import { errorCopy } from './ai.js';
import { toast } from './dom.js';

export const job = { label: '', progress: '', ctl: null, error: '' };

export function isBusy() { return !!job.ctl; }

export async function runJob(label, fn) {
  if (job.ctl) return;
  job.ctl = new AbortController();
  job.label = label;
  job.progress = '';
  job.error = '';
  refresh();
  try {
    await fn(job.ctl.signal, (p) => { job.progress = p; updateProgress(); });
  } catch (e) {
    job.error = errorCopy(e);
    if (job.error) toast(job.error);
  } finally {
    job.ctl = null;
    job.label = '';
    refresh();
  }
}

export function stopJob() { job.ctl?.abort(); }

function updateProgress() {
  const el = document.getElementById('job-progress');
  if (el) el.textContent = job.progress;
}
