export const createButton = (label: string, onClick: () => void, className = 'game-button'): HTMLButtonElement => {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};
