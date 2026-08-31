// js/modal.js - Edit ladder modal

import { ladderDateToInput, inputToLadderDate } from './ui.js';
import { postConfig } from './api.js';

export function openModal(nextLadder) {
  document.getElementById('modalDate').value = ladderDateToInput(nextLadder.date);
  document.getElementById('modalTime').value = nextLadder.time;
  document.getElementById('modalStart').value = nextLadder.start;
  document.getElementById('modalFinish').value = nextLadder.finish;
  document.getElementById('ladderModal').style.display = 'flex';
}

export function closeModal() {
  document.getElementById('ladderModal').style.display = 'none';
}

export function saveModal(nextLadder, lastLadder) {
  lastLadder.date = nextLadder.date;
  lastLadder.time = nextLadder.time;
  lastLadder.start = nextLadder.start;
  nextLadder.date = inputToLadderDate(document.getElementById('modalDate').value);
  nextLadder.time = document.getElementById('modalTime').value;
  nextLadder.start = document.getElementById('modalStart').value.trim();
  nextLadder.finish = document.getElementById('modalFinish').value.trim();
  postConfig({ nextLadder: nextLadder, lastLadder: lastLadder });
  closeModal();
}

export function updateLadderInfo(nextLadder) {
  document.getElementById('nextLadderInfo').innerHTML =
    '<strong>' + nextLadder.date + '</strong> at ' + nextLadder.time +
    ' — ' + nextLadder.start + ' to ' + nextLadder.finish;
}
