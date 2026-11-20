'use strict';
const $ = id => document.getElementById(id);
const example = Array.from({length: 12}, (_, i) => ({
  name: 'Pond notes ' + (i + 1), src: 'assets/pond-' + String(i + 1).padStart(2, '0') + '.png'
}));
let draft = [], sample = true, sheet = 0, back = false, folded = false, busy = true, db;
const pages = () => sample ? example : draft;
const message = text => { $('status').textContent = text; };
function resetView() { sheet = 0; back = false; folded = false; }

function render() {
  const list = pages(), sheets = Math.ceil(list.length / 4);
  sheet = Math.max(0, Math.min(sheet, sheets - 1));
  const pair = sheets ? sheetPair(list.length, sheet, back) : [null, null];
  ['left','right'].forEach((id, i) => {
    const half = $(id), page = list[pair[i] - 1];
    half.replaceChildren();
    if (page) {
      const img = new Image();
      img.src = page.src; img.alt = 'Page ' + pair[i] + ', ' + page.name;
      half.append(img);
    } else half.textContent = sheets ? 'Blank' : '—';
  });
  $('paper').classList.toggle('closed', folded);
  $('paper').style.aspectRatio = paperSizes[$('size').value].join(' / ');
  $('pair').textContent = !sheets ? 'Add pages to begin' : folded ? 'Folded · ' + (pair[1] ? 'page ' + pair[1] : 'blank') :
    (back ? 'Back' : 'Front') + ' · ' + pair.map(n => n ? 'p.' + n : 'blank').join(' | ');
  $('fold').textContent = folded ? 'Unfold ←' : 'Fold sheet →';
  $('count').textContent = sheets ? (sheet + 1) + ' of ' + sheets : '0 of 0';
  $('edition').textContent = sample ? 'POND NOTES / VOL. 01' : 'YOUR BOOKLET';
  $('summary').textContent = sheets + (sheets === 1 ? ' sheet' : ' sheets') + ' · ' + (sheets * 2) + ' print sides' +
    (sheets * 4 > list.length ? ' · ' + (sheets * 4 - list.length) + ' blank' : '');
  $('front').setAttribute('aria-pressed', String(!back)); $('back').setAttribute('aria-pressed', String(back));
  $('fold').setAttribute('aria-pressed', String(folded));
  $('traynote').textContent = sample ? 'Pond notes · 12 illustrated pages in reading order.' :
    'Reading order · JPEG or PNG · Up to 32 pages. Use the arrows to reorder.';
  $('example').textContent = sample && draft.length ? 'Return to my pages ↗' : 'Try an example ↗';
  $('tray').replaceChildren();
  list.forEach((page, i) => {
    const row = document.createElement('li'), img = new Image(), label = document.createElement('span');
    img.src = page.src; img.alt = ''; img.loading = 'lazy';
    label.textContent = String(i + 1).padStart(2,'0') + ' / ' + page.name;
    row.append(img,label);
    if (!sample) {
      const group = document.createElement('div'); group.className = 'editing';
      for (const [symbol, action, disabled] of [['←','Earlier',!i],['→','Later',i === list.length-1],['×','Remove',false]]) {
        const btn = document.createElement('button'); btn.textContent = symbol;
        btn.setAttribute('aria-label', action + ': ' + page.name); btn.disabled = busy || disabled;
        btn.onclick = () => edit(i, action); group.append(btn);
      }
      row.append(group);
    }
    $('tray').append(row);
  });
  for (const id of ['fold','front','back','export']) $(id).disabled = busy || !sheets;
  $('prev').disabled = busy || sheet === 0; $('next').disabled = busy || sheet + 1 >= sheets;
  for (const id of ['upload','example','size']) $(id).disabled = busy;
}
function storeDraft(next) {
  return new Promise((resolve,reject) => {
    const tx = db.transaction('drafts','readwrite');
    tx.objectStore('drafts').put(next,'pages');
    tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
  });
}
async function commit(next) {
  if (!db) throw new Error('Local draft storage is unavailable. Enable site storage and retry.');
  await storeDraft(next);
  draft = next; sample = false; folded = false;
}
async function edit(i, action) {
  if (action === 'Remove' && !confirm('Remove ' + draft[i].name + ' from this booklet?')) return;
  const next = [...draft];
  let target = i;
  if (action === 'Remove') next.splice(i,1);
  else {
    target = action === 'Earlier' ? i-1 : i+1;
    [next[i],next[target]] = [next[target],next[i]];
  }
  busy = true; render();
  try { await commit(next); message('Draft saved on this device.'); }
  catch { message('Could not save the change. Your previous pages are intact.'); }
  finally {
    busy = false; render();
    const row = $('tray').children[Math.min(target,draft.length-1)];
    (row?.querySelector('button:enabled') || $('upload')).focus();
  }
}
async function importPage(file) {
  if (!['image/jpeg','image/png'].includes(file.type) || file.size > 12 * 1024 * 1024)
    throw new Error('Choose PNG or JPEG images under 12 MB each.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const factor = Math.min(1,1800 / Math.max(img.naturalWidth,img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth*factor));
    canvas.height = Math.max(1, Math.round(img.naturalHeight*factor));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return {name:file.name, src:canvas.toDataURL('image/jpeg',0.92),jpeg:true};
  } finally { URL.revokeObjectURL(url); }
}
$('upload').onclick = () => $('files').click();
$('files').onchange = async event => {
  const files = [...event.target.files]; event.target.value = '';
  if (!files.length) return;
  if (draft.length + files.length > 32) { message('A booklet holds up to 32 pages. Remove pages or choose fewer images.'); return; }
  busy = true; render(); message('Preparing page images…');
  try {
    const next = [...draft];
    for (const file of files) next.push(await importPage(file));
    await commit(next); resetView(); message('Pages added to your draft and saved on this device.');
  } catch (error) {
    message('Import cancelled. Existing pages are safe. ' + (error.name === 'Error' ? error.message : 'Check the images and available browser storage.'));
  } finally { busy = false; render(); }
};
$('fold').onclick = () => { folded = !folded; render(); };
$('example').onclick = () => {
  sample = !(sample && draft.length); resetView(); render();
  message(sample ? 'Example ready. Fold the outer sheet, then inspect its back.' : 'Your saved pages are on the table.');
  $('fold').focus();
};
for (const [id,delta] of [['prev',-1],['next',1]]) $(id).onclick = () => { sheet += delta; folded = false; render(); };
for (const id of ['front','back']) $(id).onclick = () => { back = id === 'back'; folded = false; render(); };
$('size').onchange = render;
$('export').onclick = async () => {
  busy = true; render(); message('Building the print file…');
  try {
    const bytes = await makeBooklet(pages(),$('size').value);
    const url = URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    const link = document.createElement('a'); link.href = url;
    link.download = (sample ? 'pond-notes' : 'my-booklet') + '-' + $('size').value + '.pdf';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000); message('PDF ready. Use landscape, actual size and short-edge duplex.');
  } catch { message('Could not create the PDF. Open the app through a local server and retry. Your pages are safe.'); }
  finally { busy = false; render(); }
};
async function restore() {
  try {
    db = await new Promise((resolve,reject) => {
      const open = indexedDB.open('foldline',1);
      open.onupgradeneeded = () => open.result.createObjectStore('drafts');
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    draft = await new Promise((resolve,reject) => {
      const read = db.transaction('drafts').objectStore('drafts').get('pages');
      read.onsuccess = () => resolve(read.result || []); read.onerror = () => reject(read.error);
    });
    sample = !draft.length;
  } catch { db = null; message('Draft storage unavailable. The example and its PDF are available.'); }
  busy = false; render();
}
render(); restore();
