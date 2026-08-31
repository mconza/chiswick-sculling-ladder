// js/ui.js - DOM helpers and date utilities

export function escHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function parseLadderDate(dateStr) {
  var match = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return null;
  var months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  return new Date(parseInt(match[3]), months[match[2]], parseInt(match[1]));
}

export function formatDate(d) {
  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return days[d.getDay()] + ' ' + d.getDate() + '-' + months[d.getMonth()] + '-' + d.getFullYear();
}

export function ladderDateToInput(dateStr) {
  var match = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return '';
  var months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  return match[3] + '-' + months[match[2]] + '-' + ('0' + match[1]).slice(-2);
}

export function inputToLadderDate(dateStr) {
  var parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return days[d.getDay()] + ' ' + d.getDate() + '-' + months[d.getMonth()] + '-' + d.getFullYear();
}

export function getLadderDate(nextLadder) {
  var d = nextLadder.date;
  var m = {'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06',
  'Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'};
  var parts = d.match(/(\d+)-(\w+)-(\d+)/);
  if (!parts) return d;
  return parts[3] + '-' + m[parts[2]] + '-' + ('0' + parts[1]).slice(-2);
}
