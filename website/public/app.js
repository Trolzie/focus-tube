const screenshots = {
  landing: { src: 'assets/landing.png', alt: "Focus Tube's landing page with a pixel wordmark and a single search field", description: 'One search field. Search for a video or paste a YouTube link.', width: 1280, height: 633 },
  results: { src: 'assets/results.png', alt: 'An earlier Focus Tube search grid showing three Omarchy videos with thumbnails and metadata', description: 'Scan thumbnails, titles, channels, dates, and views together.', width: 1100, height: 400 }
};
document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => {
  const selected = screenshots[button.dataset.preview];
  const image = document.querySelector('#app-screenshot');
  image.src = selected.src; image.alt = selected.alt; image.width = selected.width; image.height = selected.height;
  document.querySelector('#preview-description').textContent = selected.description;
  document.querySelectorAll('[data-preview]').forEach(tab => {
    const active = tab === button;
    tab.classList.toggle('active', active); tab.setAttribute('aria-pressed', String(active));
  });
}));
const methods = {
  local: { commands: 'git clone https://github.com/Trolzie/focus-tube.git\ncd focus-tube\n./install.sh', launch: 'Then launch Focus Tube from your app menu, or run ~/.local/bin/youtube-focus.' },
  package: { commands: 'omarchy pkg add base-devel git\ngit clone https://github.com/Trolzie/focus-tube.git\ncd focus-tube/packaging/aur\nmakepkg -si', launch: 'Then launch Focus Tube from your app menu, or run focus-tube.' }
};
document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => {
  const selected = methods[button.dataset.method];
  document.querySelector('#install-command').textContent = selected.commands;
  document.querySelector('#launch-instruction').textContent = selected.launch;
  document.querySelectorAll('[data-method]').forEach(tab => {
    const active = tab === button;
    tab.classList.toggle('active', active); tab.setAttribute('aria-pressed', String(active));
  });
}));
document.querySelector('.copy-button').addEventListener('click', async () => {
  const button = document.querySelector('.copy-button');
  const commands = document.querySelector('#install-command');
  try {
    await navigator.clipboard.writeText(commands.textContent);
    button.textContent = 'Copied ✓';
    document.querySelector('#copy-status').textContent = 'Installation commands copied.';
    setTimeout(() => { button.textContent = 'Copy ▣'; }, 2200);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange(); range.selectNodeContents(commands);
    selection.removeAllRanges(); selection.addRange(range);
    document.querySelector('#copy-status').textContent = 'Commands selected. Press Control+C to copy.';
    button.textContent = 'Ctrl+C';
  }
});
